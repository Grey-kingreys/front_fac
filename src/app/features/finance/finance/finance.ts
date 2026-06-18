// ============================================================
// FINANCE COMPONENT — Version corrigée et complète
// Chemin : src/app/features/finance/finance/finance.ts
//
// CORRECTION PRINCIPALE :
//   - Le formulaire d'ouverture charge la liste des caisses
//     depuis /api/caisses/ pour le select (au lieu de saisir manuellement un ID)
//   - Onglets : Sessions | Dépenses
//   - Affiche correctement : statut 'ouverte'/'fermee', solde_ouverture,
//     caisse_nom, caissier_nom, ouvert_le, ferme_le
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FinanceService, CashSession, CaissePhysique, Depense
} from '../../../core/services/finance.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance.html',
})
export class Finance implements OnInit {
  private financeService = inject(FinanceService);
  private toast          = inject(ToastService);

  // ── Onglets ───────────────────────────────────────────────────────────────

  activeTab = signal<'sessions' | 'depenses'>('sessions');

  // ── Sessions ──────────────────────────────────────────────────────────────

  sessions = signal<CashSession[]>([]);
  loading  = signal(false);
  total    = signal(0);

  // Statistiques calculées
  totalOpen    = computed(() => this.sessions().filter(s => s.statut === 'ouverte').length);
  totalBalance = computed(() =>
    this.sessions()
      .filter(s => s.statut === 'ouverte')
      .reduce((sum, s) => sum + (s.solde_fermeture_theorique ?? s.solde_ouverture), 0)
  );

  // ── Caisses disponibles (pour le select d'ouverture) ─────────────────────

  caisses = signal<CaissePhysique[]>([]);

  // ── Dépenses ──────────────────────────────────────────────────────────────

  depenses        = signal<Depense[]>([]);
  depensesLoading = signal(false);
  depensesTotal   = signal(0);
  showDepensePanel = signal(false);
  depenseLoading   = signal(false);
  depenseForm = { libelle: '', montant: 0, categorie: '', caisse: 0 };

  // ── Panel ouverture session ───────────────────────────────────────────────

  showOpenPanel = signal(false);
  actionLoading = signal(false);
  openForm = { caisse: 0, solde_ouverture: 0, notes: '' };

  // ── Panel clôture session ─────────────────────────────────────────────────

  showClosePanel  = signal(false);
  selectedSession = signal<CashSession | null>(null);
  closeForm = { solde_reel: 0, motif_ecart: '' };

  // ── Initialisation ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
    this.loadCaisses();
  }

  load(): void {
    this.loading.set(true);
    this.financeService.listSessions().subscribe({
      next: (res) => {
        this.sessions.set(res.results);
        this.total.set(res.count);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des sessions.');
        this.loading.set(false);
      },
    });
  }

  loadCaisses(): void {
    this.financeService.listCaisses().subscribe({
      next: (res) => this.caisses.set(res.results.filter(c => c.is_active)),
      error: () => {},
    });
  }

  loadDepenses(): void {
    this.depensesLoading.set(true);
    this.financeService.listDepenses({ page_size: 50 }).subscribe({
      next: (res) => {
        this.depenses.set(res.results);
        this.depensesTotal.set(res.count);
        this.depensesLoading.set(false);
      },
      error: () => {
        this.toast.error('Erreur chargement dépenses.');
        this.depensesLoading.set(false);
      },
    });
  }

  switchTab(tab: 'sessions' | 'depenses'): void {
    this.activeTab.set(tab);
    if (tab === 'depenses' && this.depenses().length === 0) {
      this.loadDepenses();
    }
  }

  // ── Ouverture d'une session ───────────────────────────────────────────────

  openSession(): void {
    if (!this.openForm.caisse) {
      this.toast.error('Sélectionnez une caisse.');
      return;
    }
    this.actionLoading.set(true);
    this.financeService.openSession(this.openForm).subscribe({
      next: () => {
        this.toast.success('Session de caisse ouverte.');
        this.showOpenPanel.set(false);
        this.openForm = { caisse: 0, solde_ouverture: 0, notes: '' };
        this.load();
        this.actionLoading.set(false);
      },
      error: (e) => {
        const msg = e?.error?.detail || e?.error?.caisse?.[0] || 'Erreur lors de l\'ouverture.';
        this.toast.error(msg);
        this.actionLoading.set(false);
      },
    });
  }

  // ── Clôture d'une session ─────────────────────────────────────────────────

  openCloseModal(session: CashSession): void {
    this.selectedSession.set(session);
    this.closeForm = {
      solde_reel:  session.solde_fermeture_theorique ?? session.solde_ouverture,
      motif_ecart: '',
    };
    this.showClosePanel.set(true);
  }

  closeSession(): void {
    const s = this.selectedSession();
    if (!s) return;
    this.actionLoading.set(true);
    this.financeService.closeSession(s.id, this.closeForm).subscribe({
      next: () => {
        this.toast.success('Session clôturée avec succès.');
        this.showClosePanel.set(false);
        this.load();
        this.actionLoading.set(false);
      },
      error: (e) => {
        const msg = e?.error?.detail || e?.error?.non_field_errors?.[0] || 'Erreur lors de la clôture.';
        this.toast.error(msg);
        this.actionLoading.set(false);
      },
    });
  }

  // ── Dépenses ──────────────────────────────────────────────────────────────

  saveDepense(): void {
    if (!this.depenseForm.libelle.trim() || this.depenseForm.montant <= 0 || !this.depenseForm.caisse) {
      this.toast.error('Libellé, montant et caisse sont obligatoires.');
      return;
    }
    this.depenseLoading.set(true);
    this.financeService.createDepense(this.depenseForm).subscribe({
      next: () => {
        this.toast.success('Dépense enregistrée.');
        this.showDepensePanel.set(false);
        this.depenseForm = { libelle: '', montant: 0, categorie: '', caisse: 0 };
        this.loadDepenses();
        this.depenseLoading.set(false);
      },
      error: (e) => {
        this.toast.error(e?.error?.detail || 'Erreur.');
        this.depenseLoading.set(false);
      },
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(amount || 0);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  getEcartClass(ecart: number): string {
    if (ecart === 0) return 'text-gray-500';
    return ecart > 0 ? 'text-emerald-600' : 'text-red-600';
  }
}