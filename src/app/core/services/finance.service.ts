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
//   - Consolidation 4 niveaux + versements inter-niveaux (CDC §3.6)
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
  nombre_transactions?: number;
  total_entrees?: number;
  total_sorties?: number;
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
  statut: 'ouverte' | 'fermee';
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

// ════════════════════════════════════════════════════════════════════
// HIÉRARCHIE DES CAISSES 4 NIVEAUX — CDC §3.6
// Caisse Entreprise (permanente) → Caisse Zone → Caisse Dépôt → Session Caissier
// Chaque niveau consolide les fonds du niveau inférieur via un versement.
// ════════════════════════════════════════════════════════════════════

export interface CaisseZone {
  id: number;
  nom: string;
  zone: number;
  zone_nom: string;
  devise: string;
  solde_actuel: number;
}

export interface CaisseEntreprise {
  id: number;
  nom: string;
  devise: string;
  solde_actuel: number;
}

export interface Consolidation {
  caisse_entreprise: CaisseEntreprise | null;
  caisses_zone: CaisseZone[];
  caisses_depot: CaissePhysique[];
}

export type TypeVersement = 'depot_vers_zone' | 'zone_vers_entreprise';

export interface VersementPayload {
  type_versement: TypeVersement;
  caisse_source: number;   // ID CaissePhysique (si depot_vers_zone) ou CaisseZone (si zone_vers_entreprise)
  caisse_destination: number;
  montant: number;
  justificatif?: string;
  montant_comptage_receveur: number; // double comptage obligatoire — doit être saisi par le receveur
  motif_ecart?: string;              // obligatoire si montant_comptage_receveur != montant
}

export interface Versement {
  id: number;
  type_versement: TypeVersement;
  montant: number;
  montant_comptage_receveur: number;
  ecart: number;
  justificatif: string;
  motif_ecart: string | null;
  created_at: string;
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

  // ── Consolidation des 4 niveaux ──────────────────────────────────────────
  // GET /api/caisses/consolidation/ — soldes agrégés à tous les niveaux

  getConsolidation(): Observable<Consolidation> {
    return this.http.get<Consolidation>(`${this.BASE}/caisses/consolidation/`);
  }

  listCaissesZone(): Observable<{ count: number; results: CaisseZone[] }> {
    return this.http.get<{ count: number; results: CaisseZone[] }>(`${this.BASE}/caisses-zone/?page_size=100`);
  }

  getCaisseEntreprise(): Observable<CaisseEntreprise> {
    return this.http.get<CaisseEntreprise>(`${this.BASE}/caisse-entreprise/`);
  }

  // ── Versements inter-niveaux (dépôt→zone, zone→entreprise) ──────────────
  // Double comptage obligatoire : le receveur saisit le montant qu'il compte
  // réellement reçu — un écart avec le montant envoyé exige un motif.

  createVersement(data: VersementPayload): Observable<Versement> {
    return this.http.post<Versement>(`${this.BASE}/versements-caisse/`, data);
  }
} 