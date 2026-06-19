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
//   POST /api/missions/{id}/chargement/   démarrer chargement
//   POST /api/missions/{id}/transit/      démarrer transit
//   POST /api/missions/{id}/arrivee/      déclarer arrivée (+ signature)
//   POST /api/missions/{id}/terminer/     terminer mission
//   POST /api/missions/{id}/annuler/      annuler mission
//   GET  /api/missions/{id}/qr/           QR code de la mission
//   POST /api/missions/scanner-qr/        scanner un QR pour démarrer
//   GET  /api/missions/{id}/positions/    historique GPS
//   GET  /api/missions/{id}/bon-livraison/ PDF signé
//   GET  /api/users/?role=chauffeur   liste chauffeurs
//   GET  /api/depots/            liste dépôts
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MissionStatus =
  | 'planifiee' | 'chargement' | 'en_transit'
  | 'arrivee'   | 'litige'     | 'terminee'   | 'annulee';

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

  // ── Cycle de vie d'une mission — actions dédiées (pas un PATCH générique) ──
  // Le backend (apps/logistique/views.py) expose une action par étape, chacune
  // avec sa propre logique métier (ex: chargement vérifie les lignes, arrivee
  // demande la signature). Le simple PATCH {statut} n'est pas son contrat.

  demarrerChargement(id: number): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/${id}/chargement/`, {});
  }

  demarrerTransit(id: number): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/${id}/transit/`, {});
  }

  // signatureBase64 : image PNG encodée en base64 capturée depuis un <canvas>
  // (signature HTML5 du chauffeur/réceptionnaire à l'arrivée — obligatoire CDC)
  declarerArrivee(id: number, signatureBase64?: string): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/${id}/arrivee/`, {
      signature_arrivee: signatureBase64 ?? null,
    });
  }

  terminerMission(id: number): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/${id}/terminer/`, {});
  }

  annulerMission(id: number): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/${id}/annuler/`, {});
  }

  // GET /api/missions/{id}/qr/ — image QR encodée en base64 à afficher/imprimer
  getMissionQr(id: number): Observable<{ qr_code_base64: string }> {
    return this.http.get<{ qr_code_base64: string }>(`${this.BASE}/missions/${id}/qr/`);
  }

  // POST /api/missions/scanner-qr/ — le chauffeur scanne le QR pour démarrer
  // automatiquement le chargement (PLANIFIEE → CHARGEMENT)
  scannerQr(qrCode: string): Observable<Mission> {
    return this.http.post<Mission>(`${this.BASE}/missions/scanner-qr/`, { qr_code: qrCode });
  }

  // GET /api/missions/{id}/positions/ — historique GPS de la mission
  getMissionPositions(id: number): Observable<{ latitude: number; longitude: number; vitesse_kmh: number; created_at: string }[]> {
    return this.http.get<{ latitude: number; longitude: number; vitesse_kmh: number; created_at: string }[]>(
      `${this.BASE}/missions/${id}/positions/`
    );
  }

  // GET /api/missions/{id}/bon-livraison/ — PDF signé (reportlab)
  downloadBonLivraison(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/missions/${id}/bon-livraison/`, { responseType: 'blob' });
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