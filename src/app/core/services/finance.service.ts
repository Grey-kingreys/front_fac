// ============================================================
// FINANCE SERVICE — Version corrigée et complète
// Chemin : src/app/core/services/finance.service.ts
//
// CE QUI ÉTAIT DÉJÀ CORRECT :
//   - URLs : /sessions-caisse/, /sessions-caisse/ouvrir/, /sessions-caisse/{id}/fermer/
//   - Champs CashSession : statut, caisse_nom, caissier_nom, solde_ouverture, etc.
//
// AJOUT :
//   - Interface CaissePhysique pour le select "Choisir une caisse"
//   - Méthode listCaisses() → GET /api/caisses/
//   - Méthode listDepenses() → GET /api/depenses/
//   - Interface Depense pour afficher les dépenses
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CashSessionStatus = 'ouverte' | 'fermee';

// ── Session de caisse (SessionCaisseListSerializer) ───────────────────────────

export interface CashSession {
  id: number;
  caisse: number;
  caisse_nom: string;         // nom de la caisse physique
  caissier: number;
  caissier_nom: string;       // nom du caissier
  statut: CashSessionStatus;
  statut_label: string;       // "Ouverte" / "Fermée"
  solde_ouverture: number;
  solde_fermeture_theorique: number | null;
  solde_fermeture_reel: number | null;
  ecart: number;
  ouvert_le: string;
  ferme_le: string | null;
}

export interface PaginatedSessions {
  count: number;
  next: string | null;
  previous: string | null;
  results: CashSession[];
}

// ── Caisse Physique (CaissePhysiqueSerializer) ────────────────────────────────
// Nécessaire pour le select "Choisir une caisse" dans le formulaire d'ouverture

export interface CaissePhysique {
  id: number;
  nom: string;
  depot: number;
  depot_nom: string;
  solde_actuel: number;
  is_active: boolean;
}

export interface PaginatedCaisses {
  count: number;
  results: CaissePhysique[];
}

// ── Dépense opérationnelle ────────────────────────────────────────────────────

export interface Depense {
  id: number;
  libelle: string;
  montant: number;
  categorie: string;
  caisse: number;
  caisse_nom?: string;
  created_by_nom?: string;
  created_at: string;
}

export interface PaginatedDepenses {
  count: number;
  results: Depense[];
}

export interface DepensePayload {
  libelle: string;
  montant: number;
  categorie?: string;
  caisse: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}`;

  // ── Sessions de caisse ────────────────────────────────────────────────────

  listSessions(params: {
    page?: number;
    caisse?: number;
    statut?: string;
  } = {}): Observable<PaginatedSessions> {
    const q = new URLSearchParams();
    if (params.page)   q.set('page', String(params.page));
    if (params.caisse) q.set('caisse', String(params.caisse));
    if (params.statut) q.set('statut', params.statut);
    const qs = q.toString();
    return this.http.get<PaginatedSessions>(`${this.BASE}/sessions-caisse/${qs ? '?' + qs : ''}`);
  }

  // POST /api/sessions-caisse/ouvrir/
  // Payload: { caisse: number, solde_ouverture: number, notes?: string }
  openSession(data: {
    caisse: number;
    solde_ouverture: number;
    notes?: string;
  }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions-caisse/ouvrir/`, data);
  }

  // POST /api/sessions-caisse/{id}/fermer/
  // Payload: { solde_reel: number, motif_ecart?: string }
  closeSession(id: number, data: {
    solde_reel: number;
    motif_ecart?: string;
  }): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.BASE}/sessions-caisse/${id}/fermer/`, data);
  }

  // ── Caisses physiques ─────────────────────────────────────────────────────
  // GET /api/caisses/ — pour le select "Choisir une caisse" à l'ouverture

  listCaisses(): Observable<PaginatedCaisses> {
    return this.http.get<PaginatedCaisses>(`${this.BASE}/caisses/?page_size=100`);
  }

  // ── Dépenses opérationnelles ──────────────────────────────────────────────

  listDepenses(params: {
    page?: number;
    page_size?: number;
  } = {}): Observable<PaginatedDepenses> {
    const q = new URLSearchParams();
    if (params.page)       q.set('page', String(params.page));
    if (params.page_size)  q.set('page_size', String(params.page_size));
    const qs = q.toString();
    return this.http.get<PaginatedDepenses>(`${this.BASE}/depenses/${qs ? '?' + qs : ''}`);
  }

  createDepense(data: DepensePayload): Observable<Depense> {
    return this.http.post<Depense>(`${this.BASE}/depenses/`, data);
  }
}