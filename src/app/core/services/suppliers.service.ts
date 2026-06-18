// ============================================================
// SUPPLIERS SERVICE — Correction du champ 'code' obligatoire
// Chemin : src/app/core/services/suppliers.service.ts
//
// BUG TROUVÉ : Le modèle Fournisseur a un champ `code` (CharField,
// pas blank=True) → OBLIGATOIRE. Sans lui → 400 Bad Request.
// Le code doit être unique par entreprise (ex: FRN-001).
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Supplier {
  id: number;
  code: string;
  nom: string;
  telephone: string;
  email: string;
  adresse?: string;
  solde_dette: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedSuppliers {
  count: number;
  next: string | null;
  previous: string | null;
  results: Supplier[];
}

export interface SupplierPayload {
  code: string;   // ✅ OBLIGATOIRE — ex: "FRN-001"
  nom: string;    // ✅ OBLIGATOIRE
  telephone?: string;
  email?: string;
  adresse?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/fournisseurs`;

  list(params: { page?: number; page_size?: number; search?: string } = {}): Observable<PaginatedSuppliers> {
    const q = new URLSearchParams();
    if (params.page)      q.set('page', String(params.page));
    if (params.page_size) q.set('page_size', String(params.page_size));
    if (params.search)    q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedSuppliers>(`${this.BASE}/${qs ? '?' + qs : ''}`);
  }

  get(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.BASE}/${id}/`);
  }

  create(data: SupplierPayload): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.BASE}/`, data);
  }

  update(id: number, data: Partial<SupplierPayload>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.BASE}/${id}/`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}/`);
  }
}