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

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  activeMissions = computed(() => this.missions().filter(m => ['planned', 'loading', 'in_transit'].includes(m.status)).length);
  availableVehiclesCount = computed(() => 
    this.vehicles().filter(v => v.status === 'available').length
  );

  ngOnInit(): void { this.loadMissions(); }

  loadMissions(): void {
    this.loading.set(true);
    this.logisticsService.listMissions({ page: this.page() }).subscribe({
      next: (res) => { this.missions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.logisticsService.listVehicles({ page: this.page() }).subscribe({
      next: (res) => { this.vehicles.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'missions' | 'vehicles'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    if (tab === 'missions') this.loadMissions();
    else this.loadVehicles();
  }

  updateStatus(id: number, status: MissionStatus): void {
    this.logisticsService.updateMissionStatus(id, status).subscribe({
      next: () => { this.toast.success('Statut mis à jour.'); this.loadMissions(); },
      error: () => this.toast.error('Erreur.'),
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.activeTab() === 'missions' ? this.loadMissions() : this.loadVehicles(); } }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { planned: 'Planifiée', loading: 'Chargement', in_transit: 'En transit', arrived: 'Arrivée', dispute: 'Litige', completed: 'Complétée' };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      planned: 'bg-blue-50 text-blue-700 border-blue-200',
      loading: 'bg-amber-50 text-amber-700 border-amber-200',
      in_transit: 'bg-purple-50 text-purple-700 border-purple-200',
      arrived: 'bg-teal-50 text-teal-700 border-teal-200',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dispute: 'bg-red-50 text-red-700 border-red-200',
    };
    return classes[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getVehicleStatusClass(status: string): string {
    return { available: 'bg-emerald-50 text-emerald-700 border-emerald-200', in_mission: 'bg-blue-50 text-blue-700 border-blue-200', maintenance: 'bg-amber-50 text-amber-700 border-amber-200' }[status] || '';
  }

  getVehicleStatusLabel(status: string): string {
    return { available: 'Disponible', in_mission: 'En mission', maintenance: 'Maintenance' }[status] || status;
  }

  getNextStatus(current: MissionStatus): MissionStatus | null {
    const flow: Record<string, MissionStatus> = { planned: 'loading', loading: 'in_transit', in_transit: 'arrived', arrived: 'completed' };
    return flow[current] || null;
  }

  getNextStatusLabel(current: MissionStatus): string {
    const labels: Record<string, string> = { planned: 'Démarrer', loading: 'En transit', in_transit: 'Arrivée', arrived: 'Compléter' };
    return labels[current] || '';
  }
}