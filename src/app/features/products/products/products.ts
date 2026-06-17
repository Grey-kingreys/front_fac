import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, ProductPayload, ProductsService } from '../../../core/services/products';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
})
export class Products implements OnInit {
  private productsService = inject(ProductsService);
  private toast = inject(ToastService);

  readonly PAGE_SIZE = 20;

  products = signal<Product[]>([]);
  total = signal(0);
  loading = signal(false);
  page = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());
  pageStart = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showPanel = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);
  panelLoading = signal(false);

  formData: ProductPayload = {
    name: '', reference: '', description: '', category: '',
    unit: 'pièce', purchase_price: 0, selling_price: 0, tva_rate: 18,
  };

  deleteTarget = signal<Product | null>(null);
  deleteLoading = signal(false);

  readonly units = ['pièce', 'kg', 'litre', 'carton', 'sac', 'tonne', 'mètre', 'lot'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.productsService.list({
      page: this.page(),
      page_size: this.PAGE_SIZE,
      search: this.search || undefined,
    }).subscribe({
      next: (res) => { this.products.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  openCreate(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.formData = {
      name: '', reference: '', description: '', category: '',
      unit: 'pièce', purchase_price: 0, selling_price: 0, tva_rate: 18,
    };
    this.showPanel.set(true);
  }

  openEdit(product: Product): void {
    this.isEditing.set(true);
    this.editingId.set(product.id);
    this.formData = {
      name: product.name,
      reference: product.reference,
      description: product.description || '',
      category: product.category || '',
      unit: product.unit,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      tva_rate: product.tva_rate,
    };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }

  canSave(): boolean {
    return !!(this.formData.name.trim() && this.formData.reference.trim() && this.formData.selling_price > 0);
  }

  save(): void {
    if (!this.canSave()) return;
    this.panelLoading.set(true);

    const obs = this.isEditing()
      ? this.productsService.update(this.editingId()!, this.formData)
      : this.productsService.create(this.formData);

    obs.subscribe({
      next: () => {
        this.toast.success(this.isEditing() ? 'Produit mis à jour.' : 'Produit créé.');
        this.closePanel(); this.load(); this.panelLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.panelLoading.set(false); },
    });
  }

  openDelete(product: Product): void { this.deleteTarget.set(product); }
  closeDelete(): void { this.deleteTarget.set(null); }

  executeDelete(): void {
    const p = this.deleteTarget();
    if (!p) return;
    this.deleteLoading.set(true);
    this.productsService.remove(p.id).subscribe({
      next: () => {
        this.toast.success('Produit supprimé.');
        this.closeDelete(); this.load(); this.deleteLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.deleteLoading.set(false); },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(price);
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