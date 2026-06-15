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

  totalOpen = computed(() => this.sessions().filter(s => s.status === 'open').length);
  totalBalance = computed(() => this.sessions().filter(s => s.status === 'open').reduce((sum, s) => sum + s.expected_amount, 0));

  showOpenPanel = signal(false);
  showClosePanel = signal(false);
  selectedSession = signal<CashSession | null>(null);
  actionLoading = signal(false);

  openForm = { depot_id: 0, opening_amount: 0 };
  closeForm = { closing_amount: 0, note: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.financeService.listSessions().subscribe({
      next: (res) => { this.sessions.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  openSession(): void {
    this.actionLoading.set(true);
    this.financeService.openSession(this.openForm).subscribe({
      next: () => { this.toast.success('Session ouverte.'); this.showOpenPanel.set(false); this.load(); this.actionLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
    });
  }

  openCloseModal(session: CashSession): void {
    this.selectedSession.set(session);
    this.closeForm = { closing_amount: session.expected_amount, note: '' };
    this.showClosePanel.set(true);
  }

  closeSession(): void {
    const s = this.selectedSession();
    if (!s) return;
    this.actionLoading.set(true);
    this.financeService.closeSession(s.id, this.closeForm).subscribe({
      next: () => { this.toast.success('Session clôturée.'); this.showClosePanel.set(false); this.load(); this.actionLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.actionLoading.set(false); },
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