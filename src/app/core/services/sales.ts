// ============================================================
// SALES SERVICE — Version corrigée et complète
// Chemin : src/app/core/services/sales.ts
//
// CORRECTIONS APPLIQUÉES :
//   - BASE URL: /sales → /commandes  (le backend utilise /api/commandes/)
//   - Payload de création: champs anglais → champs français du backend
//       items      → lignes
//       product    → produit
//       quantity   → quantite
//       unit_price → prix_unitaire_ht
//       payment_method → mode_paiement_initial
//       cash → especes, mobile_money → orange_money / mtn_money
//   - Interface Sale mise à jour avec les vrais champs retournés
//       reference → numero
//       total_ht  → montant_ht
//       total_tva → tva_total
//       total_ttc → montant_ttc
//       status    → statut
//   - Ajout interface Client pour la liste des clients
//   - Ajout méthode listClients() pour peupler le select client
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces de lecture (ce que le backend retourne) ────────────────────────

export interface SaleLigne {
  id: number;
  produit: number;
  produit_nom: string;
  produit_reference: string;
  unite_symbole: string;
  quantite: number;
  prix_unitaire_ht: number;
  tva_taux: number;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
}

export interface Sale {
  id: number;
  numero: string;           // ex: "CMD-2026-00042"
  statut: 'en_attente' | 'livree' | 'annulee' | 'partiellement_payee';
  statut_label: string;     // ex: "Livrée"
  client: number | null;
  client_nom: string;       // "Anonyme" si pas de client
  depot: number;
  mode_paiement: 'comptant' | 'partiel' | 'credit';
  mode_paiement_label: string;
  montant_ht: number;
  tva_total: number;
  montant_ttc: number;
  remise: number;
  montant_paye: number;
  reste_a_payer: number;
  est_solde: boolean;
  nb_lignes?: number;       // dans la liste uniquement
  lignes?: SaleLigne[];     // dans le détail uniquement
  created_at: string;
}

export interface PaginatedSales {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sale[];
}

// ── Client (pour la liste déroulante dans le formulaire de vente) ─────────────

export interface Client {
  id: number;
  code: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  telephone: string;
  points_fidelite: number;
  solde_credit: number;
  is_active: boolean;
}

export interface PaginatedClients {
  count: number;
  results: Client[];
}

// ── Payload de création d'une commande (ce qu'on ENVOIE au backend) ───────────
// Correspond exactement à CommandeCreateSerializer dans Django

export interface LigneCommandeInput {
  produit: number;           // ID du produit
  quantite: number;          // quantité
  prix_unitaire_ht?: number; // optionnel, sinon le backend prend le prix du produit
}

export interface SaleCreatePayload {
  depot: number;                             // OBLIGATOIRE — ID du dépôt
  client?: number | null;                    // optionnel — ID du client
  mode_paiement?: 'comptant' | 'partiel' | 'credit'; // défaut: comptant
  remise?: number;                           // remise en GNF, défaut: 0
  points_utilises?: number;                  // points fidélité à utiliser
  notes?: string;
  lignes: LigneCommandeInput[];              // au moins 1 ligne obligatoire
  montant_paye?: number;                     // montant encaissé immédiatement
  mode_paiement_initial?: 'especes' | 'orange_money' | 'mtn_money' | 'virement'; // mode d'encaissement
  reference_paiement?: string;              // référence Mobile Money
}

export interface PaiementPayload {
  montant: number;
  mode: 'especes' | 'orange_money' | 'mtn_money' | 'virement' | 'points_fidelite';
  reference?: string; // obligatoire pour orange_money / mtn_money / virement côté backend
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private http = inject(HttpClient);
  // ✅ URL CORRIGÉE : /commandes/ (pas /sales/)
  private readonly BASE = `${environment.apiUrl}/commandes`;

  // ── Liste des commandes ───────────────────────────────────────────────────

  list(params: {
    page?: number;
    page_size?: number;
    search?: string;
    statut?: string;
    depot?: number;
  } = {}): Observable<PaginatedSales> {
    const q = new URLSearchParams();
    if (params.page)      q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search)    q.set('search', params.search);
    if (params.statut)    q.set('statut', params.statut);
    if (params.depot)     q.set('depot', String(params.depot));
    const qs = q.toString();
    return this.http.get<PaginatedSales>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  // ── Détail d'une commande ─────────────────────────────────────────────────

  get(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.BASE}/${id}/`);
  }

  // ── Créer une commande ────────────────────────────────────────────────────
  // ✅ PAYLOAD CORRIGÉ — correspond exactement à CommandeCreateSerializer

  create(data: SaleCreatePayload): Observable<Sale> {
    return this.http.post<Sale>(`${this.BASE}/`, data);
  }

  // ── Annuler une commande ──────────────────────────────────────────────────

  cancel(id: number): Observable<Sale> {
    return this.http.post<Sale>(`${this.BASE}/${id}/annuler/`, {});
  }

  // ── Paiement complémentaire sur une commande à crédit/partielle ───────────
  // POST /api/commandes/{id}/paiement/

  addPaiement(id: number, data: PaiementPayload): Observable<Sale> {
    return this.http.post<Sale>(`${this.BASE}/${id}/paiement/`, data);
  }

  // ── Facture PDF et bon de livraison PDF ────────────────────────────────────
  // GET /api/commandes/{id}/facture/ et /bon-livraison/ — le backend retourne
  // un fichier binaire (reportlab), donc on demande explicitement un Blob.

  downloadFacture(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/${id}/facture/`, { responseType: 'blob' });
  }

  downloadBonLivraison(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/${id}/bon-livraison/`, { responseType: 'blob' });
  }

  // ── Liste des clients (pour le select du formulaire) ─────────────────────
  // URL : /api/clients/

  listClients(params: { page_size?: number; search?: string } = {}): Observable<PaginatedClients> {
    const BASE_CLIENTS = `${environment.apiUrl}/clients`;
    const q = new URLSearchParams();
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search)    q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedClients>(`${BASE_CLIENTS}/${qs ? '?' + qs : ''}`);
  }
}