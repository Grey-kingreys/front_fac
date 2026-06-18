// ============================================================
// REPORTS COMPONENT — Version corrigée
// Chemin : src/app/features/reports/reports/reports.ts
//
// CORRECTION : l'ancien code appelait /api/reports/summary/
// qui n'existe PAS. Les vraies routes sont :
//   GET /api/analytics/ventes/?debut=YYYY-MM-DD&fin=YYYY-MM-DD
//   GET /api/analytics/stock/?debut=YYYY-MM-DD&fin=YYYY-MM-DD
//   GET /api/analytics/finance/?debut=YYYY-MM-DD&fin=YYYY-MM-DD
// ============================================================
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ── Interfaces des vraies réponses backend ────────────────────────────────────

interface VentesAnalytics {
  periode: { debut: string; fin: string };
  totaux: {
    nb_commandes: number;
    ca_ht: string;
    ca_ttc: string;
    tva_total: string;
    montant_paye: string;
  };
  par_depot: { depot_code: string; depot_nom: string; nb_commandes: number; ca_ttc: string }[];
}

interface StockAnalytics {
  nb_produits_en_alerte: number;
  produits_en_alerte: {
    produit_nom: string;
    produit_reference: string;
    depot_code: string;
    quantite: string;
    seuil: string;
  }[];
  top_produits_sortie: { reference: string; nom: string; total_sortie: string }[];
}

interface FinanceAnalytics {
  recettes: string;
  depenses: string;
  solde: string;
  creances_clients: string;
  nb_clients_en_retard: number;
}

type Period = 'today' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  loading = signal(false);
  period  = signal<Period>('month');

  ventesData  = signal<VentesAnalytics | null>(null);
  stockData   = signal<StockAnalytics | null>(null);
  financeData = signal<FinanceAnalytics | null>(null);

  // Computed KPIs
  totalVentes   = computed(() => this.ventesData()?.totaux.nb_commandes ?? 0);
  caTTC         = computed(() => parseFloat(this.ventesData()?.totaux.ca_ttc ?? '0'));
  tvaTotal      = computed(() => parseFloat(this.ventesData()?.totaux.tva_total ?? '0'));
  montantPaye   = computed(() => parseFloat(this.ventesData()?.totaux.montant_paye ?? '0'));
  alertesStock  = computed(() => this.stockData()?.nb_produits_en_alerte ?? 0);
  soldeFinance  = computed(() => parseFloat(this.financeData()?.solde ?? '0'));
  recettes      = computed(() => parseFloat(this.financeData()?.recettes ?? '0'));
  depenses      = computed(() => parseFloat(this.financeData()?.depenses ?? '0'));
  creances      = computed(() => parseFloat(this.financeData()?.creances_clients ?? '0'));
  topProduits   = computed(() => this.stockData()?.top_produits_sortie ?? []);
  parDepot      = computed(() => this.ventesData()?.par_depot ?? []);
  produitsAlerte = computed(() => this.stockData()?.produits_en_alerte ?? []);

  readonly PERIODS: { value: Period; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week',  label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year',  label: 'Cette année' },
  ];

  ngOnInit(): void { this.load(); }

  setPeriod(p: Period): void { this.period.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    const { debut, fin } = this.getDateRange();

    forkJoin({
      ventes: this.http.get<VentesAnalytics>(
        `${this.API}/analytics/ventes/?debut=${debut}&fin=${fin}`
      ).pipe(catchError(() => of(null))),
      stock: this.http.get<StockAnalytics>(
        `${this.API}/analytics/stock/?debut=${debut}&fin=${fin}`
      ).pipe(catchError(() => of(null))),
      finance: this.http.get<FinanceAnalytics>(
        `${this.API}/analytics/finance/?debut=${debut}&fin=${fin}`
      ).pipe(catchError(() => of(null))),
    }).subscribe(({ ventes, stock, finance }) => {
      this.ventesData.set(ventes);
      this.stockData.set(stock);
      this.financeData.set(finance);
      this.loading.set(false);
    });
  }

  private getDateRange(): { debut: string; fin: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const fin = fmt(today);

    switch (this.period()) {
      case 'today': return { debut: fin, fin };
      case 'week': {
        const d = new Date(today);
        d.setDate(today.getDate() - 6);
        return { debut: fmt(d), fin };
      }
      case 'month': {
        return { debut: `${fin.slice(0, 7)}-01`, fin };
      }
      case 'year': {
        return { debut: `${fin.slice(0, 4)}-01-01`, fin };
      }
    }
  }

  // Calcul de la largeur de barre (max = ca_ttc total)
  barWidth(caDepot: string): number {
    const total = this.caTTC();
    if (!total) return 0;
    return Math.min(100, (parseFloat(caDepot) / total) * 100);
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(n ?? 0);
  }

  formatPriceStr(s: string | undefined): string {
    return this.formatPrice(parseFloat(s ?? '0'));
  }
}