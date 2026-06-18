// ============================================================
// CATEGORIES COMPONENT — Interface de gestion des catégories
// Chemin : src/app/features/categories/categories/categories.ts
//
// Ce composant est une interface dédiée à la gestion des
// catégories de produits, appelée depuis la page Produits
// (onglet Catégories) ou directement depuis la route /categories
//
// Champs backend confirmés :
//   POST/PATCH /api/categories/
//     name        : obligatoire, unique par company
//     description : optionnel
//     couleur     : optionnel, défaut "#6366f1"
//     tva_taux    : optionnel, défaut 0 (taux TVA par défaut)
//     is_active   : optionnel, défaut true
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Categorie, CategoriePayload } from '../../../core/services/products';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
})
export class Categories implements OnInit {
  private svc   = inject(ProductsService);
  private toast = inject(ToastService);

  // ── Données ───────────────────────────────────────────────────────────────
  categories = signal<Categorie[]>([]);
  loading    = signal(false);
  total      = computed(() => this.categories().length);
  activeCount = computed(() => this.categories().filter(c => c.is_active).length);

  // ── Panneau création / édition ────────────────────────────────────────────
  showPanel    = signal(false);
  isEditing    = signal(false);
  editingId    = signal<number | null>(null);
  panelLoading = signal(false);

  // Formulaire avec TOUS les champs du backend
  form: CategoriePayload = {
    name:        '',
    description: '',
    couleur:     '#6366f1',
    tva_taux:    0,
    is_active:   true,
  };

  // ── Suppression ───────────────────────────────────────────────────────────
  deleteTarget  = signal<Categorie | null>(null);
  deleteLoading = signal(false);

  // ── Palette de couleurs prédéfinies ───────────────────────────────────────
  readonly PALETTE = [
    { hex: '#6366f1', label: 'Indigo'    },
    { hex: '#8b5cf6', label: 'Violet'    },
    { hex: '#ec4899', label: 'Rose'      },
    { hex: '#ef4444', label: 'Rouge'     },
    { hex: '#f97316', label: 'Orange'    },
    { hex: '#eab308', label: 'Jaune'     },
    { hex: '#22c55e', label: 'Vert'      },
    { hex: '#14b8a6', label: 'Teal'      },
    { hex: '#3b82f6', label: 'Bleu'      },
    { hex: '#06b6d4', label: 'Cyan'      },
    { hex: '#64748b', label: 'Ardoise'   },
    { hex: '#374151', label: 'Gris foncé'},
  ];

  // ── Taux TVA courants en Guinée ───────────────────────────────────────────
  readonly TVA_PRESETS = [
    { value: 0,  label: 'Exonéré (0%)' },
    { value: 18, label: 'Standard (18%)' },
    { value: 5,  label: 'Réduit (5%)' },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.listCategories({ page_size: 200 }).subscribe({
      next: (res) => { this.categories.set(res.results); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement catégories.'); this.loading.set(false); },
    });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = { name: '', description: '', couleur: '#6366f1', tva_taux: 0, is_active: true };
    this.showPanel.set(true);
  }

  openEdit(cat: Categorie): void {
    this.isEditing.set(true);
    this.editingId.set(cat.id);
    this.form = {
      name:        cat.name,
      description: cat.description || '',
      couleur:     cat.couleur || '#6366f1',
      // tva_taux vient en string depuis le backend (Decimal) → on parse
      tva_taux:    parseFloat(cat.tva_taux ?? '0'),
      is_active:   cat.is_active,
    };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSave(): boolean { return !!this.form.name?.trim(); }

  save(): void {
    if (!this.canSave()) return;
    this.panelLoading.set(true);

    const payload: CategoriePayload = {
      name:      this.form.name.trim(),
      couleur:   this.form.couleur || '#6366f1',
      tva_taux:  this.form.tva_taux ?? 0,
      is_active: this.form.is_active ?? true,
    };
    if (this.form.description?.trim()) payload.description = this.form.description.trim();

    const obs = this.isEditing()
      ? this.svc.updateCategorie(this.editingId()!, payload)
      : this.svc.createCategorie(payload);

    obs.subscribe({
      next: (cat) => {
        this.toast.success(this.isEditing()
          ? `Catégorie "${cat.name}" mise à jour.`
          : `Catégorie "${cat.name}" créée !`);
        this.closePanel();
        this.load();
        this.panelLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Erreur lors de la sauvegarde.'));
        this.panelLoading.set(false);
      },
    });
  }

  openDelete(cat: Categorie): void  { this.deleteTarget.set(cat); }
  closeDelete(): void               { this.deleteTarget.set(null); }

  executeDelete(): void {
    const cat = this.deleteTarget();
    if (!cat) return;
    this.deleteLoading.set(true);
    this.svc.deleteCategorie(cat.id).subscribe({
      next: () => {
        this.toast.success(`Catégorie "${cat.name}" supprimée.`);
        this.closeDelete();
        this.load();
        this.deleteLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Impossible de supprimer (des produits y sont liés ?).'));
        this.deleteLoading.set(false);
      },
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  getTvaLabel(tva: string | number): string {
    const v = parseFloat(String(tva));
    if (v === 0) return 'Exonéré';
    return `${v}%`;
  }

  extractError(err: unknown, fallback: string): string {
    const e = (err as { error?: unknown })?.error;
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    const vals = Object.values(e as Record<string, unknown>);
    const first = vals[0];
    if (Array.isArray(first) && first.length) return String((first as unknown[])[0]);
    return fallback;
  }
}