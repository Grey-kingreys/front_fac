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
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance.html',
})
export class Finance implements OnInit {
  private financeService = inject(FinanceService);
  private toast          = inject(ToastService);
  private auth           = inject(AuthService);

  // ── Onglets ───────────────────────────────────────────────────────────────

  activeTab = signal<'sessions' | 'depenses'>('sessions');

  // ── Rôle (vue caissier-centrée, miroir mobile « Caisse & Sessions ») ───────
  private role = computed(() => this.auth.currentUser()?.role ?? '');
  isCaissier   = computed(() => this.role() === 'caissier');

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

  /**
   * Sessions visibles dans l'UI. Un caissier ne doit voir QUE ses propres
   * sessions (le backend le garantit déjà via get_queryset ; ce filtre ajoute
   * une défense côté client et corrige le cas de la simulation de rôle, où le
   * token de l'admin renvoie toutes les sessions de l'entreprise).
   */
  displayedSessions = computed<CashSession[]>(() => {
    if (this.isCaissier()) {
      const uid = this.auth.currentUser()?.id;
      return this.sessions().filter(s => s.caissier === uid);
    }
    return this.sessions();
  });

  /** Session de caisse actuellement ouverte (la sienne pour un caissier). */
  activeSession = computed<CashSession | null>(
    () => this.displayedSessions().find(s => s.statut === 'ouverte') ?? null
  );

  /** Solde « calculé/théorique » d'une session (système). */
  soldeCalcule(s: CashSession): number {
    return s.solde_fermeture_theorique ?? s.solde_ouverture;
  }

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
      // Une session ne peut s'ouvrir que sur une caisse physique OUVERTE
      // (contrainte backend : au plus une caisse ouverte par dépôt). On ne
      // retient donc que les caisses actives ET ouvertes.
      next: (res) => this.caisses.set(
        res.results.filter(c => c.is_active && c.statut === 'ouverte')
      ),
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

  /** Caisse physique rattachée au dépôt du caissier (résolution auto, comme mobile). */
  private resolveCaisseIdForCaissier(): number | null {
    const depotId = this.auth.currentUser()?.depot_id ?? null;
    if (depotId == null) return null;
    return this.caisses().find(c => c.depot === depotId)?.id ?? null;
  }

  openOpenPanel(): void {
    this.openForm = { caisse: 0, solde_ouverture: 0, notes: '' };
    // Cas mono-dépôt (admin/superviseur) : une seule caisse ouverte → on la
    // prend d'office, comme le mobile. S'il y en a plusieurs, l'utilisateur choisit.
    if (!this.isCaissier() && this.caisses().length === 1) {
      this.openForm.caisse = this.caisses()[0].id;
    }
    this.showOpenPanel.set(true);
  }

  openSession(): void {
    let caisseId = Number(this.openForm.caisse) || 0;

    // Caissier : la caisse est résolue automatiquement depuis son dépôt (parité mobile).
    if (this.isCaissier()) {
      const resolved = this.resolveCaisseIdForCaissier();
      if (!resolved) {
        this.toast.error('Aucune caisse physique pour votre dépôt. Contactez votre administrateur.');
        return;
      }
      caisseId = resolved;
    }

    if (!caisseId) {
      this.toast.error('Sélectionnez une caisse.');
      return;
    }

    this.actionLoading.set(true);
    this.financeService.openSession({
      caisse: caisseId,
      solde_ouverture: Number(this.openForm.solde_ouverture) || 0,
      notes: this.openForm.notes || undefined,
    }).subscribe({
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

  /** Écart en direct = solde réel compté − solde calculé système. */
  get closeEcart(): number {
    const s = this.selectedSession();
    if (!s) return 0;
    return (Number(this.closeForm.solde_reel) || 0) - this.soldeCalcule(s);
  }

  get closeEcartNonNul(): boolean { return Math.abs(this.closeEcart) > 0; }

  closeSession(): void {
    const s = this.selectedSession();
    if (!s) return;
    // Motif obligatoire dès qu'il y a un écart (règle anti-fraude — caisses).
    if (this.closeEcartNonNul && !this.closeForm.motif_ecart.trim()) {
      this.toast.error('Le motif est obligatoire en cas d\'écart.');
      return;
    }
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