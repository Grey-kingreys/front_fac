import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CashSessionStatus = 'open' | 'closed';

export interface CashSession {
  id: number;
  depot_id: number;
  depot_name: string;
  cashier_id: number;
  cashier_name: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number;
  status: CashSessionStatus;
  opened_at: string;
  closed_at: string | null;
}

export interface CashTransaction {
  id: number;
  session_id: number;
  type: 'sale' | 'expense' | 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  created_at: string;
}

export interface PaginatedSessions { count: number; results: CashSession[]; }
export interface PaginatedTransactions { count: number; results: CashTransaction[]; }

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/finance`;

  listSessions(params: { page?: number; depot_id?: number; status?: string } = {}): Observable<PaginatedSessions> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.depot_id) q.set('depot_id', String(params.depot_id));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return this.http.get<PaginatedSessions>(`${this.BASE}/sessions/${qs ? '?' + qs : ''}`);
  }

  openSession(data: { depot_id: number; opening_amount: number }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions/open/`, data);
  }

  closeSession(id: number, data: { closing_amount: number; note?: string }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions/${id}/close/`, data);
  }

  listTransactions(sessionId: number): Observable<PaginatedTransactions> {
    return this.http.get<PaginatedTransactions>(`${this.BASE}/sessions/${sessionId}/transactions/`);
  }
}