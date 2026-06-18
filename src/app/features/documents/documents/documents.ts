// ============================================================
// DOCUMENTS COMPONENT — Version corrigée
// Chemin : src/app/features/documents/documents/documents.ts
//
// CORRECTIONS :
//   - URL : /api/documents/ (route RH, pas une route générique)
//   - Champs document : name/category/file_url → titre/type_document/fichier
//   - created_by_name → uploade_par_nom
//   - Upload : FormData avec fichier + titre + type_document
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast';
import { environment } from '../../../../environments/environment';

// ── Interface (correspond à DocumentSerializer) ───────────────────────────────

export interface Document {
  id: number;
  type_document: string;      // 'contrat' | 'facture_fournisseur' | 'bon_livraison' | 'autre'
  type_label: string;
  titre: string;
  fichier: string;            // URL du fichier
  employe: number | null;
  employe_nom: string | null;
  uploade_par_nom: string;
  created_at: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.html',
})
export class Documents implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);
  // ✅ Vraie URL backend
  private readonly BASE = `${environment.apiUrl}/documents`;

  documents = signal<Document[]>([]);
  loading   = signal(false);
  total     = signal(0);
  page      = signal(1);
  readonly PAGE_SIZE = 20;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());

  search         = '';
  categoryFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Panneau upload
  showUpload    = signal(false);
  uploadLoading = signal(false);

  // ✅ Champs corrects pour DocumentSerializer
  uploadForm: { file: File | null; titre: string; type_document: string } = {
    file: null, titre: '', type_document: 'contrat',
  };

  readonly docTypes = [
    { value: 'contrat',            label: 'Contrat de travail' },
    { value: 'facture_fournisseur',label: 'Facture fournisseur' },
    { value: 'bon_livraison',      label: 'Bon de livraison' },
    { value: 'autre',              label: 'Autre' },
  ];

  readonly typeColors: Record<string, string> = {
    contrat:             'bg-purple-100 text-purple-700',
    facture_fournisseur: 'bg-amber-100 text-amber-700',
    bon_livraison:       'bg-blue-100 text-blue-700',
    autre:               'bg-gray-100 text-gray-600',
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const params = new URLSearchParams();
    params.set('page', String(this.page()));
    params.set('page_size', String(this.PAGE_SIZE));
    if (this.search)         params.set('search', this.search);
    if (this.categoryFilter) params.set('type_document', this.categoryFilter);

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
    this.uploadForm = { file: null, titre: '', type_document: 'contrat' };
    this.showUpload.set(true);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.uploadForm.file = input.files[0];
      // Auto-rempli le titre avec le nom du fichier (sans extension)
      if (!this.uploadForm.titre) {
        this.uploadForm.titre = input.files[0].name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  canUpload(): boolean {
    return !!(this.uploadForm.file && this.uploadForm.titre.trim());
  }

  uploadDocument(): void {
    if (!this.canUpload()) return;
    this.uploadLoading.set(true);

    // ✅ Champs corrects : fichier, titre, type_document
    const formData = new FormData();
    formData.append('fichier', this.uploadForm.file!);
    formData.append('titre', this.uploadForm.titre.trim());
    formData.append('type_document', this.uploadForm.type_document);

    this.http.post<Document>(`${this.BASE}/`, formData).subscribe({
      next: () => {
        this.toast.success('Document uploadé avec succès.');
        this.showUpload.set(false);
        this.load();
        this.uploadLoading.set(false);
      },
      error: (e) => {
        const msg = (e?.error?.fichier?.[0]) || (e?.error?.titre?.[0]) || 'Erreur lors de l\'upload.';
        this.toast.error(msg);
        this.uploadLoading.set(false);
      },
    });
  }

  deleteDocument(id: number): void {
    if (!confirm('Supprimer ce document définitivement ?')) return;
    this.http.delete(`${this.BASE}/${id}/`).subscribe({
      next: () => { this.toast.success('Document supprimé.'); this.load(); },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  getTypeLabel(type: string): string {
    return this.docTypes.find(t => t.value === type)?.label || type;
  }

  getTypeColor(type: string): string {
    return this.typeColors[type] || 'bg-gray-100 text-gray-600';
  }

  // Extrait l'extension d'une URL de fichier
  getFileExt(url: string): string {
    return url?.split('.').pop()?.toLowerCase() ?? '';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}