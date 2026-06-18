// ============================================================
// LOGISTICS COMPONENT — Version finale corrigée
// Chemin : src/app/features/logistics/logistics/logistics.ts
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LogisticsService,
  Mission, MissionStatus, MissionCreatePayload,
  Vehicle, VehiclePayload,
  Chauffeur, Depot,
} from '../../../core/services/logistics.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics.html',
})
export class Logistics implements OnInit {
  private svc   = inject(LogisticsService);
  private toast = inject(ToastService);

  activeTab = signal<'missions' | 'vehicles'>('missions');

  missions = signal<Mission[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loading  = signal(false);
  total    = signal(0);
  page     = signal(1);
  readonly PAGE_SIZE = 20;

  chauffeurs = signal<Chauffeur[]>([]);
  depots     = signal<Depot[]>([]);

  missionStatusFilter = signal<MissionStatus | ''>('');

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());

  activeMissions = computed(() =>
    this.missions().filter(m => ['planifiee', 'chargement', 'en_transit'].includes(m.statut)).length
  );
  availableVehiclesCount = computed(() =>
    this.vehicles().filter(v => v.statut === 'disponible').length
  );

  // Panneau mission
  showMissionPanel    = signal(false);
  missionPanelLoading = signal(false);

  missionForm: MissionCreatePayload = {
    vehicule: 0, chauffeur: 0,
    depot_depart: 0, depot_arrivee: 0,
    date_depart_prevue: '', notes: '',
  };

  // Panneau véhicule
  showVehiclePanel    = signal(false);
  isEditingVehicle    = signal(false);
  editingVehicleId    = signal<number | null>(null);
  vehiclePanelLoading = signal(false);

  vehicleForm: VehiclePayload = {
    immatriculation: '', type_vehicule: 'camion',
    marque: '', modele: '', annee: new Date().getFullYear(), capacite_kg: 0,
  };

  readonly STATUS_FILTERS: { value: MissionStatus | ''; label: string }[] = [
    { value: '',           label: 'Tous' },
    { value: 'planifiee',  label: 'Planifiées' },
    { value: 'chargement', label: 'Chargement' },
    { value: 'en_transit', label: 'En transit' },
    { value: 'arrivee',    label: 'Arrivées' },
    { value: 'terminee',   label: 'Terminées' },
    { value: 'litige',     label: 'Litige' },
  ];

  readonly vehicleTypes = [
    { value: 'camion',      label: 'Camion' },
    { value: 'camionnette', label: 'Camionnette' },
    { value: 'moto',        label: 'Moto' },
    { value: 'voiture',     label: 'Voiture' },
    { value: 'remorque',    label: 'Remorque' },
    { value: 'autre',       label: 'Autre' },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadMissions();
    this.svc.listChauffeurs().subscribe({ next: (r) => this.chauffeurs.set(r.results), error: () => {} });
    this.svc.listDepots().subscribe({ next: (r) => this.depots.set(r.results), error: () => {} });
  }

  // ── Missions ──────────────────────────────────────────────────────────────

