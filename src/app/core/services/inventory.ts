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

// ============================================================
// TRANSFERTS INTER-DÉPÔTS — CDC §3.3
// Cycle de vie backend (apps/stocks/models.py TransfertStock) :
//   demande (création) → expedier (statut EN_TRANSIT, déclenche auto une
//   Mission logistique via signal) → receptionner (statut RECU) | annuler
// ============================================================

export type TransfertStatus = 'demande' | 'en_transit' | 'recu' | 'annule';

export interface LigneTransfertInput {
  produit: number;
  quantite_envoyee: number;
}

export interface LigneTransfert {
  id: number;
  produit: number;
  produit_nom: string;
  quantite_envoyee: number;
  quantite_recue: number | null;
}

export interface Transfert {
  id: number;
  numero: string;              // ex: "TRF-202606-0001"
  statut: TransfertStatus;
  statut_label: string;
  depot_source: number;
  depot_source_nom: string;
  depot_destination: number;
  depot_destination_nom: string;
  lignes: LigneTransfert[];
  created_at: string;
}

export interface PaginatedTransferts {
  count: number;
  results: Transfert[];
}

export interface TransfertCreatePayload {
  depot_source: number;
  depot_destination: number;
  lignes: LigneTransfertInput[];
}

// ============================================================
// INVENTAIRES PHYSIQUES — CDC §3.3
// Cycle : création (statut en_cours) → saisie des quantités comptées par
// ligne → valider (calcule les écarts théorique/compté et applique le stock)
// ============================================================

export type InventaireStatus = 'en_cours' | 'valide' | 'annule';

export interface LigneInventaire {
  id: number;
  produit: number;
  produit_nom: string;
  quantite_theorique: number;
  quantite_comptee: number | null;
  ecart: number | null;
}

export interface Inventaire {
  id: number;
  numero: string;               // ex: "INV-202606-0001"
  statut: InventaireStatus;
  statut_label: string;
  depot: number;
  depot_nom: string;
  cree_par_nom: string;
  valide_par_nom: string | null;
  lignes: LigneInventaire[];
  created_at: string;
}

export interface PaginatedInventaires {
  count: number;
  results: Inventaire[];
}

export interface InventaireCreatePayload {
  depot: number;
  produits?: number[]; // optionnel — le backend pré-remplit les lignes théoriques
}

export interface LigneInventaireSaisie {
  ligne_id: number;
  quantite_comptee: number;
}

// ============================================================
// AJUSTEMENTS DE STOCK — CDC §3.3
// Toute correction manuelle de stock nécessite un motif et une validation
// par un superviseur/admin (statut: en_attente → approuve | refuse)
// ============================================================

export type AjustementStatus = 'en_attente' | 'approuve' | 'refuse';

export interface Ajustement {
  id: number;
  depot: number;
  depot_nom: string;
  produit: number;
  produit_nom: string;
  quantite: number;            // signé : positif = ajout, négatif = retrait
  motif: string;
  statut: AjustementStatus;
  statut_label: string;
  demande_par_nom: string;
  traite_par_nom: string | null;
  created_at: string;
}

export interface PaginatedAjustements {
  count: number;
  results: Ajustement[];
}

export interface AjustementCreatePayload {
  depot: number;
  produit: number;
  quantite: number;
  motif: string;        // obligatoire côté backend (motif_obligatoire)
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

  // ── Transferts inter-dépôts ─────────────────────────────────────────────
  // CRUD /api/transferts/ + actions /expedier/ /receptionner/ /annuler/

  listTransferts(params: { page?: number; page_size?: number; statut?: string; depot?: number } = {}): Observable<PaginatedTransferts> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.statut) q.set('statut', params.statut);
    if (params.depot) q.set('depot', String(params.depot));
    const qs = q.toString();
    return this.http.get<PaginatedTransferts>(`${this.BASE}/transferts/${qs ? '?' + qs : ''}`);
  }

  getTransfert(id: number): Observable<Transfert> {
    return this.http.get<Transfert>(`${this.BASE}/transferts/${id}/`);
  }

  createTransfert(data: TransfertCreatePayload): Observable<Transfert> {
    return this.http.post<Transfert>(`${this.BASE}/transferts/`, data);
  }

  // Démarre le transit — déclenche côté backend la création auto d'une Mission logistique
  expedierTransfert(id: number): Observable<Transfert> {
    return this.http.post<Transfert>(`${this.BASE}/transferts/${id}/expedier/`, {});
  }

  // Réception au dépôt destination — quantités reçues par ligne (peuvent différer de l'envoi)
  receptionnerTransfert(id: number, lignes: { ligne_id: number; quantite_recue: number }[]): Observable<Transfert> {
    return this.http.post<Transfert>(`${this.BASE}/transferts/${id}/receptionner/`, { lignes });
  }

  annulerTransfert(id: number): Observable<Transfert> {
    return this.http.post<Transfert>(`${this.BASE}/transferts/${id}/annuler/`, {});
  }

  // ── Inventaires physiques ────────────────────────────────────────────────
  // CRUD /api/inventaires/ + action /valider/

  listInventaires(params: { page?: number; page_size?: number; statut?: string; depot?: number } = {}): Observable<PaginatedInventaires> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.statut) q.set('statut', params.statut);
    if (params.depot) q.set('depot', String(params.depot));
    const qs = q.toString();
    return this.http.get<PaginatedInventaires>(`${this.BASE}/inventaires/${qs ? '?' + qs : ''}`);
  }

  getInventaire(id: number): Observable<Inventaire> {
    return this.http.get<Inventaire>(`${this.BASE}/inventaires/${id}/`);
  }

  createInventaire(data: InventaireCreatePayload): Observable<Inventaire> {
    return this.http.post<Inventaire>(`${this.BASE}/inventaires/`, data);
  }

  // Saisie des quantités comptées avant validation finale
  updateLigneInventaire(inventaireId: number, ligneId: number, quantite_comptee: number): Observable<Inventaire> {
    return this.http.patch<Inventaire>(`${this.BASE}/inventaires/${inventaireId}/`, {
      lignes: [{ id: ligneId, quantite_comptee }],
    });
  }

  // Calcule les écarts et applique les corrections de stock définitivement
  validerInventaire(id: number): Observable<Inventaire> {
    return this.http.post<Inventaire>(`${this.BASE}/inventaires/${id}/valider/`, {});
  }

  // ── Ajustements de stock (motif obligatoire + validation superviseur) ──

  listAjustements(params: { page?: number; page_size?: number; statut?: string; depot?: number } = {}): Observable<PaginatedAjustements> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.statut) q.set('statut', params.statut);
    if (params.depot) q.set('depot', String(params.depot));
    const qs = q.toString();
    return this.http.get<PaginatedAjustements>(`${this.BASE}/ajustements-stock/${qs ? '?' + qs : ''}`);
  }

  createAjustement(data: AjustementCreatePayload): Observable<Ajustement> {
    return this.http.post<Ajustement>(`${this.BASE}/ajustements-stock/`, data);
  }

  approuverAjustement(id: number): Observable<Ajustement> {
    return this.http.post<Ajustement>(`${this.BASE}/ajustements-stock/${id}/approuver/`, {});
  }

  refuserAjustement(id: number, motif?: string): Observable<Ajustement> {
    return this.http.post<Ajustement>(`${this.BASE}/ajustements-stock/${id}/refuser/`, motif ? { motif } : {});
  }
}