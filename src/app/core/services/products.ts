// ============================================================
// PRODUCTS SERVICE — Interfaces mises à jour depuis le backend
// Chemin : src/app/core/services/products.ts
//
// MISE À JOUR backend (après git pull) :
//   CategorieSerializer :
//     - Ajout champ "tva_taux" (Decimal, default=0)
//     - Contrainte unique : name par company
//     - read_only : id, nombre_produits, created_at
//
//   UniteSerializer :
//     - Contrainte unique : symbole par company
//     - read_only : id, created_at
//
// Routes confirmées :
//   GET/POST        /api/categories/
//   GET/PATCH/DEL   /api/categories/{id}/
//   GET/POST        /api/unites/
//   GET/PATCH/DEL   /api/unites/{id}/
//   GET/POST        /api/produits/
//   GET/PATCH/DEL   /api/produits/{id}/
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ══════════════════════════════════════════════════════════════════════════════
// CATÉGORIE
// ══════════════════════════════════════════════════════════════════════════════

/** Ce que le backend retourne (lecture) */
export interface Categorie {
  id: number;
  name: string;
  description: string;
  couleur: string;          // ex: "#6366f1"
  tva_taux: string;         // Decimal sérialisé en string ex: "18.00"
  is_active: boolean;
  nombre_produits: number;  // read_only — nb produits actifs liés
  created_at: string;
}

/** Ce qu'on envoie pour créer ou modifier */
export interface CategoriePayload {
  name: string;             // obligatoire — unique par company
  description?: string;
  couleur?: string;         // défaut: "#6366f1"
  tva_taux?: number;        // Taux TVA par défaut (appliqué aux produits) ex: 18
  is_active?: boolean;
}

export interface PaginatedCategories {
  count: number;
  next: string | null;
  previous: string | null;
  results: Categorie[];
}

// ══════════════════════════════════════════════════════════════════════════════
// UNITÉ
// ══════════════════════════════════════════════════════════════════════════════

/** Ce que le backend retourne (lecture) */
export interface Unite {
  id: number;
  name: string;
  symbole: string;    // unique par company ex: "kg", "L", "ctn"
  is_active: boolean;
  created_at: string;
}

/** Ce qu'on envoie pour créer ou modifier */
export interface UnitePayload {
  name: string;       // obligatoire
  symbole: string;    // obligatoire — unique par company
  is_active?: boolean;
}

export interface PaginatedUnites {
  count: number;
  next: string | null;
  previous: string | null;
  results: Unite[];
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUIT
// ══════════════════════════════════════════════════════════════════════════════

/** Interface utilisée dans les templates Angular */
export interface Product {
  id: number;
  name: string;
  reference: string;
  barcode?: string;          // code_barre
  description?: string;
  category?: string;         // categorie_nom (read_only)
  category_id?: number;      // ID FK categorie
  unit: string;              // unite_symbole (read_only)
  unit_id?: number;          // ID FK unite
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
}

/** Ce qu'on envoie au backend pour créer/modifier */
export interface ProductPayload {
  nom: string;          // obligatoire
  reference: string;    // obligatoire
  code_barre?: string;  // code-barres EAN/UPC (optionnel)
  description?: string;
  categorie: number;    // FK obligatoire — ID de Categorie
  unite: number;        // FK obligatoire — ID de Unite
  prix_achat?: number;
  prix_vente: number;   // obligatoire
  tva_taux?: number;
  seuil_alerte?: number;
  is_active?: boolean;
}

/** Réponse brute du backend (ProduitListSerializer) */
interface BackendProduct {
  id: number;
  nom: string;
  reference: string;
  code_barre?: string;
  description?: string;
  categorie_nom?: string;
  categorie?: number;
  unite_symbole?: string;
  unite?: number;
  prix_achat: number;
  prix_vente: number;
  tva_taux?: number;
  is_active: boolean;
  created_at: string;
}

interface BackendPaginated {
  count: number;
  next: string | null;
  previous: string | null;
  results: BackendProduct[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);

