// ============================================================
// LOGISTICS SERVICE — Version finale avec createMission complet
// Chemin : src/app/core/services/logistics.service.ts
//
// MissionCreateSerializer (backend) attend :
//   vehicule          : number (ID)
//   chauffeur         : number (ID user avec role=chauffeur)
//   depot_depart      : number (ID depot)
//   depot_arrivee     : number (ID depot)
//   date_depart_prevue: string ISO (optionnel)
//   notes             : string (optionnel)
//   lignes            : [{ produit: number, quantite: number }] (optionnel)
//
// Routes utilisées :
//   GET  /api/vehicules/         liste véhicules
//   POST /api/vehicules/         créer véhicule
//   GET  /api/missions/          liste missions
//   POST /api/missions/          créer mission
//   PATCH /api/missions/{id}/    avancer statut
//   GET  /api/users/?role=chauffeur   liste chauffeurs
//   GET  /api/depots/            liste dépôts
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MissionStatus =
  | 'planifiee' | 'chargement' | 'en_transit'
  | 'arrivee'   | 'litige'     | 'terminee';

// ── Véhicule ─────────────────────────────────────────────────────────────────

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

export interface VehiclePayload {
  immatriculation: string;
  type_vehicule?: string;
  marque?: string;
  modele?: string;
  annee?: number;
  capacite_kg?: number;
}

// ── Mission ───────────────────────────────────────────────────────────────────

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

export interface LigneMissionInput {
  produit: number;
  quantite: number;
}

export interface MissionCreatePayload {
  vehicule: number;
  chauffeur: number;
  depot_depart: number;
  depot_arrivee: number;
  date_depart_prevue?: string;   // ISO datetime ex: "2026-06-20T08:00:00"
  notes?: string;
  lignes?: LigneMissionInput[];  // optionnel
}

export interface PaginatedVehicles { count: number; results: Vehicle[]; }
export interface PaginatedMissions { count: number; results: Mission[]; }

// ── Chauffeur (user avec role=chauffeur) ──────────────────────────────────────

export interface Chauffeur {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  depot_id: number | null;
  depot_name: string | null;
  is_active: boolean;
}

export interface PaginatedChauffeurs {
  count: number;
  results: Chauffeur[];
}

// ── Dépôt ─────────────────────────────────────────────────────────────────────

export interface Depot {
  id: number;
  name: string;
  code: string;
  zone_name: string;
}

export interface PaginatedDepots {
  count: number;
  results: Depot[];
}

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}`;

  // ── Véhicules ─────────────────────────────────────────────────────────────

  listVehicles(params: { page?: number; search?: string } = {}): Observable<PaginatedVehicles> {
    const q = new URLSearchParams();
    if (params.page)   q.set('page', String(params.page));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return this.http.get<PaginatedVehicles>(`${this.BASE}/vehicules/${qs ? '?' + qs : ''}`);
  }

  createVehicle(data: VehiclePayload): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.BASE}/vehicules/`, data);
  }

  updateVehicle(id: number, data: Partial<VehiclePayload>): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.BASE}/vehicules/${id}/`, data);
  }

  // ── Missions ──────────────────────────────────────────────────────────────

  listMissions(params: { page?: number; statut?: MissionStatus; chauffeur?: number } = {}): Observable<PaginatedMissions> {
    const q = new URLSearchParams();
    if (params.page)     q.set('page', String(params.page));
    if (params.statut)   q.set('statut', params.statut);
    if (params.chauffeur) q.set('chauffeur', String(params.chauffeur));
    const qs = q.toString();
    return this.http.get<PaginatedMissions>(`${this.BASE}/missions/${qs ? '?' + qs : ''}`);
  }

  createMission(data: MissionCreatePayload): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/`, data);
  }

  updateMissionStatus(id: number, statut: MissionStatus): Observable<Mission> {
    return this.http.patch<Mission>(`${this.BASE}/missions/${id}/`, { statut });
  }

  // ── Chauffeurs (users avec role=chauffeur) ────────────────────────────────
  // GET /api/users/?role=chauffeur

  listChauffeurs(): Observable<PaginatedChauffeurs> {
    return this.http.get<PaginatedChauffeurs>(`${this.BASE}/users/?role=chauffeur&page_size=100`);
  }

  // ── Dépôts ────────────────────────────────────────────────────────────────
  // GET /api/depots/

  listDepots(): Observable<PaginatedDepots> {
    return this.http.get<PaginatedDepots>(`${this.BASE}/depots/?page_size=100`);
  }
}