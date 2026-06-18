// ============================================================
// PRODUCTS SERVICE — Version finale avec CRUD Catégories & Unités
// Chemin : src/app/core/services/products.ts
//
// Routes confirmées côté backend :
//   GET/POST   /api/categories/
//   PATCH/DEL  /api/categories/{id}/
//   GET/POST   /api/unites/
//   PATCH/DEL  /api/unites/{id}/
//   GET/POST   /api/produits/
//   PATCH/DEL  /api/produits/{id}/
//
// Champs Catégorie (CategorieSerializer) :
//   writable : name, description, couleur, is_active
//   readonly : id, nombre_produits, created_at
//
// Champs Unité (UniteSerializer) :
//   writable : name, symbole, is_active
//   readonly : id, created_at
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Produit ───────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  reference: string;
  description?: string;
  category?: string;
  category_id?: number;
  unit: string;
  unit_id?: number;
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

export interface ProductPayload {
  nom: string;
  reference: string;
  description?: string;
  categorie: number;    // obligatoire — ID FK
  unite: number;        // obligatoire — ID FK
  prix_achat?: number;
  prix_vente: number;
  tva_taux?: number;
  seuil_alerte?: number;
  is_active?: boolean;
}

// ── Catégorie ─────────────────────────────────────────────────────────────────

export interface Categorie {
  id: number;
  name: string;
  description?: string;
  couleur: string;         // ex: "#6366f1"
  is_active: boolean;
  nombre_produits?: number;
  created_at?: string;
}

export interface PaginatedCategories {
  count: number;
  results: Categorie[];
}

export interface CategoriePayload {
  name: string;
  description?: string;
  couleur?: string;        // défaut: "#6366f1"
  is_active?: boolean;
}

// ── Unité ─────────────────────────────────────────────────────────────────────

export interface Unite {
  id: number;
  name: string;
  symbole: string;         // ex: "kg", "L", "pièce"
  is_active: boolean;
  created_at?: string;
}

export interface PaginatedUnites {
  count: number;
  results: Unite[];
}

export interface UnitePayload {
  name: string;
  symbole: string;
  is_active?: boolean;
}

// ── Réponse brute backend ─────────────────────────────────────────────────────

interface BackendProduct {
  id: number;
  nom: string;
  reference: string;
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

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);

  private readonly BASE_PRODUITS    = `${environment.apiUrl}/produits`;
  private readonly BASE_CATEGORIES  = `${environment.apiUrl}/categories`;
  private readonly BASE_UNITES      = `${environment.apiUrl}/unites`;

  // ── Mapping backend → Angular ─────────────────────────────────────────────

  private mapProduct(p: BackendProduct): Product {
    return {
      id:             p.id,
      name:           p.nom,
      reference:      p.reference,
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

  listCategories(params: { page_size?: number } = {}): Observable<PaginatedCategories> {
    const q = new URLSearchParams();
    q.set('page_size', String(params.page_size ?? 100));
    return this.http.get<PaginatedCategories>(`${this.BASE_CATEGORIES}/?${q.toString()}`);
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

  listUnites(params: { page_size?: number } = {}): Observable<PaginatedUnites> {
    const q = new URLSearchParams();
    q.set('page_size', String(params.page_size ?? 100));
    return this.http.get<PaginatedUnites>(`${this.BASE_UNITES}/?${q.toString()}`);
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