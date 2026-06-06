import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CompaniesService,
  CompanyCreatePayload,
  CompanyListParams,
  CompanySummary,
  CompanyUpdatePayload,
} from '../../../core/services/companies';
import { ToastService } from '../../../core/services/toast';

// ── Plans d'abonnement ────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free:       'Gratuit',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-gray-100 text-gray-600 border-gray-200',
  starter:    'bg-blue-50 text-blue-700 border-blue-200',
  pro:        'bg-purple-50 text-purple-700 border-purple-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PLANS = [
  { value: 'free',       label: 'Gratuit' },
  { value: 'starter',   label: 'Starter' },
  { value: 'pro',       label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

// ── Composant ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
})
export class Companies implements OnInit {
  private companiesService = inject(CompaniesService);
  private toast = inject(ToastService);

  readonly plans = PLANS;
  readonly PAGE_SIZE = 20;

  // ── Données ──────────────────────────────────────────────────────────────────
  companies = signal<CompanySummary[]>([]);
  total     = signal(0);
  loading   = signal(false);
  page      = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());
  pageStart  = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd    = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  // ── Filtres ───────────────────────────────────────────────────────────────
  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Slide-over panel ──────────────────────────────────────────────────────
  showPanel    = signal(false);
  isEditing    = signal(false);
  editingId    = signal<number | null>(null);
  panelLoading = signal(false);

  formData = {
    name: '', email_admin: '', subscription_plan: 'free',
  };

  // ── Confirmation toggle ───────────────────────────────────────────────────
  toggleTarget    = signal<CompanySummary | null>(null);
  toggleLoading   = signal(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    const params: CompanyListParams = { page: this.page(), page_size: this.PAGE_SIZE };
    if (this.search) params.search = this.search;

    this.companiesService.list(params).subscribe({
      next: (res) => { this.companies.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: ()    => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  // ── Filtres ───────────────────────────────────────────────────────────────
  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadCompanies(); }, 400);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.loadCompanies(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.loadCompanies(); } }

  // ── Panel ─────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formData = { name: '', email_admin: '', subscription_plan: 'free' };
    this.showPanel.set(true);
  }

  openEdit(company: CompanySummary): void {
    this.isEditing.set(true);
    this.editingId.set(company.id);
    this.formData = { name: company.name, email_admin: '', subscription_plan: company.subscription_plan };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSave(): boolean {
    const f = this.formData;
    if (!f.name.trim() || !f.subscription_plan) return false;
    if (!this.isEditing() && !f.email_admin.trim()) return false;
    return true;
  }

  save(): void {
    if (!this.canSave()) return;
    const f = this.formData;
    this.panelLoading.set(true);

    if (this.isEditing()) {
      const payload: CompanyUpdatePayload = {
        name: f.name.trim(),
        subscription_plan: f.subscription_plan,
      };
      this.companiesService.update(this.editingId()!, payload).subscribe({
        next: () => { this.toast.success('Entreprise mise à jour.'); this.closePanel(); this.loadCompanies(); this.panelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la mise à jour.')); this.panelLoading.set(false); },
      });
    } else {
      const payload: CompanyCreatePayload = {
        name:              f.name.trim(),
        email_admin:       f.email_admin.trim(),
        subscription_plan: f.subscription_plan,
      };
      this.companiesService.create(payload).subscribe({
        next: () => { this.toast.success('Entreprise créée. Un email a été envoyé à l\'administrateur.'); this.closePanel(); this.loadCompanies(); this.panelLoading.set(false); },
        error: (e) => { this.toast.error(this.extractError(e, 'Erreur lors de la création.')); this.panelLoading.set(false); },
      });
    }
  }

  // ── Toggle actif / inactif ────────────────────────────────────────────────
  openToggle(company: CompanySummary): void {
    this.toggleTarget.set(company);
  }

  closeToggle(): void {
    this.toggleTarget.set(null);
  }

  executeToggle(): void {
    const company = this.toggleTarget();
    if (!company) return;
    this.toggleLoading.set(true);
    this.companiesService.toggle(company.id).subscribe({
      next: () => {
        const action = company.is_active ? 'suspendue' : 'réactivée';
        this.toast.success(`Entreprise ${action}.`);
        this.closeToggle(); this.loadCompanies(); this.toggleLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.toggleLoading.set(false); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getPlanLabel(plan: string): string  { return PLAN_LABELS[plan] || plan; }
  getPlanBadge(plan: string): string  { return PLAN_BADGE[plan] || 'bg-gray-100 text-gray-600 border-gray-200'; }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
