// ============================================================
// LOGISTICS COMPONENT — Mis à jour pour les vrais champs backend
// Chemin : src/app/features/logistics/logistics/logistics.ts
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogisticsService, Mission, MissionStatus, Vehicle } from '../../../core/services/logistics.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics.html',
})
export class Logistics implements OnInit {
  private logisticsService = inject(LogisticsService);
  private toast = inject(ToastService);

  activeTab = signal<'missions' | 'vehicles'>('missions');
  missions = signal<Mission[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  readonly PAGE_SIZE = 20;
  missionStatus = signal<MissionStatus | ''>('');

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  // Vrais statuts backend : 'planifiee'|'chargement'|'en_transit'|'arrivee'|'litige'|'terminee'
  activeMissions = computed(() =>
    this.missions().filter(m => ['planifiee', 'chargement', 'en_transit'].includes(m.statut)).length
  );
  availableVehiclesCount = computed(() =>
    this.vehicles().filter(v => v.statut === 'disponible').length
  );

  actionLoading = signal(false);
  showVehiclePanel = signal(false);
  isEditingVehicle = signal(false);
  editingVehicleId = signal<number | null>(null);
  vehicleForm: Partial<Vehicle> = { immatriculation: '', marque: '', modele: '', annee: 2020, capacite_kg: 0 };

  ngOnInit(): void { this.loadMissions(); }

  loadMissions(): void {
    this.loading.set(true);
    const params: { page: number; statut?: MissionStatus } = { page: this.page() };
    if (this.missionStatus()) params.statut = this.missionStatus() as MissionStatus;
    this.logisticsService.listMissions(params).subscribe({
      next: (res) => { this.missions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.logisticsService.listVehicles({ page: this.page() }).subscribe({
      next: (res) => { this.vehicles.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'missions' | 'vehicles'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    tab === 'missions' ? this.loadMissions() : this.loadVehicles();
  }

  advanceMission(mission: Mission): void {
    const next = this.getNextStatus(mission.statut);
    if (!next) return;
    this.actionLoading.set(true);
    this.logisticsService.updateMissionStatus(mission.id, next).subscribe({
      next: () => { this.toast.success('Statut mis à jour.'); this.loadMissions(); this.actionLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
    });
  }

  openCreateMission(): void { this.toast.info?.('Création de mission en cours de développement.'); }

  openCreateVehicle(): void {
    this.isEditingVehicle.set(false);
    this.editingVehicleId.set(null);
    this.vehicleForm = { immatriculation: '', marque: '', modele: '', annee: 2020, capacite_kg: 0 };
    this.showVehiclePanel.set(true);
  }

  openEditVehicle(v: Vehicle): void {
    this.isEditingVehicle.set(true);
    this.editingVehicleId.set(v.id);
    this.vehicleForm = { immatriculation: v.immatriculation, marque: v.marque, modele: v.modele, annee: v.annee, capacite_kg: v.capacite_kg };
    this.showVehiclePanel.set(true);
  }

  closeVehiclePanel(): void { this.showVehiclePanel.set(false); }

  saveVehicle(): void {
    if (!this.vehicleForm.immatriculation) return;
    this.actionLoading.set(true);
    const obs = this.isEditingVehicle()
      ? this.logisticsService.updateVehicle(this.editingVehicleId()!, this.vehicleForm)
      : this.logisticsService.createVehicle(this.vehicleForm);
    obs.subscribe({
      next: () => { this.toast.success(this.isEditingVehicle() ? 'Véhicule mis à jour.' : 'Véhicule ajouté.'); this.closeVehiclePanel(); this.loadVehicles(); this.actionLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }

  // Vrais statuts backend
  getStatusLabel(s: string): string {
    return { planifiee: 'Planifiée', chargement: 'Chargement', en_transit: 'En transit', arrivee: 'Arrivée', litige: 'Litige', terminee: 'Terminée' }[s] || s;
  }

  getStatusClass(s: string): string {
    return {
      planifiee: 'bg-blue-50 text-blue-700 border-blue-200',
      chargement: 'bg-amber-50 text-amber-700 border-amber-200',
      en_transit: 'bg-purple-50 text-purple-700 border-purple-200',
      arrivee: 'bg-teal-50 text-teal-700 border-teal-200',
      terminee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      litige: 'bg-red-50 text-red-700 border-red-200',
    }[s] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getVehicleStatusClass(s: string): string {
    return { disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200', en_mission: 'bg-blue-50 text-blue-700 border-blue-200', maintenance: 'bg-amber-50 text-amber-700 border-amber-200', hors_service: 'bg-red-50 text-red-700 border-red-200' }[s] || '';
  }

  getVehicleStatusLabel(s: string): string {
    return { disponible: 'Disponible', en_mission: 'En mission', maintenance: 'Maintenance', hors_service: 'Hors service' }[s] || s;
  }

  getNextStatus(s: MissionStatus): MissionStatus | null {
    return ({ planifiee: 'chargement', chargement: 'en_transit', en_transit: 'arrivee', arrivee: 'terminee' } as Partial<Record<MissionStatus, MissionStatus>>)[s] || null;
  }

  getNextStatusLabel(s: MissionStatus): string {
    return ({ planifiee: 'Démarrer', chargement: 'En transit', en_transit: 'Arrivée', arrivee: 'Terminer' } as Partial<Record<MissionStatus, string>>)[s] || '';
  }
}