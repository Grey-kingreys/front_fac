import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CompanySummary {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  is_active: boolean;
  statut: string;
  subscription_plan: string;
  nombre_utilisateurs: number;
  nombre_zones: number;
  created_at: string;
}

interface ApiResponse<T> { success: boolean; data: T; message: string; }
interface CompanyListData { count: number; companies: CompanySummary[]; }

export interface PaginatedCompanies {
  count: number;
  results: CompanySummary[];
}

export interface CompanyCreatePayload {
  name: string;
  email_admin: string;
  subscription_plan: string;
}

export interface CompanyUpdatePayload {
  name?: string;
  subscription_plan?: string;
}

export interface CompanyListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/companies`;

  list(params: CompanyListParams = {}): Observable<PaginatedCompanies> {
    const q = new URLSearchParams();
    if (params.page !== undefined)       q.set('page', String(params.page));
    if (params.page_size !== undefined)  q.set('page_size', String(params.page_size));
    if (params.search)                   q.set('search', params.search);
    if (params.is_active !== undefined)  q.set('is_active', String(params.is_active));
    const qs = q.toString();
    return this.http.get<ApiResponse<CompanyListData>>(`${this.BASE}/${qs ? '?' + qs : ''}`)
      .pipe(map(res => ({ count: res.data.count, results: res.data.companies })));
  }

  create(data: CompanyCreatePayload): Observable<CompanySummary> {
    return this.http.post<ApiResponse<CompanySummary>>(`${this.BASE}/`, data)
      .pipe(map(res => res.data));
  }

  update(id: number, data: CompanyUpdatePayload): Observable<CompanySummary> {
    return this.http.patch<ApiResponse<CompanySummary>>(`${this.BASE}/${id}/`, data)
      .pipe(map(res => res.data));
  }

  toggle(id: number): Observable<CompanySummary> {
    return this.http.post<ApiResponse<CompanySummary>>(`${this.BASE}/${id}/toggle/`, {})
      .pipe(map(res => res.data));
  }
}
