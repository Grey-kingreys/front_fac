// ============================================================
// DASHBOARD — Connecté aux vraies données API
// Chemin : src/app/features/dashboard/dashboard.ts
// Charge : rapports, stocks faibles, sessions ouvertes, missions actives
// ============================================================
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

export type RoleGroup = 'superadmin' | 'manager' | 'stock' | 'cashier' | 'driver' | 'commercial' | 'other';

interface DashboardStats {
  total_produits: number;
  total_ventes_jour: number;
  chiffre_affaires_jour: number;
  chiffre_affaires_mois: number;
  solde_caisses: number;
  stocks_faibles: number;
  missions_actives: number;
  employes_actifs: number;
  top_produits: { name: string; quantity: number; revenue: number }[];
  ventes_recentes: { id: number; reference: string; client_name: string; total_ttc: number; created_at: string }[];
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
  stats = signal<DashboardStats | null>(null);

  roleGroup = computed((): RoleGroup => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'superadmin':                        return 'superadmin';
      case 'admin': case 'superviseur':         return 'manager';
      case 'gestionnaire_stock':                return 'stock';
      case 'caissier':                          return 'cashier';
      case 'chauffeur':                         return 'driver';
      case 'commercial':                        return 'commercial';
      default:                                  return 'other';
    }
  });

  // KPIs calculés depuis les stats
  totalProduits   = computed(() => this.stats()?.total_produits ?? 0);
  ventesJour      = computed(() => this.stats()?.total_ventes_jour ?? 0);
  caJour          = computed(() => this.stats()?.chiffre_affaires_jour ?? 0);
  caMois          = computed(() => this.stats()?.chiffre_affaires_mois ?? 0);
  soldeCaisses    = computed(() => this.stats()?.solde_caisses ?? 0);
  stocksFaibles   = computed(() => this.stats()?.stocks_faibles ?? 0);
  missionsActives = computed(() => this.stats()?.missions_actives ?? 0);
  employesActifs  = computed(() => this.stats()?.employes_actifs ?? 0);
  topProduits     = computed(() => this.stats()?.top_produits ?? []);
  ventesRecentes  = computed(() => this.stats()?.ventes_recentes ?? []);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.http.get<DashboardStats>(`${environment.apiUrl}/reports/summary/?period=today`).subscribe({
      next: (res) => { this.stats.set(res); this.loading.set(false); },
      error: () => {
        // En cas d'erreur API, on continue avec les valeurs null (affiche --)
        this.loading.set(false);
      },
    });
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(n);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }
}