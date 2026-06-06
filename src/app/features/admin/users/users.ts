import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DepotOption,
  PasswordResetPayload,
  UserCreatePayload,
  UserListParams,
  UserSummary,
  UserUpdatePayload,
  UsersService,
} from '../../../core/services/users';
import { ToastService } from '../../../core/services/toast';

// ── Constantes rôles ──────────────────────────────────────────────────────────

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

// ── Composant ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private usersService = inject(UsersService);
  private toast = inject(ToastService);

  readonly roles = ASSIGNABLE_ROLES;
  readonly PAGE_SIZE = 25;

  // ── Données ──────────────────────────────────────────────────────────────────
  users    = signal<UserSummary[]>([]);
  total    = signal(0);
  loading  = signal(false);
  page     = signal(1);
  depots   = signal<DepotOption[]>([]);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());
  pageStart  = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd    = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  // ── Filtres ───────────────────────────────────────────────────────────────
  search       = '';
  roleFilter   = '';
  statusFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Slide-over panel ──────────────────────────────────────────────────────
  showPanel    = signal(false);
  isEditing    = signal(false);
  editingId    = signal<number | null>(null);
  panelLoading = signal(false);

  formData = {
    email: '', first_name: '', last_name: '', phone: '',
    role: '', depot_id: '', password: '', is_active: true,
  };

  // ── Modales de confirmation ───────────────────────────────────────────────
  confirmType    = signal<'deactivate' | 'reactivate' | 'reset' | 'delete' | null>(null);
  confirmUser    = signal<UserSummary | null>(null);
  confirmLoading = signal(false);

  newPassword        = '';
  newPasswordConfirm = '';

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadUsers();
    this.loadDepots();
  }

  loadUsers(): void {
    this.loading.set(true);
    const params: UserListParams = { page: this.page(), page_size: this.PAGE_SIZE };
    if (this.search)                      params.search    = this.search;
    if (this.roleFilter)                  params.role      = this.roleFilter;
    if (this.statusFilter !== '')         params.is_active = this.statusFilter === 'true';

    this.usersService.list(params).subscribe({
      next: (res) => { this.users.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: ()    => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  private loadDepots(): void {
    this.usersService.listDepots().subscribe({
      next: (res) => this.depots.set(res.results),
      error: ()   => {},
    });
  }

  // ── Filtres ───────────────────────────────────────────────────────────────
  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadUsers(); }, 400);
  }

  onFilterChange(): void { this.page.set(1); this.loadUsers(); }

  clearFilters(): void {
    this.search = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.page.set(1);
    this.loadUsers();
  }

  get hasActiveFilters(): boolean {
    return !!(this.search || this.roleFilter || this.statusFilter);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.loadUsers(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.loadUsers(); } }

  // ── Panel ─────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formData = { email: '', first_name: '', last_name: '', phone: '', role: '', depot_id: '', password: '', is_active: true };
    this.showPanel.set(true);
  }

  openEdit(user: UserSummary): void {
    this.isEditing.set(true);
    this.editingId.set(user.id);
    this.formData = {
      email:      user.email,
      first_name: user.first_name,
      last_name:  user.last_name,
      phone:      user.phone || '',
      role:       user.role,
      depot_id:   user.depot_id ? String(user.depot_id) : '',
      password:   '',
      is_active:  user.is_active,
    };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSave(): boolean {
    const f = this.formData;
    if (!f.first_name.trim() || !f.last_name.trim() || !f.role) return false;
    if (!this.isEditing() && (!f.email.trim() || !f.password)) return false;
    return true;
  }

  save(): void {
    if (!this.canSave()) return;
    const f = this.formData;
    this.panelLoading.set(true);

    if (this.isEditing()) {
      const payload: UserUpdatePayload = {
        first_name: f.first_name.trim(),
        last_name:  f.last_name.trim(),
        phone:      f.phone.trim() || undefined,
        role:       f.role,
        is_active:  f.is_active,
        depot_id:   f.depot_id ? Number(f.depot_id) : null,
      };
      this.usersService.update(this.editingId()!, payload).subscribe({
        next: () => { this.toast.success('Utilisateur mis à jour.'); this.closePanel(); this.loadUsers(); this.panelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la mise à jour.')); this.panelLoading.set(false); },
      });
    } else {
      const payload: UserCreatePayload = {
        email:      f.email.trim(),
        first_name: f.first_name.trim(),
        last_name:  f.last_name.trim(),
        phone:      f.phone.trim() || undefined,
        role:       f.role,
        depot_id:   f.depot_id ? Number(f.depot_id) : null,
        password:   f.password,
      };
      this.usersService.create(payload).subscribe({
        next: () => { this.toast.success('Utilisateur créé avec succès.'); this.closePanel(); this.loadUsers(); this.panelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la création.')); this.panelLoading.set(false); },
      });
    }
  }

  // ── Modales ───────────────────────────────────────────────────────────────
  openDeactivate(user: UserSummary): void {
    this.confirmType.set(user.is_active ? 'deactivate' : 'reactivate');
    this.confirmUser.set(user);
  }

  openReset(user: UserSummary): void {
    this.newPassword = '';
    this.newPasswordConfirm = '';
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
        next: () => { this.toast.success('Utilisateur supprimé.'); this.closeConfirm(); this.loadUsers(); this.confirmLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.confirmLoading.set(false); },
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(user: UserSummary): string {
    const f = user.first_name?.[0] || '';
    const l = user.last_name?.[0] || '';
    return (f + l).toUpperCase() || user.email[0].toUpperCase();
  }

  getRoleLabel(role: string): string { return ROLE_LABELS[role] || role; }
  getRoleBadge(role: string): string { return ROLE_BADGE[role] || 'bg-slate-100 text-slate-600 border-slate-200'; }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getUserName(user: UserSummary): string {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email;
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
