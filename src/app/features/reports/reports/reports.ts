import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ReportData {
  total_ventes: number;
  total_ttc: number;
  total_produits: number;
  total_mouvements: number;
  ventes_par_jour: { date: string; total: number; count: number }[];
  top_produits: { name: string; quantity: number; revenue: number }[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/reports`;

  loading = signal(false);
  data = signal<ReportData | null>(null);
  period = signal<'today' | 'week' | 'month' | 'year'>('month');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<ReportData>(`${this.BASE}/summary/?period=${this.period()}`).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  setPeriod(p: 'today' | 'week' | 'month' | 'year'): void {
    this.period.set(p);
    this.load();
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(n);
  }
}