import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MissionStatus = 'planned' | 'loading' | 'in_transit' | 'arrived' | 'dispute' | 'completed';

export interface Vehicle {
  id: number;
  registration: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  driver_id: number | null;
  driver_name: string | null;
  status: 'available' | 'in_mission' | 'maintenance';
  created_at: string;
}

export interface Mission {
  id: number;
  reference: string;
  vehicle_id: number;
  vehicle_registration: string;
  driver_id: number;
  driver_name: string;
  origin_depot_id: number;
  origin_depot_name: string;
  destination_depot_id: number;
  destination_depot_name: string;
  status: MissionStatus;
  qr_code?: string;
  started_at: string | null;
  arrived_at: string | null;
  created_at: string;
}

export interface PaginatedVehicles { count: number; results: Vehicle[]; }
export interface PaginatedMissions { count: number; results: Mission[]; }

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/logistics`;

  listVehicles(params: { page?: number; search?: string } = {}): Observable<PaginatedVehicles> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedVehicles>(`${this.BASE}/vehicles/${qs ? '?' + qs : ''}`);
  }

  createVehicle(data: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.BASE}/vehicles/`, data);
  }

  listMissions(params: { page?: number; status?: MissionStatus; driver_id?: number } = {}): Observable<PaginatedMissions> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.status) q.set('status', params.status);
    if (params.driver_id) q.set('driver_id', String(params.driver_id));
    const qs = q.toString();
    return this.http.get<PaginatedMissions>(`${this.BASE}/missions/${qs ? '?' + qs : ''}`);
  }

  createMission(data: Partial<Mission>): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/`, data);
  }

  updateMissionStatus(id: number, status: MissionStatus): Observable<Mission> {
    return this.http.patch<Mission>(`${this.BASE}/missions/${id}/`, { status });
  }
}