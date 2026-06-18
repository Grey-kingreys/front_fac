// ============================================================
// PRODUCTS COMPONENT — Version finale avec gestion
//   Catégories et Unités intégrées (onglets)
// Chemin : src/app/features/products/products/products.ts
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Product, ProductPayload, ProductsService,
  Categorie, CategoriePayload,
  Unite, UnitePayload,
} from '../../../core/services/products';
import { ToastService } from '../../../core/services/toast';

type ActiveTab = 'produits' | 'categories' | 'unites';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
})
export class Products implements OnInit {
  private svc   = inject(ProductsService);
  private toast = inject(ToastService);

  // ── Onglet actif ──────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('produits');

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUITS
  // ══════════════════════════════════════════════════════════════════════════

  readonly PAGE_SIZE = 20;

  products   = signal<Product[]>([]);
  total      = signal(0);
  loading    = signal(false);
  page       = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());
  pageStart  = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd    = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showProductPanel   = signal(false);
  isEditingProduct   = signal(false);
  editingProductId   = signal<number | null>(null);
  productPanelLoading = signal(false);

  productForm: ProductPayload = {
    nom: '', reference: '', description: '',
    categorie: 0, unite: 0,
    prix_achat: 0, prix_vente: 0, tva_taux: 18,
  };

  deleteProductTarget  = signal<Product | null>(null);
  deleteProductLoading = signal(false);

  // ══════════════════════════════════════════════════════════════════════════
  // CATÉGORIES
  // ══════════════════════════════════════════════════════════════════════════

  categories        = signal<Categorie[]>([]);
  categoriesLoading = signal(false);

  showCatPanel   = signal(false);
  isEditingCat   = signal(false);
  editingCatId   = signal<number | null>(null);
  catPanelLoading = signal(false);

  catForm: CategoriePayload = { name: '', description: '', couleur: '#6366f1' };

  deleteCatTarget  = signal<Categorie | null>(null);
  deleteCatLoading = signal(false);

  // ══════════════════════════════════════════════════════════════════════════
  // UNITÉS
  // ══════════════════════════════════════════════════════════════════════════

  unites        = signal<Unite[]>([]);
  unitesLoading = signal(false);

  showUnitePanel    = signal(false);
  isEditingUnite    = signal(false);
  editingUniteId    = signal<number | null>(null);
  unitePanelLoading = signal(false);

  uniteForm: UnitePayload = { name: '', symbole: '' };

  deleteUniteTarget  = signal<Unite | null>(null);
  deleteUniteLoading = signal(false);

  // ── Couleurs prédéfinies pour les catégories ──────────────────────────────
  readonly COULEURS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#06b6d4', '#64748b', '#374151',
  ];

  readonly UNITES_SUGGESTIONS: { name: string; symbole: string }[] = [
    { name: 'Kilogramme', symbole: 'kg' },
    { name: 'Gramme',     symbole: 'g'  },
    { name: 'Tonne',      symbole: 't'  },
    { name: 'Litre',      symbole: 'L'  },
    { name: 'Millilitre', symbole: 'mL' },
    { name: 'Pièce',      symbole: 'pce'},
    { name: 'Carton',     symbole: 'ctn'},
    { name: 'Sac',        symbole: 'sac'},
    { name: 'Bouteille',  symbole: 'btl'},
    { name: 'Mètre',      symbole: 'm'  },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // INITIALISATION
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadUnites();
  }

  switchTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES PRODUITS
  // ══════════════════════════════════════════════════════════════════════════

  loadProducts(): void {
    this.loading.set(true);
    this.svc.list({ page: this.page(), page_size: this.PAGE_SIZE, search: this.search || undefined }).subscribe({
      next: (res) => { this.products.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement produits.'); this.loading.set(false); },
    });
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadProducts(); }, 400);
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.loadProducts(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.loadProducts(); } }

  openCreateProduct(): void {
    this.isEditingProduct.set(false);
    this.editingProductId.set(null);
    this.productForm = { nom: '', reference: '', description: '', categorie: 0, unite: 0, prix_achat: 0, prix_vente: 0, tva_taux: 18 };
    this.showProductPanel.set(true);
  }

  openEditProduct(p: Product): void {
    this.isEditingProduct.set(true);
    this.editingProductId.set(p.id);
    this.productForm = {
      nom: p.name, reference: p.reference, description: p.description || '',
      categorie: p.category_id ?? 0, unite: p.unit_id ?? 0,
      prix_achat: p.purchase_price, prix_vente: p.selling_price, tva_taux: p.tva_rate,
    };
    this.showProductPanel.set(true);
  }

  closeProductPanel(): void { this.showProductPanel.set(false); }

  canSaveProduct(): boolean {
    return !!(
      this.productForm.nom?.trim() &&
      this.productForm.reference.trim() &&
      this.productForm.prix_vente > 0 &&
      this.productForm.categorie > 0 &&
      this.productForm.unite > 0
    );
  }

  saveProduct(): void {
    if (!this.canSaveProduct()) return;
    this.productPanelLoading.set(true);
    const obs = this.isEditingProduct()
      ? this.svc.update(this.editingProductId()!, this.productForm)
      : this.svc.create(this.productForm);
    obs.subscribe({
      next: () => {
        this.toast.success(this.isEditingProduct() ? 'Produit mis à jour.' : 'Produit créé !');
        this.closeProductPanel(); this.loadProducts(); this.productPanelLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.productPanelLoading.set(false); },
    });
  }

  openDeleteProduct(p: Product): void  { this.deleteProductTarget.set(p); }
  closeDeleteProduct(): void           { this.deleteProductTarget.set(null); }

  executeDeleteProduct(): void {
    const p = this.deleteProductTarget();
    if (!p) return;
    this.deleteProductLoading.set(true);
    this.svc.remove(p.id).subscribe({
      next: () => { this.toast.success('Produit supprimé.'); this.closeDeleteProduct(); this.loadProducts(); this.deleteProductLoading.set(false); },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.deleteProductLoading.set(false); },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES CATÉGORIES
  // ══════════════════════════════════════════════════════════════════════════

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.svc.listCategories().subscribe({
      next: (res) => { this.categories.set(res.results); this.categoriesLoading.set(false); },
      error: () => { this.categoriesLoading.set(false); },
    });
  }

  openCreateCat(): void {
    this.isEditingCat.set(false);
    this.editingCatId.set(null);
    this.catForm = { name: '', description: '', couleur: '#6366f1' };
    this.showCatPanel.set(true);
  }

  openEditCat(c: Categorie): void {
    this.isEditingCat.set(true);
    this.editingCatId.set(c.id);
    this.catForm = { name: c.name, description: c.description || '', couleur: c.couleur };
    this.showCatPanel.set(true);
  }

  closeCatPanel(): void { this.showCatPanel.set(false); }
  canSaveCat(): boolean { return !!this.catForm.name.trim(); }

  saveCat(): void {
    if (!this.canSaveCat()) return;
    this.catPanelLoading.set(true);
    const obs = this.isEditingCat()
      ? this.svc.updateCategorie(this.editingCatId()!, this.catForm)
      : this.svc.createCategorie(this.catForm);
    obs.subscribe({
      next: () => {
        this.toast.success(this.isEditingCat() ? 'Catégorie mise à jour.' : 'Catégorie créée !');
        this.closeCatPanel(); this.loadCategories(); this.catPanelLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.catPanelLoading.set(false); },
    });
  }

  openDeleteCat(c: Categorie): void  { this.deleteCatTarget.set(c); }
  closeDeleteCat(): void             { this.deleteCatTarget.set(null); }

  executeDeleteCat(): void {
    const c = this.deleteCatTarget();
    if (!c) return;
    this.deleteCatLoading.set(true);
    this.svc.deleteCategorie(c.id).subscribe({
      next: () => { this.toast.success('Catégorie supprimée.'); this.closeDeleteCat(); this.loadCategories(); this.deleteCatLoading.set(false); },
      error: (e) => { this.toast.error(this.extractError(e, 'Impossible de supprimer (produits liés ?)')); this.deleteCatLoading.set(false); },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTHODES UNITÉS
  // ══════════════════════════════════════════════════════════════════════════

  loadUnites(): void {
    this.unitesLoading.set(true);
    this.svc.listUnites().subscribe({
      next: (res) => { this.unites.set(res.results); this.unitesLoading.set(false); },
      error: () => { this.unitesLoading.set(false); },
    });
  }

  openCreateUnite(): void {
    this.isEditingUnite.set(false);
    this.editingUniteId.set(null);
    this.uniteForm = { name: '', symbole: '' };
    this.showUnitePanel.set(true);
  }

  openEditUnite(u: Unite): void {
    this.isEditingUnite.set(true);
    this.editingUniteId.set(u.id);
    this.uniteForm = { name: u.name, symbole: u.symbole };
    this.showUnitePanel.set(true);
  }

  closeUnitePanel(): void { this.showUnitePanel.set(false); }
  canSaveUnite(): boolean { return !!(this.uniteForm.name.trim() && this.uniteForm.symbole.trim()); }

  saveUnite(): void {
    if (!this.canSaveUnite()) return;
    this.unitePanelLoading.set(true);
    const obs = this.isEditingUnite()
      ? this.svc.updateUnite(this.editingUniteId()!, this.uniteForm)
      : this.svc.createUnite(this.uniteForm);
    obs.subscribe({
      next: () => {
        this.toast.success(this.isEditingUnite() ? 'Unité mise à jour.' : 'Unité créée !');
        this.closeUnitePanel(); this.loadUnites(); this.unitePanelLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.unitePanelLoading.set(false); },
    });
  }

  openDeleteUnite(u: Unite): void  { this.deleteUniteTarget.set(u); }
  closeDeleteUnite(): void         { this.deleteUniteTarget.set(null); }

  executeDeleteUnite(): void {
    const u = this.deleteUniteTarget();
    if (!u) return;
    this.deleteUniteLoading.set(true);
    this.svc.deleteUnite(u.id).subscribe({
      next: () => { this.toast.success('Unité supprimée.'); this.closeDeleteUnite(); this.loadUnites(); this.deleteUniteLoading.set(false); },
      error: (e) => { this.toast.error(this.extractError(e, 'Impossible (produits liés ?)')); this.deleteUniteLoading.set(false); },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════════════════════════

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(price || 0);
  }

  extractError(err: unknown, fallback: string): string {
    const e = (err as { error?: unknown })?.error;
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    const vals = Object.values(e as Record<string, unknown>);
    const first = vals[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    return fallback;
  }
}