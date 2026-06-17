// ============================================================
// FINANCE SERVICE — Corrigé pour le backend réel
// Chemin : src/app/core/services/finance.service.ts
//
// CHANGEMENTS :
//   - SessionCaisse : les vrais champs du serializer Django
//     statut: 'ouverte'|'fermee' (pas 'open'|'closed')
//     caisse_nom, caissier_nom (pas depot_name, cashier_name)
//     solde_ouverture (pas opening_amount)
//     solde_fermeture_theorique (pas expected_amount)
//     solde_fermeture_reel (pas closing_amount)
//     ouvert_le (pas opened_at), ferme_le (pas closed_at)
//   - URL: /finance/sessions/ → /sessions-caisse/
//   - openSession: POST /sessions-caisse/ouvrir/ avec {caisse, solde_ouverture}
//   - closeSession: POST /sessions-caisse/{id}/fermer/ avec {solde_reel, motif_ecart}
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CashSessionStatus = 'ouverte' | 'fermee';

export interface CashSession {
  id: number;
  caisse: number;
  caisse_nom: string;
  caissier: number;
  caissier_nom: string;
  statut: CashSessionStatus;
  statut_label: string;
  solde_ouverture: number;
  solde_fermeture_theorique: number | null;
  solde_fermeture_reel: number | null;
  ecart: number;
  ouvert_le: string;
  ferme_le: string | null;
}

export interface PaginatedSessions {
  count: number;
  results: CashSession[];
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}`;

  listSessions(params: { page?: number; caisse?: number; statut?: string } = {}): Observable<PaginatedSessions> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.caisse) q.set('caisse', String(params.caisse));
    if (params.statut) q.set('statut', params.statut);
    const qs = q.toString();
    return this.http.get<PaginatedSessions>(`${this.BASE}/sessions-caisse/${qs ? '?' + qs : ''}`);
  }

  openSession(data: { caisse: number; solde_ouverture: number; notes?: string }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions-caisse/ouvrir/`, data);
  }

  closeSession(id: number, data: { solde_reel: number; motif_ecart?: string }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions-caisse/${id}/fermer/`, data);
  }
}