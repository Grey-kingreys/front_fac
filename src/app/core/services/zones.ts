import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Zone {
  id: number;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  nombre_depots?: number;
  created_at: string;
}

export interface Depot {
  id: number;
  name: string;
  code: string;
  zone_id: number;
  zone_name: string;
  manager_id: number | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedZones { count: number; results: Zone[]; }
export interface PaginatedDepots { count: number; results: Depot[]; }
export interface ZonePayload { name: string; code: string; latitude?: number | null; longitude?: number | null; }
export interface DepotPayload { name: string; code: string; zone_id: number; manager_id?: number | null; }

@Injectable({ providedIn: 'root' })
export class ZonesService {
  private http = inject(HttpClient);
  private readonly ZONES = `${environment.apiUrl}/zones`;
  private readonly DEPOTS = `${environment.apiUrl}/depots`;

  listZones(params: { page?: number; search?: string } = {}): Observable<PaginatedZones> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedZones>(`${this.ZONES}/${qs ? '?' + qs : ''}`);
  }

  createZone(data: ZonePayload): Observable<Zone> {
    return this.http.post<Zone>(`${this.ZONES}/`, data);
  }

  updateZone(id: number, data: Partial<ZonePayload>): Observable<Zone> {
    return this.http.patch<Zone>(`${this.ZONES}/${id}/`, data);
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ZONES}/${id}/`);
  }

  listDepots(params: { page?: number; search?: string; zone_id?: number } = {}): Observable<PaginatedDepots> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    if (params.zone_id) q.set('zone_id', String(params.zone_id));
    const qs = q.toString();
    return this.http.get<PaginatedDepots>(`${this.DEPOTS}/${qs ? '?' + qs : ''}`);
  }

  createDepot(data: DepotPayload): Observable<Depot> {
    return this.http.post<Depot>(`${this.DEPOTS}/`, data);
  }

  updateDepot(id: number, data: Partial<DepotPayload>): Observable<Depot> {
    return this.http.patch<Depot>(`${this.DEPOTS}/${id}/`, data);
  }

  deleteDepot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.DEPOTS}/${id}/`);
  }
}