import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast';
import { environment } from '../../../../environments/environment';

interface Document {
  id: number;
  name: string;
  category: string;
  file_url: string;
  file_size: number;
  created_by_name: string;
  created_at: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.html',
})
export class Documents implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private readonly BASE = `${environment.apiUrl}/documents`;

  documents = signal<Document[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  readonly PAGE_SIZE = 20;
  protected readonly Math = Math;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  search = '';
  categoryFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const params = new URLSearchParams();
    params.set('page', String(this.page()));
    params.set('page_size', String(this.PAGE_SIZE));
    if (this.search) params.set('search', this.search);
    if (this.categoryFilter) params.set('category', this.categoryFilter);
    this.http.get<{ count: number; results: Document[] }>(`${this.BASE}/?${params}`).subscribe({
      next: (res) => { this.documents.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  getCategoryClass(cat: string): string {
    const classes: Record<string, string> = {
      bon_livraison: 'bg-blue-50 text-blue-700 border-blue-200',
      facture: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      contrat: 'bg-purple-50 text-purple-700 border-purple-200',
      rapport: 'bg-orange-50 text-orange-700 border-orange-200',
      autre: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return classes[cat] || classes['autre'];
  }

  getCategoryLabel(cat: string): string {
    const labels: Record<string, string> = { bon_livraison: 'Bon de livraison', facture: 'Facture', contrat: 'Contrat', rapport: 'Rapport', autre: 'Autre' };
    return labels[cat] || cat;
  }
}