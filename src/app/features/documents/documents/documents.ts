// ============================================================
// DOCUMENTS — Gestion documentaire
// Chemin : src/app/features/documents/documents/documents.ts
// Ce fichier REMPLACE l'existant — il ajoute upload + delete
// ============================================================
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

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  search = '';
  categoryFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Upload panel
  showUpload = signal(false);
  uploadLoading = signal(false);
  uploadForm: { file: File | null; name: string; category: string } = {
    file: null, name: '', category: 'contrat',
  };

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

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  openUploadPanel(): void {
    this.uploadForm = { file: null, name: '', category: 'contrat' };
    this.showUpload.set(true);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadForm.file = input.files[0];
      if (!this.uploadForm.name) {
        this.uploadForm.name = input.files[0].name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  uploadDocument(): void {
    if (!this.uploadForm.file || !this.uploadForm.name) return;
    this.uploadLoading.set(true);
    const formData = new FormData();
    formData.append('file', this.uploadForm.file);
    formData.append('name', this.uploadForm.name);
    formData.append('category', this.uploadForm.category);
    this.http.post<Document>(`${this.BASE}/`, formData).subscribe({
      next: () => {
        this.toast.success('Document uploadé avec succès.');
        this.showUpload.set(false);
        this.load();
        this.uploadLoading.set(false);
      },
      error: () => { this.toast.error('Erreur lors de l\'upload.'); this.uploadLoading.set(false); },
    });
  }

  deleteDocument(id: number): void {
    if (!confirm('Supprimer ce document définitivement ?')) return;
    this.http.delete(`${this.BASE}/${id}/`).subscribe({
      next: () => { this.toast.success('Document supprimé.'); this.load(); },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }
}