// ============================================================
// PRODUCTS SERVICE — Version finale compatible
// Chemin : src/app/core/services/products.ts
//
// Stratégie : garde les anciens champs (name, selling_price, etc.)
// ET ajoute les vrais champs backend (nom, prix_vente, etc.)
// Le service mappe automatiquement backend → interface Angular
// Correction URL: /products/ → /produits/
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: number;
  // Champs utilisés dans les templates existants (products.html, sales.html)
  name: string;
  reference: string;
  description?: string;
  category?: string;
  unit: string;
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
  category?: string;
}

export interface ProductPayload {
  name: string;
  reference: string;
  description?: string;
  category?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  tva_rate?: number;
  is_active?: boolean;
}

// Réponse brute du backend Django (champs en français)
interface BackendProduct {
  id: number;
  nom: string;
  reference: string;
  description?: string;
  categorie_nom?: string;
  unite_symbole?: string;
  prix_achat: number;
  prix_vente: number;
  taux_tva: number;
  seuil_alerte?: number;
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
  private readonly BASE = `${environment.apiUrl}/produits`;

  // Convertit la réponse backend vers l'interface Angular
  private map(p: BackendProduct): Product {
    return {
      id: p.id,
      name: p.nom,
      reference: p.reference,
      description: p.description,
      category: p.categorie_nom,
      unit: p.unite_symbole ?? 'pièce',
      purchase_price: Number(p.prix_achat),
      selling_price: Number(p.prix_vente),
      tva_rate: Number(p.taux_tva),
      is_active: p.is_active,
      created_at: p.created_at,
    };
  }

  // Convertit le payload Angular vers les champs backend Django
  private toBackend(data: Partial<ProductPayload>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (data.name !== undefined) out['nom'] = data.name;
    if (data.reference !== undefined) out['reference'] = data.reference;
    if (data.description !== undefined) out['description'] = data.description;
    if (data.purchase_price !== undefined) out['prix_achat'] = data.purchase_price;
    if (data.selling_price !== undefined) out['prix_vente'] = data.selling_price;
    if (data.tva_rate !== undefined) out['taux_tva'] = data.tva_rate;
    if (data.is_active !== undefined) out['is_active'] = data.is_active;
    return out;
  }

  list(params: ProductListParams = {}): Observable<PaginatedProducts> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search) q.set('search', params.search);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    const qs = q.toString();
    return this.http.get<BackendPaginated>(`${this.BASE}/${qs ? '?' + qs : ''}`)
      .pipe(map(res => ({ ...res, results: res.results.map(p => this.map(p)) })));
  }

  get(id: number): Observable<Product> {
    return this.http.get<BackendProduct>(`${this.BASE}/${id}/`).pipe(map(p => this.map(p)));
  }

  create(data: ProductPayload): Observable<Product> {
    return this.http.post<BackendProduct>(`${this.BASE}/`, this.toBackend(data)).pipe(map(p => this.map(p)));
  }

  update(id: number, data: Partial<ProductPayload>): Observable<Product> {
    return this.http.patch<BackendProduct>(`${this.BASE}/${id}/`, this.toBackend(data)).pipe(map(p => this.map(p)));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}/`);
  }
}