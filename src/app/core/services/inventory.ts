// ============================================================
// INVENTORY SERVICE — Corrigé pour correspondre au backend réel
// Chemin : src/app/core/services/inventory.ts
//
// CHANGEMENTS vs version précédente :
//   - BASE: /api/inventory → /api (stocks = /api/stocks/)
//   - StockItem: product_name→produit_nom, product_reference→produit_reference
//     depot_name→depot_nom, is_low→en_alerte, unit→unite_symbole, updated_at→updated_at ✓
//   - StockMovement: movement_type→type_mouvement, reason→motif,
//     user_name→utilisateur_nom, created_at ✓
//   - listStock: /inventory/stock/ → /stocks/
//   - listMovements: /inventory/movements/ → /mouvements-stock/
//   - addMovement: payload stock_item→stock (si différent), type entree/sortie via actions dédiées
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StockItem {
  id: number;
  produit: number;
  produit_nom: string;
  produit_reference: string;
  depot: number;
  depot_code: string;
  depot_nom: string;
  zone_nom: string;
  quantite: number;
  seuil_alerte: number;
  en_alerte: boolean;
  unite_symbole: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  depot: number;
  depot_code: string;
  produit: number;
  produit_reference: string;
  produit_nom: string;
  type_mouvement: 'entree' | 'sortie' | 'ajustement' | 'transfert';
  type_label: string;
  quantite: number;
  quantite_avant: number;
  quantite_apres: number;
  motif: string;
  utilisateur: number;
  utilisateur_nom: string;
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

// Le backend a des actions dédiées POST /stocks/entree/ et POST /stocks/sortie/
export interface EntreeStockPayload {
  depot: number;
  produit: number;
  quantite: number;
  motif?: string;
  reference_doc?: string;
}

export interface SortieStockPayload {
  depot: number;
  produit: number;
  quantite: number;
  motif?: string;
  reference_doc?: string;
}

// Payload unifié utilisé dans inventory.ts (mappe vers entree ou sortie)
export interface MovementPayload {
  stock_item?: number; // kept for backward compat
  depot?: number;
  produit?: number;
  movement_type: 'entry' | 'exit' | 'adjustment';
  quantite?: number;
  quantity?: number;
  reason?: string;
  motif?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}`;

  listStock(params: StockListParams = {}): Observable<PaginatedStock> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search) q.set('search', params.search);
    if (params.depot) q.set('depot', String(params.depot));
    if (params.is_low) q.set('en_alerte', 'true');
    const qs = q.toString();
    return this.http.get<PaginatedStock>(`${this.BASE}/stocks/${qs ? '?' + qs : ''}`);
  }

  listMovements(params: { page?: number; page_size?: number; depot?: number } = {}): Observable<PaginatedMovements> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.depot) q.set('depot', String(params.depot));
    const qs = q.toString();
    return this.http.get<PaginatedMovements>(`${this.BASE}/mouvements-stock/${qs ? '?' + qs : ''}`);
  }

  // Le backend expose /stocks/entree/ et /stocks/sortie/ (pas un endpoint générique)
  addEntree(data: EntreeStockPayload): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.BASE}/stocks/entree/`, data);
  }

  addSortie(data: SortieStockPayload): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.BASE}/stocks/sortie/`, data);
  }

  // Méthode unifiée pour le template inventory.html
  addMovement(payload: MovementPayload): Observable<StockMovement> {
    const qty = payload.quantite ?? payload.quantity ?? 0;
    const motif = payload.motif ?? payload.reason;

    // On a besoin du depot et produit — si on a stock_item, on doit les récupérer
    // Pour l'instant, on passe depot=0/produit=0 si non fourni (le template devra les fournir)
    const body = {
      depot: payload.depot ?? 0,
      produit: payload.produit ?? 0,
      quantite: qty,
      motif: motif ?? '',
    };

    if (payload.movement_type === 'entry') {
      return this.addEntree(body);
    } else {
      return this.addSortie(body);
    }
  }

  updateThreshold(stockItemId: number, threshold: number): Observable<StockItem> {
    return this.http.patch<StockItem>(`${this.BASE}/stocks/${stockItemId}/`, { seuil_alerte: threshold });
  }
}