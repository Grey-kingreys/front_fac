import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { StorageService } from './storage';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: CurrentUser;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company?: {
    id: number;
    name: string;
  };
  depot?: {
    id: number;
    name: string;
  };
  is_active: boolean;
  is_superadmin: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  private readonly API_URL = '/api/auth';
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly CURRENT_USER_KEY = 'current_user';
  private readonly TOKEN_EXPIRY_BUFFER = 60000; // 1 minute avant expiration

  private currentUserSignal = signal<CurrentUser | null>(this.loadUserFromStorage());
  public currentUser = this.currentUserSignal.asReadonly();

  private isLoggedInSignal = signal<boolean>(this.hasValidToken());
  public isLoggedIn = this.isLoggedInSignal.asReadonly();

  private refreshTokenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (this.hasValidToken()) {
      this.scheduleTokenRefresh();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login/`, credentials).pipe(
      tap(response => {
        this.setTokens(response.access_token, response.refresh_token);
        this.setCurrentUser(response.user);
        this.isLoggedInSignal.set(true);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    this.clearAuth();
    this.clearTokenRefreshTimer();

    if (refreshToken) {
      return this.http.post(`${this.API_URL}/logout/`, { refresh_token: refreshToken }).pipe(
        catchError(() => {
          return new Observable(observer => observer.complete());
        })
      );
    }

    return new Observable(observer => observer.complete());
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearAuth();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshTokenResponse>(`${this.API_URL}/refresh/`, {
      refresh_token: refreshToken,
    }).pipe(
      tap(response => {
        this.setTokens(response.access_token, response.refresh_token);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSignal();
  }

  getAccessToken(): string | null {
    return this.storage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.storage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isLoggedInValue(): boolean {
    return this.isLoggedInSignal();
  }

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = this.parseJwt(token);
      const expiryTime = payload.exp * 1000;
      return expiryTime > Date.now();
    } catch {
      return false;
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.storage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    this.storage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  private setCurrentUser(user: CurrentUser): void {
    this.storage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private loadUserFromStorage(): CurrentUser | null {
    const userJson = this.storage.getItem(this.CURRENT_USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private clearAuth(): void {
    this.storage.removeItem(this.ACCESS_TOKEN_KEY);
    this.storage.removeItem(this.REFRESH_TOKEN_KEY);
    this.storage.removeItem(this.CURRENT_USER_KEY);
    this.currentUserSignal.set(null);
    this.isLoggedInSignal.set(false);
  }

  private scheduleTokenRefresh(): void {
    this.clearTokenRefreshTimer();

    const token = this.getAccessToken();
    if (!token) return;

    try {
      const payload = this.parseJwt(token);
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now - this.TOKEN_EXPIRY_BUFFER;

      if (timeUntilExpiry > 0) {
        this.refreshTokenTimer = setTimeout(() => {
          this.refreshToken().subscribe({
            error: () => this.clearAuth(),
          });
        }, timeUntilExpiry);
      }
    } catch {
      this.clearAuth();
    }
  }

  private clearTokenRefreshTimer(): void {
    if (this.refreshTokenTimer !== null) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
  }

  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error('Invalid token');
    }
  }
}
