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
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
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
  imports: [RouterLink, CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  currentUser = this.authService.currentUser;
  loading = signal(false);

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
  ventesJour    = computed(() => this.ventesData()?.totaux.nb_commandes ?? 0);
  caJour        = computed(() => parseFloat(this.ventesData()?.totaux.ca_ttc ?? '0'));
  caMois        = computed(() => parseFloat(this.ventesData()?.totaux.ca_ttc ?? '0'));
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
  totalCompanies  = computed(() => this.superAdminData()?.companies.total ?? 0);
  activeCompanies = computed(() => this.superAdminData()?.companies.actives ?? 0);
  totalUsers      = computed(() => this.superAdminData()?.utilisateurs_actifs ?? 0);
  topDepots       = computed(() => this.ventesData()?.par_depot?.slice(0, 5) ?? []);
  produitsAlerte  = computed(() => this.stockData()?.produits_en_alerte?.slice(0, 5) ?? []);

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