  loadMissions(): void {
    this.loading.set(true);
    const params: { page: number; statut?: MissionStatus } = { page: this.page() };
    if (this.missionStatusFilter()) params.statut = this.missionStatusFilter() as MissionStatus;
    this.svc.listMissions(params).subscribe({
      next: (res) => { this.missions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement missions.'); this.loading.set(false); },
    });
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.svc.listVehicles({ page: this.page() }).subscribe({
      next: (res) => { this.vehicles.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement véhicules.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'missions' | 'vehicles'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    tab === 'missions' ? this.loadMissions() : this.loadVehicles();
  }

  filterByStatus(s: MissionStatus | ''): void {
    this.missionStatusFilter.set(s);
    this.page.set(1);
    this.loadMissions();
  }

  // ── Créer une mission ─────────────────────────────────────────────────────

  openCreateMission(): void {
    this.missionForm = {
      vehicule: 0, chauffeur: 0,
      depot_depart: 0, depot_arrivee: 0,
      date_depart_prevue: '', notes: '',
    };
    this.showMissionPanel.set(true);
  }

  closeMissionPanel(): void { this.showMissionPanel.set(false); }

  canSaveMission(): boolean {
    return !!(
      this.missionForm.vehicule > 0 &&
      this.missionForm.chauffeur > 0 &&
      this.missionForm.depot_depart > 0 &&
      this.missionForm.depot_arrivee > 0 &&
      this.missionForm.depot_depart !== this.missionForm.depot_arrivee
    );
  }

  saveMission(): void {
    if (!this.canSaveMission()) return;
    this.missionPanelLoading.set(true);
    const payload: MissionCreatePayload = {
      vehicule:      this.missionForm.vehicule,
      chauffeur:     this.missionForm.chauffeur,
      depot_depart:  this.missionForm.depot_depart,
      depot_arrivee: this.missionForm.depot_arrivee,
    };
    if (this.missionForm.date_depart_prevue) payload.date_depart_prevue = this.missionForm.date_depart_prevue;
    if (this.missionForm.notes?.trim()) payload.notes = this.missionForm.notes;

    this.svc.createMission(payload).subscribe({
      next: (m) => {
        this.toast.success(`Mission ${m.numero} créée !`);
        this.closeMissionPanel();
        this.loadMissions();
        this.missionPanelLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Erreur lors de la création.'));
        this.missionPanelLoading.set(false);
      },
    });
  }

  // ── Avancer le statut ─────────────────────────────────────────────────────

  advanceMission(mission: Mission): void {
    const next = this.getNextStatus(mission.statut);
    if (!next) return;
    this.svc.updateMissionStatus(mission.id, next).subscribe({
      next: () => { this.toast.success('Statut mis à jour.'); this.loadMissions(); },
      error: () => this.toast.error('Erreur.'),
    });
  }

  // ── Véhicules ─────────────────────────────────────────────────────────────

  openCreateVehicle(): void {
    this.isEditingVehicle.set(false);
    this.editingVehicleId.set(null);
    this.vehicleForm = { immatriculation: '', type_vehicule: 'camion', marque: '', modele: '', annee: new Date().getFullYear(), capacite_kg: 0 };
    this.showVehiclePanel.set(true);
  }

  openEditVehicle(v: Vehicle): void {
    this.isEditingVehicle.set(true);
    this.editingVehicleId.set(v.id);
    this.vehicleForm = { immatriculation: v.immatriculation, type_vehicule: v.type_vehicule, marque: v.marque, modele: v.modele, annee: v.annee ?? new Date().getFullYear(), capacite_kg: v.capacite_kg ?? 0 };
    this.showVehiclePanel.set(true);
  }

  closeVehiclePanel(): void { this.showVehiclePanel.set(false); }

  saveVehicle(): void {
    if (!this.vehicleForm.immatriculation?.trim()) return;
    this.vehiclePanelLoading.set(true);
    const obs = this.isEditingVehicle()
      ? this.svc.updateVehicle(this.editingVehicleId()!, this.vehicleForm)
      : this.svc.createVehicle(this.vehicleForm);
    obs.subscribe({
      next: () => {
        this.toast.success(this.isEditingVehicle() ? 'Véhicule mis à jour.' : 'Véhicule ajouté.');
        this.closeVehiclePanel(); this.loadVehicles(); this.vehiclePanelLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.vehiclePanelLoading.set(false); },
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  prevPage(): void {
    if (this.hasPrev()) {
      this.page.update(p => p - 1);
      this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles();
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.page.update(p => p + 1);
      this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles();
    }
  }

  // ── Labels / classes ──────────────────────────────────────────────────────

  getStatusLabel(s: string): string {
    const m: Record<string, string> = { planifiee: 'Planifiée', chargement: 'Chargement', en_transit: 'En transit', arrivee: 'Arrivée', litige: 'Litige', terminee: 'Terminée' };
    return m[s] || s;
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { planifiee: 'bg-blue-50 text-blue-700 border-blue-200', chargement: 'bg-amber-50 text-amber-700 border-amber-200', en_transit: 'bg-purple-50 text-purple-700 border-purple-200', arrivee: 'bg-teal-50 text-teal-700 border-teal-200', terminee: 'bg-emerald-50 text-emerald-700 border-emerald-200', litige: 'bg-red-50 text-red-700 border-red-200' };
    return m[s] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getVehicleStatusLabel(s: string): string {
    const m: Record<string, string> = { disponible: 'Disponible', en_mission: 'En mission', maintenance: 'Maintenance', hors_service: 'Hors service' };
    return m[s] || s;
  }

  getVehicleStatusClass(s: string): string {
    const m: Record<string, string> = { disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200', en_mission: 'bg-blue-50 text-blue-700 border-blue-200', maintenance: 'bg-amber-50 text-amber-700 border-amber-200', hors_service: 'bg-red-50 text-red-700 border-red-200' };
    return m[s] || '';
  }

  getNextStatus(s: MissionStatus): MissionStatus | null {
    const m: Partial<Record<MissionStatus, MissionStatus>> = { planifiee: 'chargement', chargement: 'en_transit', en_transit: 'arrivee', arrivee: 'terminee' };
    return m[s] ?? null;
  }

  getNextStatusLabel(s: MissionStatus): string {
    const m: Partial<Record<MissionStatus, string>> = { planifiee: 'Démarrer', chargement: 'En transit', en_transit: 'Arrivée', arrivee: 'Terminer' };
    return m[s] || '';
  }

  getChauffeurName(c: Chauffeur): string {
    return `${c.first_name} ${c.last_name}`.trim() || c.email;
  }

  getDepotName(id: number): string {
    return this.depots().find(d => d.id === id)?.name ?? '—';
  }

  getVehicleLabel(id: number): string {
    const v = this.vehicles().find(v => v.id === id);
    return v ? `${v.immatriculation} — ${v.marque} ${v.modele}` : '—';
  }

  extractError(err: unknown, fallback: string): string {
    const e = (err as { error?: unknown })?.error;
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    const vals = Object.values(e as Record<string, unknown>);
    const first = vals[0];
    if (Array.isArray(first) && first.length) return String((first as unknown[])[0]);
    return fallback;
  }
}