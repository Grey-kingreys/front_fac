// ============================================================
// LOGISTIQUE — logistics.ts corrigé
// Chemin : src/app/features/logistics/logistics/logistics.ts
// Import correct : logistics.service.ts (avec .service)
// Champs Vehicle corrects : registration, capacity (pas plate_number/capacity_kg)
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

  activeMissions = computed(() =>
    this.missions().filter(m => ['planned', 'loading', 'in_transit'].includes(m.status)).length
  );
  availableVehiclesCount = computed(() =>
    this.vehicles().filter(v => v.status === 'available').length
  );

  actionLoading = signal(false);

  // Véhicule panel
  showVehiclePanel = signal(false);
  isEditingVehicle = signal(false);
  editingVehicleId = signal<number | null>(null);
  vehicleForm: Partial<Vehicle> = { registration: '', brand: '', model: '', year: 2020, capacity: 0 };

  ngOnInit(): void { this.loadMissions(); }

  loadMissions(): void {
    this.loading.set(true);
    const params: { page?: number; status?: MissionStatus } = { page: this.page() };
    if (this.missionStatus()) params.status = this.missionStatus() as MissionStatus;
    this.logisticsService.listMissions(params).subscribe({
      next: (res) => { this.missions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des missions.'); this.loading.set(false); },
    });
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.logisticsService.listVehicles({ page: this.page() }).subscribe({
      next: (res) => { this.vehicles.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des véhicules.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'missions' | 'vehicles'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    if (tab === 'missions') this.loadMissions();
    else this.loadVehicles();
  }

  advanceMission(mission: Mission): void {
    const next = this.getNextStatus(mission.status);
    if (!next) return;
    this.actionLoading.set(true);
    this.logisticsService.updateMissionStatus(mission.id, next).subscribe({
      next: () => { this.toast.success('Statut mis à jour.'); this.loadMissions(); this.actionLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
    });
  }

  openCreateMission(): void { this.toast.info?.('Fonctionnalité en cours de développement.'); }

  openCreateVehicle(): void {
    this.isEditingVehicle.set(false);
    this.editingVehicleId.set(null);
    this.vehicleForm = { registration: '', brand: '', model: '', year: 2020, capacity: 0 };
    this.showVehiclePanel.set(true);
  }

  openEditVehicle(v: Vehicle): void {
    this.isEditingVehicle.set(true);
    this.editingVehicleId.set(v.id);
    this.vehicleForm = { registration: v.registration, brand: v.brand, model: v.model, year: v.year, capacity: v.capacity };
    this.showVehiclePanel.set(true);
  }

  closeVehiclePanel(): void { this.showVehiclePanel.set(false); }

  saveVehicle(): void {
    if (!this.vehicleForm.registration) return;
    this.actionLoading.set(true);
    this.logisticsService.createVehicle(this.vehicleForm).subscribe({
      next: () => {
        this.toast.success('Véhicule ajouté.');
        this.closeVehiclePanel();
        this.loadVehicles();
        this.actionLoading.set(false);
      },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }

  getStatusLabel(s: string): string {
    const m: Record<string, string> = { planned: 'Planifiée', loading: 'Chargement', in_transit: 'En transit', arrived: 'Arrivée', dispute: 'Litige', completed: 'Complétée' };
    return m[s] || s;
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = {
      planned: 'bg-blue-50 text-blue-700 border-blue-200',
      loading: 'bg-amber-50 text-amber-700 border-amber-200',
      in_transit: 'bg-purple-50 text-purple-700 border-purple-200',
      arrived: 'bg-teal-50 text-teal-700 border-teal-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dispute: 'bg-red-50 text-red-700 border-red-200',
    };
    return m[s] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getVehicleStatusClass(s: string): string {
    const m: Record<string, string> = {
      available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      in_mission: 'bg-blue-50 text-blue-700 border-blue-200',
      maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return m[s] || '';
  }

  getVehicleStatusLabel(s: string): string {
    const m: Record<string, string> = { available: 'Disponible', in_mission: 'En mission', maintenance: 'Maintenance' };
    return m[s] || s;
  }

  getNextStatus(s: MissionStatus): MissionStatus | null {
    const m: Partial<Record<MissionStatus, MissionStatus>> = {
      planned: 'loading',
      loading: 'in_transit',
      in_transit: 'arrived',
      arrived: 'completed',
    };
    return m[s] || null;
  }

  getNextStatusLabel(s: MissionStatus): string {
    const m: Partial<Record<MissionStatus, string>> = {
      planned: 'Démarrer',
      loading: 'En transit',
      in_transit: 'Arrivée',
      arrived: 'Compléter',
    };
    return m[s] || '';
  }
}