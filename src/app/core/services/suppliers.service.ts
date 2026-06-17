import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  is_active: boolean;
  total_purchases?: number;
  created_at: string;
}

export interface PaginatedSuppliers { count: number; results: Supplier[]; }
export interface SupplierPayload {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/suppliers`;

  list(params: { page?: number; search?: string } = {}): Observable<PaginatedSuppliers> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedSuppliers>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  create(data: SupplierPayload): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.BASE}/`, data);
  }

  update(id: number, data: Partial<SupplierPayload>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.BASE}/${id}/`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}/`);
  }
}