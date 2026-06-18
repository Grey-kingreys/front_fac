// ============================================================
// UNITES COMPONENT — Interface de gestion des unités
// Chemin : src/app/features/unites/unites/unites.ts
//
// Champs backend confirmés :
//   POST/PATCH /api/unites/
//     name    : obligatoire
//     symbole : obligatoire, UNIQUE par company
//     is_active : optionnel, défaut true
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Unite, UnitePayload } from '../../../core/services/products';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-unites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unites.html',
})
export class Unites implements OnInit {
  private svc   = inject(ProductsService);
  private toast = inject(ToastService);

  // ── Données ───────────────────────────────────────────────────────────────
  unites       = signal<Unite[]>([]);
  loading      = signal(false);
  total        = computed(() => this.unites().length);
  activeCount  = computed(() => this.unites().filter(u => u.is_active).length);

  // ── Panneau création / édition ────────────────────────────────────────────
  showPanel    = signal(false);
  isEditing    = signal(false);
  editingId    = signal<number | null>(null);
  panelLoading = signal(false);

  form: UnitePayload = { name: '', symbole: '', is_active: true };

  // ── Suppression ───────────────────────────────────────────────────────────
  deleteTarget  = signal<Unite | null>(null);
  deleteLoading = signal(false);

  // ── Suggestions d'unités courantes ────────────────────────────────────────
  readonly SUGGESTIONS: { name: string; symbole: string; groupe: string }[] = [
    // Masse
    { name: 'Kilogramme', symbole: 'kg',  groupe: 'Masse' },
    { name: 'Gramme',     symbole: 'g',   groupe: 'Masse' },
    { name: 'Tonne',      symbole: 't',   groupe: 'Masse' },
    // Volume
    { name: 'Litre',      symbole: 'L',   groupe: 'Volume' },
    { name: 'Millilitre', symbole: 'mL',  groupe: 'Volume' },
    { name: 'Centilitre', symbole: 'cL',  groupe: 'Volume' },
    // Conditionnement
    { name: 'Pièce',      symbole: 'pce', groupe: 'Conditionnement' },
    { name: 'Carton',     symbole: 'ctn', groupe: 'Conditionnement' },
    { name: 'Sac',        symbole: 'sac', groupe: 'Conditionnement' },
    { name: 'Bouteille',  symbole: 'btl', groupe: 'Conditionnement' },
    { name: 'Boîte',      symbole: 'bte', groupe: 'Conditionnement' },
    { name: 'Palette',    symbole: 'pal', groupe: 'Conditionnement' },
    // Longueur
    { name: 'Mètre',      symbole: 'm',   groupe: 'Longueur' },
    { name: 'Centimètre', symbole: 'cm',  groupe: 'Longueur' },
  ];

  readonly GROUPES = ['Masse', 'Volume', 'Conditionnement', 'Longueur'];

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.listUnites({ page_size: 200 }).subscribe({
      next: (res) => { this.unites.set(res.results); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement unités.'); this.loading.set(false); },
    });
  }

  getSuggestionsByGroupe(groupe: string): typeof this.SUGGESTIONS {
    return this.SUGGESTIONS.filter(s => s.groupe === groupe);
  }

  // Vérifie si une suggestion est déjà utilisée (même symbole)
  isSuggestionUsed(symbole: string): boolean {
    return this.unites().some(u => u.symbole.toLowerCase() === symbole.toLowerCase());
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = { name: '', symbole: '', is_active: true };
    this.showPanel.set(true);
  }

  openEdit(u: Unite): void {
    this.isEditing.set(true);
    this.editingId.set(u.id);
    this.form = { name: u.name, symbole: u.symbole, is_active: u.is_active };
    this.showPanel.set(true);
  }

  applySuggestion(s: { name: string; symbole: string }): void {
    this.form.name    = s.name;
    this.form.symbole = s.symbole;
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSave(): boolean {
    return !!(this.form.name?.trim() && this.form.symbole?.trim());
  }

  save(): void {
    if (!this.canSave()) return;
    this.panelLoading.set(true);

    const payload: UnitePayload = {
      name:      this.form.name.trim(),
      symbole:   this.form.symbole.trim(),
      is_active: this.form.is_active ?? true,
    };

    const obs = this.isEditing()
      ? this.svc.updateUnite(this.editingId()!, payload)
      : this.svc.createUnite(payload);

    obs.subscribe({
      next: (u) => {
        this.toast.success(this.isEditing()
          ? `Unité "${u.name}" mise à jour.`
          : `Unité "${u.name} (${u.symbole})" créée !`);
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

  openDelete(u: Unite): void  { this.deleteTarget.set(u); }
  closeDelete(): void         { this.deleteTarget.set(null); }

  executeDelete(): void {
    const u = this.deleteTarget();
    if (!u) return;
    this.deleteLoading.set(true);
    this.svc.deleteUnite(u.id).subscribe({
      next: () => {
        this.toast.success(`Unité "${u.name}" supprimée.`);
        this.closeDelete();
        this.load();
        this.deleteLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Impossible de supprimer (des produits utilisent cette unité ?).'));
        this.deleteLoading.set(false);
      },
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

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