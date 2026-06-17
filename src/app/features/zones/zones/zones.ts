import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZonesService, Zone, Depot, ZonePayload, DepotPayload } from '../../../core/services/zones';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Zones implements OnInit {
  private zonesService = inject(ZonesService);
  private toast = inject(ToastService);

  // ── Tabs ────────────────────────────────────────────────────────────────
  activeTab = signal<'zones' | 'depots'>('zones');

  // ── Zones ────────────────────────────────────────────────────────────────
  zones      = signal<Zone[]>([]);
  zonesTotal = signal(0);
  zonesPage  = signal(1);
  zonesLoading = signal(false);
  zonesSearch  = '';

  // ── Dépôts ───────────────────────────────────────────────────────────────
  depots      = signal<Depot[]>([]);
  depotsTotal = signal(0);
  depotsPage  = signal(1);
  depotsLoading = signal(false);
  depotsSearch  = '';
  depotsZoneFilter = '';

  // ── Panel commun ─────────────────────────────────────────────────────────
  showPanel    = signal(false);
  isEditing    = signal(false);
  editingId    = signal<number | null>(null);
  panelType    = signal<'zone' | 'depot'>('zone');
  panelLoading = signal(false);

  zoneForm: ZonePayload = { name: '', code: '', latitude: null, longitude: null };
  depotForm: DepotPayload = { name: '', code: '', zone_id: 0, manager_id: null };

  // ── Confirm delete ────────────────────────────────────────────────────────
  deleteTarget = signal<{ type: 'zone' | 'depot'; id: number; name: string } | null>(null);
  deleteLoading = signal(false);

  readonly PAGE_SIZE = 20;
  readonly totalZonePages = computed(() => Math.max(1, Math.ceil(this.zonesTotal() / this.PAGE_SIZE)));
  readonly totalDepotPages = computed(() => Math.max(1, Math.ceil(this.depotsTotal() / this.PAGE_SIZE)));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadZones();
    this.loadDepots();
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  loadZones(): void {
    this.zonesLoading.set(true);
    this.zonesService.listZones({ page: this.zonesPage(), search: this.zonesSearch || undefined }).subscribe({
      next: (res) => { this.zones.set(res.results); this.zonesTotal.set(res.count); this.zonesLoading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des zones.'); this.zonesLoading.set(false); },
    });
  }

  loadDepots(): void {
    this.depotsLoading.set(true);
    this.zonesService.listDepots({
      page: this.depotsPage(),
      search: this.depotsSearch || undefined,
      zone_id: this.depotsZoneFilter ? Number(this.depotsZoneFilter) : undefined,
    }).subscribe({
      next: (res) => { this.depots.set(res.results); this.depotsTotal.set(res.count); this.depotsLoading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des dépôts.'); this.depotsLoading.set(false); },
    });
  }

  onSearchChange(type: 'zones' | 'depots'): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (type === 'zones') { this.zonesPage.set(1); this.loadZones(); }
      else { this.depotsPage.set(1); this.loadDepots(); }
    }, 400);
  }

  // ── Panel Zone ────────────────────────────────────────────────────────────
  openCreateZone(): void {
    this.panelType.set('zone');
    this.isEditing.set(false);
    this.editingId.set(null);
    this.zoneForm = { name: '', code: '', latitude: null, longitude: null };
    this.showPanel.set(true);
  }

  openEditZone(zone: Zone): void {
    this.panelType.set('zone');
    this.isEditing.set(true);
    this.editingId.set(zone.id);
    this.zoneForm = { name: zone.name, code: zone.code, latitude: zone.latitude, longitude: zone.longitude };
    this.showPanel.set(true);
  }

  // ── Panel Dépôt ────────────────────────────────────────────────────────────
  openCreateDepot(): void {
    this.panelType.set('depot');
    this.isEditing.set(false);
    this.editingId.set(null);
    this.depotForm = { name: '', code: '', zone_id: 0, manager_id: null };
    this.showPanel.set(true);
  }

  openEditDepot(depot: Depot): void {
    this.panelType.set('depot');
    this.isEditing.set(true);
    this.editingId.set(depot.id);
    this.depotForm = { name: depot.name, code: depot.code, zone_id: depot.zone_id, manager_id: depot.manager_id };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSaveZone(): boolean { return !!this.zoneForm.name.trim() && !!this.zoneForm.code.trim(); }
  canSaveDepot(): boolean { return !!this.depotForm.name.trim() && !!this.depotForm.code.trim() && !!this.depotForm.zone_id; }

  save(): void {
    if (this.panelType() === 'zone') this.saveZone();
    else this.saveDepot();
  }

  private saveZone(): void {
    if (!this.canSaveZone()) return;
    this.panelLoading.set(true);
    const obs = this.isEditing()
      ? this.zonesService.updateZone(this.editingId()!, this.zoneForm)
      : this.zonesService.createZone(this.zoneForm);
    obs.subscribe({
      next: () => { this.toast.success(`Zone ${this.isEditing() ? 'mise à jour' : 'créée'}.`); this.closePanel(); this.loadZones(); this.panelLoading.set(false); },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.panelLoading.set(false); },
    });
  }

  private saveDepot(): void {
    if (!this.canSaveDepot()) return;
    this.panelLoading.set(true);
    const obs = this.isEditing()
      ? this.zonesService.updateDepot(this.editingId()!, this.depotForm)
      : this.zonesService.createDepot(this.depotForm);
    obs.subscribe({
      next: () => { this.toast.success(`Dépôt ${this.isEditing() ? 'mis à jour' : 'créé'}.`); this.closePanel(); this.loadDepots(); this.panelLoading.set(false); },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.panelLoading.set(false); },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  openDelete(type: 'zone' | 'depot', id: number, name: string): void {
    this.deleteTarget.set({ type, id, name });
  }

  closeDelete(): void { this.deleteTarget.set(null); }

  executeDelete(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.deleteLoading.set(true);
    const obs = t.type === 'zone'
      ? this.zonesService.deleteZone(t.id)
      : this.zonesService.deleteDepot(t.id);
    obs.subscribe({
      next: () => {
        this.toast.success(`${t.type === 'zone' ? 'Zone' : 'Dépôt'} supprimé(e).`);
        this.closeDelete();
        if (t.type === 'zone') this.loadZones();
        else this.loadDepots();
        this.deleteLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la suppression.')); this.deleteLoading.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  extractError(err: unknown, fallback: string): string {
    const e = (err as { error?: unknown })?.error;
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    const vals = Object.values(e as Record<string, unknown>);
    if (!vals.length) return fallback;
    const first = vals[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === 'string') return first;
    return fallback;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}