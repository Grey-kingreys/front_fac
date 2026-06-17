// ============================================================
// LOGISTICS SERVICE — Corrigé pour le backend réel
// Chemin : src/app/core/services/logistics.service.ts
//
// CHANGEMENTS :
//   - Vehicle: registration→immatriculation, capacity→capacite_kg
//     driver_name→chauffeur_nom, year→annee, brand→marque, model→modele
//     status values: 'disponible'|'en_mission'|'maintenance'|'hors_service'
//   - Mission: fields corrects du MissionListSerializer
//     reference (pas id comme label), vehicule_immat, chauffeur_nom,
//     depot_depart_nom, depot_arrivee_nom, statut (pas status)
//     statut values: 'planifiee'|'chargement'|'en_transit'|'arrivee'|'litige'|'terminee'
//   - URLs: /logistics/ → direct /api/
//     listVehicles: /vehicules/, listMissions: /missions/
//     updateMissionStatus: PATCH /missions/{id}/
//     createVehicle: POST /vehicules/
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MissionStatus =
  | 'planifiee'
  | 'chargement'
  | 'en_transit'
  | 'arrivee'
  | 'litige'
  | 'terminee';

export interface Vehicle {
  id: number;
  immatriculation: string;
  type_vehicule: string;
  type_label: string;
  marque: string;
  modele: string;
  annee: number | null;
  capacite_kg: number | null;
  kilometrage_actuel: number;
  statut: 'disponible' | 'en_mission' | 'maintenance' | 'hors_service';
  statut_label: string;
  chauffeur_attitré: number | null;
  chauffeur_nom: string | null;
  has_nfc: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Mission {
  id: number;
  numero: string;
  statut: MissionStatus;
  statut_label: string;
  vehicule: number;
  vehicule_immat: string;
  chauffeur: number;
  chauffeur_nom: string;
  depot_depart: number;
  depot_depart_nom: string;
  depot_arrivee: number;
  depot_arrivee_nom: string;
  date_depart_prevue: string | null;
  date_depart_reelle: string | null;
  date_arrivee_reelle: string | null;
  created_at: string;
}

export interface PaginatedVehicles { count: number; results: Vehicle[]; }
export interface PaginatedMissions { count: number; results: Mission[]; }

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}`;

  listVehicles(params: { page?: number; search?: string } = {}): Observable<PaginatedVehicles> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedVehicles>(`${this.BASE}/vehicules/${qs ? '?' + qs : ''}`);
  }

  createVehicle(data: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.BASE}/vehicules/`, data);
  }

  updateVehicle(id: number, data: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.BASE}/vehicules/${id}/`, data);
  }

  listMissions(params: { page?: number; statut?: MissionStatus; driver_id?: number } = {}): Observable<PaginatedMissions> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.statut) q.set('statut', params.statut);
    if (params.driver_id) q.set('chauffeur', String(params.driver_id));
    const qs = q.toString();
    return this.http.get<PaginatedMissions>(`${this.BASE}/missions/${qs ? '?' + qs : ''}`);
  }

  createMission(data: Partial<Mission>): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/`, data);
  }

  updateMissionStatus(id: number, statut: MissionStatus): Observable<Mission> {
    return this.http.patch<Mission>(`${this.BASE}/missions/${id}/`, { statut });
  }
}