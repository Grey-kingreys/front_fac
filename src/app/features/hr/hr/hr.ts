// ============================================================
// RH COMPONENT — Aligné sur le RH mobile (mobile_fac)
// Chemin : src/app/features/hr/hr/hr.ts
//
// 3 onglets, miroir exact de l'app mobile :
//   • Utilisateurs → /api/users/      (gestion des comptes système)
//   • Présences    → /api/presences/
//   • Congés       → /api/conges/
//
// L'ancien espace « Utilisateurs » (/admin) est supprimé : sa
// gestion des comptes est désormais intégrée ici, comme sur mobile.
// /api/employes/ n'est plus géré en tant qu'écran : il sert
// uniquement à alimenter le sélecteur d'employé des présences/congés
// (parité avec mobile, où EmployeesScreen = /users/).
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';
import {
  DepotOption,
  PasswordResetPayload,
  UserCreatePayload,
  UserListParams,
  UserSummary,
  UserUpdatePayload,
  UsersService,
} from '../../../core/services/users';

// ── Constantes rôles (reprises de l'ancien espace Utilisateurs) ────────────────

const ROLE_LABELS: Record<string, string> = {
  superadmin:         'Super Admin',
  admin:              'Administrateur',
  superviseur:        'Superviseur',
  gestionnaire_stock: 'Gestionnaire Stock',
  caissier:           'Caissier',
  chauffeur:          'Chauffeur',
  maintenancier:      'Maintenancier',
  commercial:         'Commercial',
};

const ROLE_BADGE: Record<string, string> = {
  superadmin:         'bg-amber-50 text-amber-700 border-amber-200',
  admin:              'bg-blue-50 text-blue-700 border-blue-200',
  superviseur:        'bg-purple-50 text-purple-700 border-purple-200',
  gestionnaire_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  caissier:           'bg-green-50 text-green-700 border-green-200',
  chauffeur:          'bg-orange-50 text-orange-700 border-orange-200',
  maintenancier:      'bg-slate-100 text-slate-600 border-slate-200',
  commercial:         'bg-teal-50 text-teal-700 border-teal-200',
};

const ASSIGNABLE_ROLES = [
  { value: 'admin',              label: 'Administrateur' },
  { value: 'superviseur',        label: 'Superviseur' },
  { value: 'gestionnaire_stock', label: 'Gestionnaire Stock' },
  { value: 'caissier',           label: 'Caissier' },
  { value: 'chauffeur',          label: 'Chauffeur' },
  { value: 'commercial',         label: 'Commercial' },
  { value: 'maintenancier',      label: 'Maintenancier' },
];

// ── Interfaces RH ──────────────────────────────────────────────────────────────

interface EmployeeOption {
  id: number;
  nom_complet: string;
}

interface ZoneOption {
  id: number;
  name: string;
}

interface Presence {
  id: number;
  employe: number;
  employe_nom: string;
  depot_nom?: string | null;
  date: string;
  type_presence: 'present' | 'absent' | 'retard' | 'mission';
  type_label: string;
  heure_arrivee?: string | null;
  heure_depart?: string | null;
  observations?: string | null;
  distance_m?: number | null;
  dans_perimetre?: boolean | null;
  reference_geo?: string | null;
  reference_geo_label?: string | null;
}

interface PresenceTodayStatus {
  a_fiche_employe: boolean;
  deja_pointe: boolean;
  presence: Presence | null;
}

interface RecapAbsent {
  employe: number;
  employe_nom: string;
  matricule: string;
  depot_nom: string | null;
}

interface RecapDay {
  date: string;
  effectif: number;
  nb_presents: number;
  nb_absents: number;
  absents: RecapAbsent[];
}

interface Leave {
  id: number;
  employe: number;
  employe_nom: string;
  depot_nom?: string | null;
  type_conge: string;
  type_label: string;
  date_debut: string;
  date_fin: string;
  nb_jours: number;
  statut: 'en_attente' | 'approuve' | 'refuse';
  statut_label: string;
  motif?: string;
  demande_par_nom?: string | null;
  approuve_par_nom?: string | null;
  motif_traitement?: string | null;
}

