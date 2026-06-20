import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { StorageService } from './storage';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: CurrentUser;
}

export interface TwoFactorRequiredResponse {
  requires_2fa: true;
  temp_token: string;
  method: 'totp' | 'email';
  message: string;
}

export interface TwoFactorPending {
  tempToken: string;
  method: 'totp' | 'email';
  message: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  company_id?: number | null;
  company_name?: string | null;
  depot_id?: number | null;
  depot_name?: string | null;
  avatar_url?: string | null;
  phone?: string;
  two_factor_enabled?: boolean;
  two_factor_method?: 'totp' | 'email' | '';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly CURRENT_USER_KEY = 'current_user';
  private readonly TOKEN_EXPIRY_BUFFER = 60000; // 1 minute avant expiration

  private currentUserSignal = signal<CurrentUser | null>(this.loadUserFromStorage());
  public currentUser = this.currentUserSignal.asReadonly();

  private isLoggedInSignal = signal<boolean>(this.hasValidToken());
  public isLoggedIn = this.isLoggedInSignal.asReadonly();

  private twoFactorPendingSignal = signal<TwoFactorPending | null>(null);
  public twoFactorPending = this.twoFactorPendingSignal.asReadonly();

  // ── Simulation de rôle (Admin uniquement) ────────────────────────────────────
  private realUserSignal = signal<CurrentUser | null>(null);
  public realUser = this.realUserSignal.asReadonly();
  public isSimulating = computed(() => this.realUserSignal() !== null);
  public simulatedAs = computed(() => this.isSimulating() ? this.currentUserSignal() : null);

  private refreshTokenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (this.hasValidToken()) {
      this.scheduleTokenRefresh();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse | TwoFactorRequiredResponse> {
    return this.http.post<LoginResponse | TwoFactorRequiredResponse>(`${this.API_URL}/login/`, credentials).pipe(
      tap(response => {
        if ('requires_2fa' in response && response.requires_2fa) {
          this.twoFactorPendingSignal.set({
            tempToken: (response as TwoFactorRequiredResponse).temp_token,
            method: (response as TwoFactorRequiredResponse).method,
            message: (response as TwoFactorRequiredResponse).message,
          });
          return;
        }
        const r = response as LoginResponse;
        this.setTokens(r.access, r.refresh);
        this.setCurrentUser(r.user);
        this.isLoggedInSignal.set(true);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  loginVerify2fa(tempToken: string, code: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/2fa/login-verify/`, { temp_token: tempToken, code }).pipe(
      tap(response => {
        const user: any = response.user;
        if (!user.avatar_url && user.avatar) user.avatar_url = user.avatar;
        this.setTokens(response.access, response.refresh);
        this.setCurrentUser(response.user);
        this.isLoggedInSignal.set(true);
        this.twoFactorPendingSignal.set(null);
        this.scheduleTokenRefresh();
      }),
      catchError(error => throwError(() => error))
    );
  }

  setup2fa(method: 'totp' | 'email'): Observable<{ method: string; secret?: string; qr_code?: string; message: string }> {
    return this.http.post<any>(`${this.API_URL}/2fa/setup/`, { method });
  }

  verify2faSetup(method: 'totp' | 'email', code: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.API_URL}/2fa/setup-verify/`, { method, code }).pipe(
      tap(() => {
        const user = this.currentUserSignal();
        if (user) this.setCurrentUser({ ...user, two_factor_enabled: true, two_factor_method: method });
      })
    );
  }

  disable2fa(password: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.API_URL}/2fa/disable/`, { password }).pipe(
      tap(() => {
        const user = this.currentUserSignal();
        if (user) this.setCurrentUser({ ...user, two_factor_enabled: false, two_factor_method: '' });
      })
    );
  }

  resend2faCode(tempToken: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.API_URL}/2fa/resend/`, { temp_token: tempToken });
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    this.clearAuth();
    this.clearTokenRefreshTimer();

    if (refreshToken) {
      return this.http.post(`${this.API_URL}/logout/`, { refresh: refreshToken }).pipe(
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
      refresh: refreshToken,
    }).pipe(
      tap(response => {
        this.setTokens(response.access, response.refresh);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  // ── Simulation (Admin only) ──────────────────────────────────────────────────
  simulateUser(user: CurrentUser): void {
    if (!this.realUserSignal()) {
      this.realUserSignal.set(this.currentUserSignal());
    }
    this.currentUserSignal.set(user);
  }

  stopSimulation(): void {
    const real = this.realUserSignal();
    if (real) {
      this.currentUserSignal.set(real);
      this.realUserSignal.set(null);
    }
  }

  updateProfile(data: { first_name?: string; last_name?: string; phone?: string }): Observable<CurrentUser> {
    return this.http.patch<CurrentUser>(`${this.API_URL}/me/`, data).pipe(
      tap(updatedUser => {
        this.setCurrentUser(updatedUser);
      })
    );
  }

  changePassword(data: { current_password: string; new_password: string; new_password_confirm: string }): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.API_URL}/me/change-password/`, data);
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
    this.twoFactorPendingSignal.set(null);
    // Réinitialiser toute simulation en cours (déconnexion manuelle ou via 401 interceptor).
    this.realUserSignal.set(null);
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
