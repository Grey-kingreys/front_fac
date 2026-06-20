import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  company_id: number | null;
  company_name: string | null;
  depot_id: number | null;
  depot_name: string | null;
  zone_id: number | null;
  zone_name: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserSummary[];
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}

export interface UserCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  depot_id?: number | null;
  zone_id?: number | null;
  password: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  depot_id?: number | null;
  zone_id?: number | null;
}

export interface PasswordResetPayload {
  new_password: string;
  new_password_confirm: string;
}

export interface DepotOption {
  id: number;
  name: string;
  code: string;
  zone_name: string;
  zone_code: string;
}

export interface PaginatedDepots {
  count: number;
  results: DepotOption[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/users`;
  private readonly DEPOTS = `${environment.apiUrl}/depots`;

  list(params: UserListParams = {}): Observable<PaginatedUsers> {
    const q = new URLSearchParams();
    if (params.page !== undefined)       q.set('page', String(params.page));
    if (params.page_size !== undefined)  q.set('page_size', String(params.page_size));
    if (params.search)                   q.set('search', params.search);
    if (params.role)                     q.set('role', params.role);
    if (params.is_active !== undefined)  q.set('is_active', String(params.is_active));
    const qs = q.toString();
    return this.http.get<PaginatedUsers>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  get(id: number): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.BASE}/${id}/`);
  }

  create(data: UserCreatePayload): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${this.BASE}/`, data);
  }

  update(id: number, data: UserUpdatePayload): Observable<UserSummary> {
    return this.http.patch<UserSummary>(`${this.BASE}/${id}/`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}/`);
  }

  resetPassword(id: number, data: PasswordResetPayload): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${this.BASE}/${id}/reset-password/`, data);
  }

  listDepots(): Observable<PaginatedDepots> {
    return this.http.get<PaginatedDepots>(`${this.DEPOTS}/?is_active=true&page_size=200`);
  }
}