type Tab = 'users' | 'presences' | 'leaves';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr.html',
})
export class Hr implements OnInit {
  private http         = inject(HttpClient);
  private toast        = inject(ToastService);
  private usersService = inject(UsersService);
  private auth         = inject(AuthService);

  private readonly BASE_EMPLOYES  = `${environment.apiUrl}/employes`;
  private readonly BASE_PRESENCES = `${environment.apiUrl}/presences`;
  private readonly BASE_CONGES    = `${environment.apiUrl}/conges`;
  private readonly BASE_ZONES     = `${environment.apiUrl}/zones`;

  readonly roles = ASSIGNABLE_ROLES;
  readonly PAGE_SIZE = 25;

  activeTab = signal<Tab>('users');

  // ── Pagination commune ──────────────────────────────────────────────────────
  total   = signal(0);
  page    = signal(1);
  loading = signal(false);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());

  // ── Gating par rôle (aligné mobile) ─────────────────────────────────────────
  private role = computed(() => this.auth.currentUser()?.role ?? '');
  /** Seul l'admin gère les comptes utilisateurs (création/édition/suppression). */
  canManageUsers   = computed(() => this.role() === 'admin');
  /** Admin + superviseur valident les congés et voient le récap présences/absences. */
  canManageLeaves  = computed(() => ['admin', 'superviseur'].includes(this.role()));
  /** Le self-service (pointer, demander un congé) est ouvert à tout employé connecté. */
  isStaff = computed(() => !!this.role() && this.role() !== 'superadmin');

  // ── Self-service présence (pointage géolocalisé) ────────────────────────────
  myPresence = signal<PresenceTodayStatus | null>(null);
  pointing   = signal(false);

  // ── Récap du jour (présents / absents) — admin & superviseur ────────────────
  recap        = signal<RecapDay | null>(null);
  showAbsents  = signal(false);

  // ════════════════════════════════════════════════════════════════════════════
  // ONGLET UTILISATEURS (/users/)
  // ════════════════════════════════════════════════════════════════════════════
  users  = signal<UserSummary[]>([]);
  depots = signal<DepotOption[]>([]);
  zones  = signal<ZoneOption[]>([]);

  search       = '';
  roleFilter   = '';
  statusFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showUserPanel = signal(false);
  isEditingUser = signal(false);
  editingUserId = signal<number | null>(null);
  userPanelLoading = signal(false);

  userForm = {
    email: '', first_name: '', last_name: '', phone: '',
    role: '', depot_id: '', zone_id: '', password: '', is_active: true,
  };

  /** Un superviseur est rattaché à une ZONE (pas un dépôt) — règle backend. */
  get isSuperviseurRole(): boolean { return this.userForm.role === 'superviseur'; }

  confirmType    = signal<'deactivate' | 'reactivate' | 'reset' | 'delete' | null>(null);
  confirmUser    = signal<UserSummary | null>(null);
  confirmLoading = signal(false);
  newPassword        = '';
  newPasswordConfirm = '';

  activeUsersCount = computed(() => this.users().filter(u => u.is_active).length);

  // ════════════════════════════════════════════════════════════════════════════
  // ONGLET PRÉSENCES (/presences/)
  // ════════════════════════════════════════════════════════════════════════════
  presences = signal<Presence[]>([]);

  // ════════════════════════════════════════════════════════════════════════════
  // ONGLET CONGÉS (/conges/)
  // ════════════════════════════════════════════════════════════════════════════
  leaves = signal<Leave[]>([]);
  leaveStatutFilter = signal<'' | 'en_attente' | 'approuve' | 'refuse'>('');

  readonly leaveFilters: { value: '' | 'en_attente' | 'approuve' | 'refuse'; label: string }[] = [
    { value: '',           label: 'Tous' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'approuve',   label: 'Approuvés' },
    { value: 'refuse',     label: 'Refusés' },
  ];

  showLeavePanel = signal(false);
  leaveLoading   = signal(false);
  leaveForm: {
    employe: number;
    type_conge: string;
    date_debut: string;
    date_fin: string;
    motif: string;
  } = { employe: 0, type_conge: 'conge_annuel', date_debut: '', date_fin: '', motif: '' };

  readonly leaveTypes = [
    { value: 'conge_annuel', label: 'Congé annuel' },
    { value: 'maladie',      label: 'Maladie' },
    { value: 'maternite',    label: 'Maternité' },
    { value: 'sans_solde',   label: 'Sans solde' },
    { value: 'autre',        label: 'Autre' },
  ];

  pendingCount = computed(() => this.leaves().filter(l => l.statut === 'en_attente').length);

  // ── Employés (pour les sélecteurs présence/congé — alimenté par /employes/) ──
  employeeOptions = signal<EmployeeOption[]>([]);

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Un employé opérationnel n'a pas accès à /users/ : on l'ouvre sur Présences.
    if (!this.canManageUsers()) {
      this.activeTab.set('presences');
    }
    this.loadDepots();
    this.loadZones();
    this.loadEmployeeOptions();
    this.loadMyPresence();
    this.reload();
  }

  switchTab(tab: Tab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.page.set(1);
    this.reload();
  }

  reload(): void {
    switch (this.activeTab()) {
      case 'users':     this.loadUsers(); break;
      case 'presences':
        // La liste complète des présences est réservée aux managers (RH_READ backend) ;
        // les autres rôles n'ont que leur carte de pointage self-service.
        if (this.canManageLeaves()) { this.loadPresences(); this.loadRecap(); }
        break;
      case 'leaves':    this.loadLeaves(); break;
    }
  }

  loadRecap(): void {
    this.http.get<RecapDay>(`${this.BASE_PRESENCES}/recap/`).subscribe({
      next: (r) => this.recap.set(r),
      error: ()  => this.recap.set(null),
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.reload(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.reload(); } }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILISATEURS — logique
  // ════════════════════════════════════════════════════════════════════════════

  loadUsers(): void {
    this.loading.set(true);
    const params: UserListParams = { page: this.page(), page_size: this.PAGE_SIZE };
    if (this.search)              params.search    = this.search;
    if (this.roleFilter)          params.role      = this.roleFilter;
    if (this.statusFilter !== '') params.is_active = this.statusFilter === 'true';

    this.usersService.list(params).subscribe({
      next: (res) => { this.users.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: ()    => { this.toast.error('Erreur lors du chargement des utilisateurs.'); this.loading.set(false); },
    });
  }

  private loadDepots(): void {
    this.usersService.listDepots().subscribe({
      next: (res) => this.depots.set(res.results),
      error: ()   => {},
    });
  }

  private loadZones(): void {
    this.http.get<{ count: number; results: ZoneOption[] }>(
      `${this.BASE_ZONES}/?page_size=200&is_active=true`
    ).subscribe({
      next: (r) => this.zones.set(r.results),
      error: () => {},
    });
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadUsers(); }, 400);
  }

  onFilterChange(): void { this.page.set(1); this.loadUsers(); }

  clearFilters(): void {
    this.search = ''; this.roleFilter = ''; this.statusFilter = '';
    this.page.set(1); this.loadUsers();
  }

  get hasActiveFilters(): boolean {
    return !!(this.search || this.roleFilter || this.statusFilter);
  }

  openCreateUser(): void {
    this.isEditingUser.set(false);
    this.editingUserId.set(null);
    this.userForm = { email: '', first_name: '', last_name: '', phone: '', role: '', depot_id: '', zone_id: '', password: '', is_active: true };
    this.showUserPanel.set(true);
  }

  openEditUser(user: UserSummary): void {
    this.isEditingUser.set(true);
    this.editingUserId.set(user.id);
    this.userForm = {
      email:      user.email,
      first_name: user.first_name,
      last_name:  user.last_name,
      phone:      user.phone || '',
      role:       user.role,
      depot_id:   user.depot_id ? String(user.depot_id) : '',
      zone_id:    user.zone_id ? String(user.zone_id) : '',
      password:   '',
      is_active:  user.is_active,
    };
    this.showUserPanel.set(true);
  }

  closeUserPanel(): void { this.showUserPanel.set(false); }

  /** Quand le rôle change, on réinitialise l'affectation devenue invalide (zone ↔ dépôt). */
  onRoleChange(): void {
    if (this.isSuperviseurRole) this.userForm.depot_id = '';
    else this.userForm.zone_id = '';
  }

  canSaveUser(): boolean {
    const f = this.userForm;
    if (!f.first_name.trim() || !f.last_name.trim() || !f.role) return false;
    if (!this.isEditingUser() && (!f.email.trim() || !f.password)) return false;
    // Un superviseur doit obligatoirement être affecté à une zone (règle backend).
    if (this.isSuperviseurRole && !f.zone_id) return false;
    return true;
  }

  saveUser(): void {
    if (!this.canSaveUser()) return;
    const f = this.userForm;
    this.userPanelLoading.set(true);

    // Affectation conditionnelle selon le rôle (miroir mobile + règle backend) :
    // superviseur → zone_id (dépôt forcé null) ; autres → depot_id (zone forcée null).
    const superviseur = f.role === 'superviseur';
    const depotId = superviseur ? null : (f.depot_id ? Number(f.depot_id) : null);
    const zoneId  = superviseur ? (f.zone_id ? Number(f.zone_id) : null) : null;

    if (this.isEditingUser()) {
      const payload: UserUpdatePayload = {
        first_name: f.first_name.trim(),
        last_name:  f.last_name.trim(),
        phone:      f.phone.trim() || undefined,
        role:       f.role,
        is_active:  f.is_active,
        depot_id:   depotId,
        zone_id:    zoneId,
      };
      this.usersService.update(this.editingUserId()!, payload).subscribe({
        next: () => { this.toast.success('Employé mis à jour.'); this.closeUserPanel(); this.loadUsers(); this.loadEmployeeOptions(); this.userPanelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la mise à jour.')); this.userPanelLoading.set(false); },
      });
    } else {
      const payload: UserCreatePayload = {
        email:      f.email.trim(),
        first_name: f.first_name.trim(),
        last_name:  f.last_name.trim(),
        phone:      f.phone.trim() || undefined,
        role:       f.role,
        depot_id:   depotId,
        zone_id:    zoneId,
        password:   f.password,
      };
      this.usersService.create(payload).subscribe({
        next: () => { this.toast.success('Employé créé avec succès.'); this.closeUserPanel(); this.loadUsers(); this.loadEmployeeOptions(); this.userPanelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la création.')); this.userPanelLoading.set(false); },
      });
    }
  }

  openDeactivate(user: UserSummary): void {
    this.confirmType.set(user.is_active ? 'deactivate' : 'reactivate');
    this.confirmUser.set(user);
  }

  openReset(user: UserSummary): void {
    this.newPassword = ''; this.newPasswordConfirm = '';
    this.confirmType.set('reset');
    this.confirmUser.set(user);
  }

  openDelete(user: UserSummary): void {
    this.confirmType.set('delete');
    this.confirmUser.set(user);
  }

  closeConfirm(): void {
    this.confirmType.set(null);
    this.confirmUser.set(null);
  }

  canConfirmReset(): boolean {
    return !!this.newPassword && this.newPassword.length >= 8 && this.newPassword === this.newPasswordConfirm;
  }

  executeConfirm(): void {
    const type = this.confirmType();
    const user = this.confirmUser();
    if (!type || !user) return;
    this.confirmLoading.set(true);

    if (type === 'deactivate' || type === 'reactivate') {
      this.usersService.update(user.id, { is_active: !user.is_active }).subscribe({
        next: () => {
          this.toast.success(`Utilisateur ${user.is_active ? 'désactivé' : 'réactivé'}.`);
          this.closeConfirm(); this.loadUsers(); this.confirmLoading.set(false);
        },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.confirmLoading.set(false); },
      });
    } else if (type === 'reset') {
      if (!this.canConfirmReset()) {
        this.toast.error('Mots de passe invalides ou non identiques (8 caractères min).');
        this.confirmLoading.set(false);
        return;
      }
      const payload: PasswordResetPayload = { new_password: this.newPassword, new_password_confirm: this.newPasswordConfirm };
      this.usersService.resetPassword(user.id, payload).subscribe({
        next: () => { this.toast.success('Mot de passe réinitialisé.'); this.closeConfirm(); this.confirmLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.confirmLoading.set(false); },
      });
    } else if (type === 'delete') {
      this.usersService.remove(user.id).subscribe({
        next: () => { this.toast.success('Utilisateur supprimé.'); this.closeConfirm(); this.loadUsers(); this.loadEmployeeOptions(); this.confirmLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.confirmLoading.set(false); },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRÉSENCES — logique
  // ════════════════════════════════════════════════════════════════════════════

  loadPresences(): void {
    this.loading.set(true);
    this.http.get<{ count: number; results: Presence[] }>(
      `${this.BASE_PRESENCES}/?page=${this.page()}&page_size=${this.PAGE_SIZE}&ordering=-date`
    ).subscribe({
      next: (res) => { this.presences.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: ()    => { this.toast.error('Erreur chargement présences.'); this.loading.set(false); },
    });
  }

  // ── Self-service : mon statut + pointage géolocalisé ────────────────────────

  loadMyPresence(): void {
    this.http.get<PresenceTodayStatus>(`${this.BASE_PRESENCES}/aujourdhui/`).subscribe({
      next: (s) => this.myPresence.set(s),
      error: ()  => this.myPresence.set(null),
    });
  }

  pointerPresence(): void {
    if (this.pointing()) return;
    if (!('geolocation' in navigator)) {
      this.toast.error("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.pointing.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const payload = {
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        this.http.post<Presence>(`${this.BASE_PRESENCES}/pointer/`, payload).subscribe({
          next: (p) => {
            const ok = p.dans_perimetre !== false;
            if (ok) this.toast.success('Présence enregistrée. Bonne journée !');
            else    this.toast.error('Pointage enregistré, mais hors de votre lieu de travail.');
            this.loadMyPresence();
            this.loadPresences();
            this.pointing.set(false);
          },
          error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors du pointage.')); this.pointing.set(false); },
        });
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Autorisez la géolocalisation pour pointer votre présence.'
          : 'Impossible de récupérer votre position. Réessayez.';
        this.toast.error(msg);
        this.pointing.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONGÉS — logique
  // ════════════════════════════════════════════════════════════════════════════

  loadLeaves(): void {
    this.loading.set(true);
    const statut = this.leaveStatutFilter();
    const statutParam = statut ? `&statut=${statut}` : '';
    this.http.get<{ count: number; results: Leave[] }>(
      `${this.BASE_CONGES}/?page=${this.page()}&page_size=${this.PAGE_SIZE}&ordering=-created_at${statutParam}`
    ).subscribe({
      next: (res) => { this.leaves.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: ()    => { this.toast.error('Erreur chargement congés.'); this.loading.set(false); },
    });
  }

  setLeaveFilter(statut: '' | 'en_attente' | 'approuve' | 'refuse'): void {
    this.leaveStatutFilter.set(statut);
    this.page.set(1);
    this.loadLeaves();
  }

  openCreateLeave(): void {
    this.leaveForm = { employe: 0, type_conge: 'conge_annuel', date_debut: '', date_fin: '', motif: '' };
    this.showLeavePanel.set(true);
  }

  submitLeave(): void {
    // Demande self-service : l'employé est déduit du compte connecté côté backend.
    if (!this.leaveForm.date_debut || !this.leaveForm.date_fin) {
      this.toast.error('Les dates de début et de fin sont obligatoires.');
      return;
    }
    if (this.leaveForm.date_fin < this.leaveForm.date_debut) {
      this.toast.error('La date de fin doit être après la date de début.');
      return;
    }
    this.leaveLoading.set(true);
    const payload: Record<string, unknown> = {
      type_conge: this.leaveForm.type_conge,
      date_debut: this.leaveForm.date_debut,
      date_fin:   this.leaveForm.date_fin,
    };
    if (this.leaveForm.motif.trim()) payload['motif'] = this.leaveForm.motif.trim();

    this.http.post<Leave>(`${this.BASE_CONGES}/`, payload).subscribe({
      next: () => {
        this.toast.success('Demande de congé envoyée.');
        this.showLeavePanel.set(false);
        this.loadLeaves();
        this.leaveLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.leaveLoading.set(false); },
    });
  }

  approveLeave(id: number): void {
    this.http.post(`${this.BASE_CONGES}/${id}/approuver/`, {}).subscribe({
      next: () => { this.toast.success('Congé approuvé.'); this.loadLeaves(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
    });
  }

  // ── Refus de congé avec motif (modale) ──────────────────────────────────────
  rejectLeaveId = signal<number | null>(null);
  rejectMotif   = '';
  rejectLoading = signal(false);

  openRejectLeave(id: number): void {
    this.rejectMotif = '';
    this.rejectLeaveId.set(id);
  }

  closeRejectLeave(): void {
    this.rejectLeaveId.set(null);
  }

  confirmRejectLeave(): void {
    const id = this.rejectLeaveId();
    if (id == null) return;
    this.rejectLoading.set(true);
    // Le backend expose /conges/{id}/refuser/ (et non /rejeter/) — back_fac/apps/rh/urls.py
    const body = this.rejectMotif.trim() ? { motif_traitement: this.rejectMotif.trim() } : {};
    this.http.post(`${this.BASE_CONGES}/${id}/refuser/`, body).subscribe({
      next: () => {
        this.toast.success('Congé refusé.');
        this.closeRejectLeave();
        this.loadLeaves();
        this.rejectLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.rejectLoading.set(false); },
    });
  }

  // ── Employés (sélecteurs) ───────────────────────────────────────────────────

  private loadEmployeeOptions(): void {
    this.http.get<{ count: number; results: EmployeeOption[] }>(
      `${this.BASE_EMPLOYES}/?page_size=200&ordering=nom`
    ).subscribe({
      next: (r) => this.employeeOptions.set(r.results),
      error: () => {},
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(user: UserSummary): string {
    const f = user.first_name?.[0] || '';
    const l = user.last_name?.[0] || '';
    return (f + l).toUpperCase() || user.email[0].toUpperCase();
  }

  getUserName(user: UserSummary): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email;
  }

  getRoleLabel(role: string): string { return ROLE_LABELS[role] || role; }
  getRoleBadge(role: string): string { return ROLE_BADGE[role] || 'bg-slate-100 text-slate-600 border-slate-200'; }

  getPresenceClass(type: string): string {
    const m: Record<string, string> = {
      present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      absent:  'bg-red-50 text-red-600 border-red-200',
      retard:  'bg-amber-50 text-amber-700 border-amber-200',
      mission: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return m[type] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getLeaveStatutClass(statut: string): string {
    const m: Record<string, string> = {
      en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
      approuve:   'bg-emerald-50 text-emerald-700 border-emerald-200',
      refuse:     'bg-red-50 text-red-600 border-red-200',
    };
    return m[statut] || 'bg-gray-100 text-gray-600';
  }

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
}
