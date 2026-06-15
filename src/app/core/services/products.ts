import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: number;
  name: string;
  reference: string;
  description?: string;
  category?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  tva_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  category?: string;
}

export interface ProductPayload {
  name: string;
  reference: string;
  description?: string;
  category?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  tva_rate?: number;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/products`;

  list(params: ProductListParams = {}): Observable<PaginatedProducts> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search) q.set('search', params.search);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    if (params.category) q.set('category', params.category);
    const qs = q.toString();
    return this.http.get<PaginatedProducts>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.BASE}/${id}/`);
  }

  create(data: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.BASE}/`, data);
  }

  update(id: number, data: Partial<ProductPayload>): Observable<Product> {
    return this.http.patch<Product>(`${this.BASE}/${id}/`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}/`);
  }
}