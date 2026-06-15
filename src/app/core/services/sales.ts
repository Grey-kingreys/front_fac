import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SaleItem {
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  subtotal?: number;
}

export interface Sale {
  id: number;
  reference: string;
  client_name?: string;
  client_phone?: string;
  items: SaleItem[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  payment_method: 'cash' | 'mobile_money' | 'credit';
  mobile_money_provider?: 'orange' | 'mtn';
  status: 'pending' | 'completed' | 'cancelled';
  user_name?: string;
  depot_name?: string;
  created_at: string;
}

export interface PaginatedSales {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sale[];
}

export interface SaleCreatePayload {
  client_name?: string;
  client_phone?: string;
  items: { product: number; quantity: number; unit_price: number; tva_rate?: number }[];
  payment_method: 'cash' | 'mobile_money' | 'credit';
  mobile_money_provider?: 'orange' | 'mtn';
  depot?: number;
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/sales`;

  list(params: { page?: number; page_size?: number; search?: string; status?: string } = {}): Observable<PaginatedSales> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return this.http.get<PaginatedSales>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  get(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.BASE}/${id}/`);
  }

  create(data: SaleCreatePayload): Observable<Sale> {
    return this.http.post<Sale>(`${this.BASE}/`, data);
  }

  cancel(id: number): Observable<Sale> {
    return this.http.post<Sale>(`${this.BASE}/${id}/cancel/`, {});
  }
}