  private readonly BASE_PRODUITS   = `${environment.apiUrl}/produits`;
  private readonly BASE_CATEGORIES = `${environment.apiUrl}/categories`;
  private readonly BASE_UNITES     = `${environment.apiUrl}/unites`;

  // ── Mapping backend → interface Angular ──────────────────────────────────

  private mapProduct(p: BackendProduct): Product {
    return {
      id:             p.id,
      name:           p.nom,
      reference:      p.reference,
      barcode:        p.code_barre,
      description:    p.description,
      category:       p.categorie_nom,
      category_id:    p.categorie,
      unit:           p.unite_symbole ?? '',
      unit_id:        p.unite,
      purchase_price: Number(p.prix_achat),
      selling_price:  Number(p.prix_vente),
      tva_rate:       Number(p.tva_taux ?? 0),
      is_active:      p.is_active,
      created_at:     p.created_at,
    };
  }

  // ── CRUD Produits ─────────────────────────────────────────────────────────

  list(params: ProductListParams = {}): Observable<PaginatedProducts> {
    const q = new URLSearchParams();
    if (params.page)      q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search)    q.set('search', params.search);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    const qs = q.toString();
    return this.http
      .get<BackendPaginated>(`${this.BASE_PRODUITS}/${qs ? '?' + qs : ''}`)
      .pipe(map(res => ({ ...res, results: res.results.map(p => this.mapProduct(p)) })));
  }

  get(id: number): Observable<Product> {
    return this.http.get<BackendProduct>(`${this.BASE_PRODUITS}/${id}/`).pipe(map(p => this.mapProduct(p)));
  }

  create(data: ProductPayload): Observable<Product> {
    return this.http.post<BackendProduct>(`${this.BASE_PRODUITS}/`, data).pipe(map(p => this.mapProduct(p)));
  }

  update(id: number, data: Partial<ProductPayload>): Observable<Product> {
    return this.http.patch<BackendProduct>(`${this.BASE_PRODUITS}/${id}/`, data).pipe(map(p => this.mapProduct(p)));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_PRODUITS}/${id}/`);
  }

  // ── CRUD Catégories ───────────────────────────────────────────────────────

  listCategories(params: { page_size?: number; is_active?: boolean } = {}): Observable<PaginatedCategories> {
    const q = new URLSearchParams();
    q.set('page_size', String(params.page_size ?? 100));
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    return this.http.get<PaginatedCategories>(`${this.BASE_CATEGORIES}/?${q.toString()}`);
  }

  getCategorie(id: number): Observable<Categorie> {
    return this.http.get<Categorie>(`${this.BASE_CATEGORIES}/${id}/`);
  }

  createCategorie(data: CategoriePayload): Observable<Categorie> {
    return this.http.post<Categorie>(`${this.BASE_CATEGORIES}/`, data);
  }

  updateCategorie(id: number, data: Partial<CategoriePayload>): Observable<Categorie> {
    return this.http.patch<Categorie>(`${this.BASE_CATEGORIES}/${id}/`, data);
  }

  deleteCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_CATEGORIES}/${id}/`);
  }

  // ── CRUD Unités ───────────────────────────────────────────────────────────

  listUnites(params: { page_size?: number; is_active?: boolean } = {}): Observable<PaginatedUnites> {
    const q = new URLSearchParams();
    q.set('page_size', String(params.page_size ?? 100));
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    return this.http.get<PaginatedUnites>(`${this.BASE_UNITES}/?${q.toString()}`);
  }

  getUnite(id: number): Observable<Unite> {
    return this.http.get<Unite>(`${this.BASE_UNITES}/${id}/`);
  }

  createUnite(data: UnitePayload): Observable<Unite> {
    return this.http.post<Unite>(`${this.BASE_UNITES}/`, data);
  }

  updateUnite(id: number, data: Partial<UnitePayload>): Observable<Unite> {
    return this.http.patch<Unite>(`${this.BASE_UNITES}/${id}/`, data);
  }

  deleteUnite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_UNITES}/${id}/`);
  }
}