// ============================================================
// LOGISTICS COMPONENT — Version finale corrigée
// Chemin : src/app/features/logistics/logistics/logistics.ts
// ============================================================
import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
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
export class Logistics implements OnInit, AfterViewChecked {
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

  // Référence au <canvas #signatureCanvas> du panneau d'arrivée. Le panneau
  // est rendu conditionnellement (@if), donc le canvas n'existe dans le DOM
  // que pendant que showArriveePanel() est vrai — on le bind une seule fois
  // dès qu'il apparaît, via ngAfterViewChecked (plus fiable qu'un effect ici
  // car l'élément natif change de référence à chaque ouverture du panneau).
  @ViewChild('signatureCanvas') signatureCanvasRef?: ElementRef<HTMLCanvasElement>;
  private boundCanvas: HTMLCanvasElement | null = null;

  ngAfterViewChecked(): void {
    const el = this.signatureCanvasRef?.nativeElement;
    if (el && el !== this.boundCanvas) {
      this.boundCanvas = el;
      this.bindSignatureCanvas(el);
    }
    if (!el) {
      this.boundCanvas = null;
    }
  }

  // ── Avancer le statut — une action dédiée par étape (CDC §3.7/3.8) ──────
  // planifiee → chargement → en_transit → arrivee → terminee
  // L'étape "arrivee" exige une signature HTML5 (obligatoire CDC §10) avant
  // de pouvoir confirmer — voir openArriveePanel().

  advanceMission(mission: Mission): void {
    switch (mission.statut) {
      case 'planifiee':
        this.svc.demarrerChargement(mission.id).subscribe({
          next: () => { this.toast.success('Chargement démarré.'); this.loadMissions(); },
          error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
        });
        break;
      case 'chargement':
        this.svc.demarrerTransit(mission.id).subscribe({
          next: () => { this.toast.success('Mission en transit.'); this.loadMissions(); },
          error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
        });
        break;
      case 'en_transit':
        this.openArriveePanel(mission);
        break;
      case 'arrivee':
        this.svc.terminerMission(mission.id).subscribe({
          next: () => { this.toast.success('Mission terminée.'); this.loadMissions(); },
          error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
        });
        break;
    }
  }

  // ── Signature à l'arrivée (HTML5 canvas) — obligatoire CDC §10 ──────────

  showArriveePanel = signal(false);
  arriveeTarget = signal<Mission | null>(null);
  private isDrawingSignature = false;
  hasSignature = signal(false);

  openArriveePanel(mission: Mission): void {
    this.arriveeTarget.set(mission);
    this.hasSignature.set(false);
    this.showArriveePanel.set(true);
  }
  closeArriveePanel(): void { this.showArriveePanel.set(false); this.arriveeTarget.set(null); this.boundCanvas = null; }

  // Appelé automatiquement par ngAfterViewChecked() dès que le <canvas> apparaît dans le DOM
  private bindSignatureCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const point = 'touches' in e ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    };
    const start = (e: MouseEvent | TouchEvent) => { this.isDrawingSignature = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!this.isDrawingSignature) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y); ctx.stroke();
      this.hasSignature.set(true);
    };
    const end = () => { this.isDrawingSignature = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: true });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }

  clearSignature(): void {
    if (!this.boundCanvas) return;
    const ctx = this.boundCanvas.getContext('2d');
    ctx?.clearRect(0, 0, this.boundCanvas.width, this.boundCanvas.height);
    this.hasSignature.set(false);
  }

  confirmArrivee(): void {
    const mission = this.arriveeTarget();
    if (!mission) return;
    if (!this.hasSignature() || !this.boundCanvas) {
      this.toast.error('La signature de réception est obligatoire.');
      return;
    }
    const signatureBase64 = this.boundCanvas.toDataURL('image/png');
    this.svc.declarerArrivee(mission.id, signatureBase64).subscribe({
      next: () => { this.toast.success('Arrivée confirmée — signature enregistrée.'); this.closeArriveePanel(); this.loadMissions(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la confirmation.')),
    });
  }

  annulerMission(mission: Mission): void {
    this.svc.annulerMission(mission.id).subscribe({
      next: () => { this.toast.success('Mission annulée.'); this.loadMissions(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
    });
  }

  // ── QR Code de la mission (scan pour démarrer le chargement) ────────────

  showQrPanel = signal(false);
  qrTarget = signal<Mission | null>(null);
  qrImageBase64 = signal<string | null>(null);
  qrLoading = signal(false);

  openQrPanel(mission: Mission): void {
    this.qrTarget.set(mission);
    this.qrImageBase64.set(null);
    this.showQrPanel.set(true);
    this.qrLoading.set(true);
    this.svc.getMissionQr(mission.id).subscribe({
      next: (r) => { this.qrImageBase64.set(r.image_base64); this.qrLoading.set(false); },
      error: () => { this.toast.error('Erreur lors de la génération du QR code.'); this.qrLoading.set(false); },
    });
  }
  closeQrPanel(): void { this.showQrPanel.set(false); this.qrTarget.set(null); }

  // Télécharge le QR en PNG (pour impression / collage sur le bon de mission).
  downloadQr(): void {
    const b64 = this.qrImageBase64();
    if (!b64) return;
    const numero = this.qrTarget()?.numero ?? 'mission';
    const a = document.createElement('a');
    a.href = 'data:image/png;base64,' + b64;
    a.download = `QR-${numero}.png`;
    a.click();
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
    const m: Record<string, string> = { planifiee: 'Planifiée', chargement: 'Chargement', en_transit: 'En transit', arrivee: 'Arrivée', litige: 'Litige', terminee: 'Terminée', annulee: 'Annulée' };
    return m[s] || s;
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { planifiee: 'bg-blue-50 text-blue-700 border-blue-200', chargement: 'bg-amber-50 text-amber-700 border-amber-200', en_transit: 'bg-purple-50 text-purple-700 border-purple-200', arrivee: 'bg-teal-50 text-teal-700 border-teal-200', terminee: 'bg-emerald-50 text-emerald-700 border-emerald-200', litige: 'bg-red-50 text-red-700 border-red-200', annulee: 'bg-gray-100 text-gray-500 border-gray-200' };
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