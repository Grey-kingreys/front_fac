import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StockItem {
  id: number;
  product: number;
  product_name: string;
  product_reference: string;
  depot: number;
  depot_name: string;
  quantity: number;
  alert_threshold: number;
  is_low: boolean;
  unit: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  stock_item: number;
  product_name: string;
  movement_type: 'entry' | 'exit' | 'adjustment' | 'transfer';
  quantity: number;
  reason?: string;
  user_name: string;
  created_at: string;
}

export interface PaginatedStock {
  count: number;
  next: string | null;
  previous: string | null;
  results: StockItem[];
}

export interface PaginatedMovements {
  count: number;
  results: StockMovement[];
}

export interface StockListParams {
  page?: number;
  page_size?: number;
  search?: string;
  depot?: number;
  is_low?: boolean;
}

export interface MovementPayload {
  stock_item: number;
  movement_type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/inventory`;

  listStock(params: StockListParams = {}): Observable<PaginatedStock> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search) q.set('search', params.search);
    if (params.depot) q.set('depot', String(params.depot));
    if (params.is_low !== undefined) q.set('is_low', String(params.is_low));
    const qs = q.toString();
    return this.http.get<PaginatedStock>(`${this.BASE}/stock/${qs ? '?' + qs : ''}`);
  }

  listMovements(params: { page?: number; page_size?: number; stock_item?: number } = {}): Observable<PaginatedMovements> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.stock_item) q.set('stock_item', String(params.stock_item));
    const qs = q.toString();
    return this.http.get<PaginatedMovements>(`${this.BASE}/movements/${qs ? '?' + qs : ''}`);
  }

  addMovement(data: MovementPayload): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.BASE}/movements/`, data);
  }

  updateThreshold(stockItemId: number, threshold: number): Observable<StockItem> {
    return this.http.patch<StockItem>(`${this.BASE}/stock/${stockItemId}/`, { alert_threshold: threshold });
  }
}