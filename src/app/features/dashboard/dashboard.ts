// ============================================================
// DASHBOARD — Version finale corrigée
// Chemin : src/app/features/dashboard/dashboard.ts
//
// CORRECTIONS vs version précédente :
//   - Ajout soldeCaisses = computed depuis financeData
//   - Ajout topProduits, ventesRecentes (n'existaient pas)
//   - Ajout formatDate()
//   - Le dashboard.html du projet utilise encore ces noms
// ============================================================
import { Component, OnInit, inject, computed, signal, ElementRef, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { ChartCard } from '../../shared/ui-kit/chart-card/chart-card';
import { environment } from '../../../environments/environment';

export type RoleGroup = 'superadmin' | 'manager' | 'stock' | 'cashier' | 'driver' | 'commercial' | 'other';

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

interface SuperAdminData {
  companies: { total: number; actives: number; suspendues: number };
  utilisateurs_actifs: number;
  ventes_du_jour: { count: number; montant_ttc: string };
  alertes_stock: number;
  missions_actives: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, NgxChartsModule, ChartCard],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private host = inject(ElementRef<HTMLElement>);

  currentUser = this.authService.currentUser;
  loading = signal(false);

  // Taille explicite des graphiques ngx-charts, recalculée à chaque
  // changement de largeur (resize fenêtre + repli sidebar) via ResizeObserver.
  // ngx-charts ne mesure pas son conteneur de façon fiable quand il est
  // révélé par un @if/@else — d'où le passage d'un [view] explicite.
  chartView = signal<[number, number]>([320, 256]);

  constructor() {
    afterNextRender(() => {
      const ro = new ResizeObserver(() => this.updateChartView());
      ro.observe(this.host.nativeElement);
      this.updateChartView();
    });
  }

  private updateChartView(): void {
    const inner = Math.min(this.host.nativeElement.clientWidth || 0, 1280);
    if (!inner) return;
    const twoCol = window.innerWidth >= 1024; // breakpoint Tailwind lg
    const chartW = twoCol ? (inner - 24) / 2 - 48 : inner - 48; // gap + padding carte
    this.chartView.set([Math.max(Math.floor(chartW), 200), 256]);
  }

  ventesData  = signal<VentesAnalytics | null>(null);
  stockData   = signal<StockAnalytics | null>(null);
  financeData = signal<FinanceAnalytics | null>(null);
  superAdminData = signal<SuperAdminData | null>(null);

  roleGroup = computed((): RoleGroup => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'superadmin':                      return 'superadmin';
      case 'admin': case 'superviseur':       return 'manager';
      case 'gestionnaire_stock':              return 'stock';
      case 'caissier':                        return 'cashier';
      case 'chauffeur':                       return 'driver';
      case 'commercial':                      return 'commercial';
      default:                                return 'other';
    }
  });

  // ── KPIs utilisés dans dashboard.html ──────────────────────────────────────
  ventesJour    = computed(() => this.ventesData()?.totaux?.nb_commandes ?? 0);
  caJour        = computed(() => parseFloat(this.ventesData()?.totaux?.ca_ttc ?? '0'));
  caMois        = computed(() => parseFloat(this.ventesData()?.totaux?.ca_ttc ?? '0'));
  stocksFaibles = computed(() => this.stockData()?.nb_produits_en_alerte ?? 0);
  totalProduits = computed(() => 0); // non disponible dans analytics

  // soldeCaisses = solde net finance (recettes - depenses)
  soldeCaisses  = computed(() => parseFloat(this.financeData()?.solde ?? '0'));

  // missionsActives : depuis superadmin ou statique 0
  missionsActives = computed(() => this.superAdminData()?.missions_actives ?? 0);
  employesActifs  = computed(() => this.superAdminData()?.utilisateurs_actifs ?? 0);

  // topProduits : top sorties depuis analytics stock
  topProduits = computed(() =>
    (this.stockData()?.top_produits_sortie ?? []).map(p => ({
      name: p.nom,
      quantity: Number(p.total_sortie),
      revenue: 0, // pas disponible dans analytics stock
    }))
  );

  // ventesRecentes : pas disponible dans analytics — tableau vide
  ventesRecentes = computed<{ id: number; reference: string; client_name: string; total_ttc: number; created_at: string }[]>(() => []);

  // SuperAdmin KPIs
  totalCompanies  = computed(() => this.superAdminData()?.companies?.total ?? 0);
  activeCompanies = computed(() => this.superAdminData()?.companies?.actives ?? 0);
  totalUsers      = computed(() => this.superAdminData()?.utilisateurs_actifs ?? 0);
  topDepots       = computed(() => this.ventesData()?.par_depot?.slice(0, 5) ?? []);
  produitsAlerte  = computed(() => this.stockData()?.produits_en_alerte?.slice(0, 5) ?? []);

  // ── Graphiques (ngx-charts) ────────────────────────────────────────────────
  // ⚠️ Données codées en dur pour l'instant — à brancher sur /analytics/* plus tard.
  // Palette alignée sur theme.ts (identique à l'app mobile fl_chart).
  readonly chartScheme: Color = {
    name: 'djoulagest',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#1A56A0', '#0E9F6E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  };

  // Courbe — CA des 7 derniers jours (area chart)
  readonly caTrend = [{
    name: 'Chiffre d\'affaires',
    series: [
      { name: 'Lun', value: 3_200_000 },
      { name: 'Mar', value: 4_100_000 },
      { name: 'Mer', value: 3_800_000 },
      { name: 'Jeu', value: 5_200_000 },
      { name: 'Ven', value: 4_800_000 },
      { name: 'Sam', value: 6_100_000 },
      { name: 'Dim', value: 5_400_000 },
    ],
  }];

  // Barres — Top produits (quantités vendues du jour)
  readonly topProduitsChart = [
    { name: 'Riz 50kg', value: 120 },
    { name: 'Huile 5L', value: 90 },
    { name: 'Sucre 1kg', value: 75 },
    { name: 'Lait', value: 60 },
    { name: 'Farine', value: 45 },
  ];

  // Donut — Modes de paiement
  readonly paiementsChart = [
    { name: 'Espèces', value: 55 },
    { name: 'Orange Money', value: 28 },
    { name: 'MTN Money', value: 12 },
    { name: 'Crédit', value: 5 },
  ];

  // Barres — Ventes par dépôt (CA du jour, M GNF)
  readonly ventesParDepotChart = [
    { name: 'Kaloum', value: 32 },
    { name: 'Matam', value: 24 },
    { name: 'Ratoma', value: 28 },
    { name: 'Coyah', value: 16 },
  ];

  // Donut — Mouvements de stock (gestionnaire)
  readonly mouvementsChart = [
    { name: 'Entrées', value: 42 },
    { name: 'Sorties', value: 35 },
    { name: 'Transferts', value: 15 },
    { name: 'Ajustements', value: 8 },
  ];

  // Barres — Niveau de stock par dépôt (gestionnaire)
  readonly stockParDepotChart = [
    { name: 'Kaloum', value: 850 },
    { name: 'Matam', value: 620 },
    { name: 'Ratoma', value: 740 },
    { name: 'Coyah', value: 410 },
  ];

  // Donut — Statuts des missions (chauffeur)
  readonly missionsStatutChart = [
    { name: 'Terminées', value: 18 },
    { name: 'En transit', value: 5 },
    { name: 'Planifiées', value: 4 },
    { name: 'Litige', value: 1 },
  ];

  // Barres — Top clients (commercial, M GNF)
  readonly topClientsChart = [
    { name: 'Diallo', value: 48 },
    { name: 'Bah', value: 36 },
    { name: 'Camara', value: 30 },
    { name: 'Sow', value: 22 },
  ];

  // Courbe — Croissance des entreprises (superadmin, 7 mois)
  readonly companiesGrowth = [{
    name: 'Entreprises',
    series: [
      { name: 'Déc', value: 2 },
      { name: 'Jan', value: 3 },
      { name: 'Fév', value: 3 },
      { name: 'Mar', value: 4 },
      { name: 'Avr', value: 5 },
      { name: 'Mai', value: 6 },
      { name: 'Juin', value: 8 },
    ],
  }];

  // Donut — Statut des entreprises (superadmin)
  readonly companiesStatusChart = [
    { name: 'Actives', value: 6 },
    { name: 'Suspendues', value: 2 },
  ];

  // Formate les montants de l'axe Y de la courbe CA en « k »/« M ».
  formatYAxis = (value: number): string => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + ' M';
    if (value >= 1_000) return Math.round(value / 1_000) + ' k';
    return `${value}`;
  };

  ngOnInit(): void { this.loadStats(); }

  loadStats(): void {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = today.slice(0, 7) + '-01';
    this.loading.set(true);

    if (this.roleGroup() === 'superadmin') {
      this.http.get<SuperAdminData>(`${environment.apiUrl}/superadmin/dashboard/`)
        .pipe(catchError(() => of(null)))
        .subscribe(data => { this.superAdminData.set(data); this.loading.set(false); });
      return;
    }

    forkJoin({
      ventes: this.http.get<VentesAnalytics>(
        `${environment.apiUrl}/analytics/ventes/?debut=${today}&fin=${today}`
      ).pipe(catchError(() => of(null))),
      stock: this.http.get<StockAnalytics>(
        `${environment.apiUrl}/analytics/stock/?debut=${today}&fin=${today}`
      ).pipe(catchError(() => of(null))),
      finance: this.http.get<FinanceAnalytics>(
        `${environment.apiUrl}/analytics/finance/?debut=${firstDay}&fin=${today}`
      ).pipe(catchError(() => of(null))),
    }).subscribe(({ ventes, stock, finance }) => {
      this.ventesData.set(ventes);
      this.stockData.set(stock);
      this.financeData.set(finance);
      this.loading.set(false);
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(n ?? 0);
  }

  formatPriceStr(s: string | undefined): string {
    return this.formatPrice(parseFloat(s ?? '0'));
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }
}