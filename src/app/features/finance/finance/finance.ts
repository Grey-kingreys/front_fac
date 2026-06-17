// ============================================================
// FINANCE COMPONENT — Mis à jour pour les vrais champs backend
// Chemin : src/app/features/finance/finance/finance.ts
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService, CashSession } from '../../../core/services/finance.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance.html',
})
export class Finance implements OnInit {
  private financeService = inject(FinanceService);
  private toast = inject(ToastService);

  sessions = signal<CashSession[]>([]);
  loading = signal(false);
  total = signal(0);

  // Avec les vrais champs : statut 'ouverte' (pas 'open')
  totalOpen = computed(() => this.sessions().filter(s => s.statut === 'ouverte').length);
  totalBalance = computed(() =>
    this.sessions()
      .filter(s => s.statut === 'ouverte')
      .reduce((sum, s) => sum + (s.solde_fermeture_theorique ?? s.solde_ouverture), 0)
  );

  showOpenPanel = signal(false);
  showClosePanel = signal(false);
  selectedSession = signal<CashSession | null>(null);
  actionLoading = signal(false);

  // Formulaire ouverture : backend attend {caisse, solde_ouverture}
  // NOTE: le caissier doit choisir une caisse existante — on simplifie avec depot_id
  openForm = { caisse: 0, solde_ouverture: 0, notes: '' };
  closeForm = { solde_reel: 0, motif_ecart: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.financeService.listSessions().subscribe({
      next: (res) => { this.sessions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  openSession(): void {
    if (!this.openForm.caisse) {
      this.toast.error('Sélectionnez une caisse.');
      return;
    }
    this.actionLoading.set(true);
    this.financeService.openSession(this.openForm).subscribe({
      next: () => { this.toast.success('Session ouverte.'); this.showOpenPanel.set(false); this.load(); this.actionLoading.set(false); },
      error: (e) => {
        const msg = e?.error?.detail || e?.error?.caisse?.[0] || 'Erreur.';
        this.toast.error(msg);
        this.actionLoading.set(false);
      },
    });
  }

  openCloseModal(session: CashSession): void {
    this.selectedSession.set(session);
    this.closeForm = {
      solde_reel: session.solde_fermeture_theorique ?? session.solde_ouverture,
      motif_ecart: '',
    };
    this.showClosePanel.set(true);
  }

  closeSession(): void {
    const s = this.selectedSession();
    if (!s) return;
    this.actionLoading.set(true);
    this.financeService.closeSession(s.id, this.closeForm).subscribe({
      next: () => { this.toast.success('Session clôturée.'); this.showClosePanel.set(false); this.load(); this.actionLoading.set(false); },
      error: (e) => {
        const msg = e?.error?.detail || e?.error?.non_field_errors?.[0] || 'Erreur.';
        this.toast.error(msg);
        this.actionLoading.set(false);
      },
    });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(amount);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}