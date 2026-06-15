import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sale, SaleCreatePayload, SalesService } from '../../../core/services/sales';
import { ProductsService, Product } from '../../../core/services/products';
import { ToastService } from '../../../core/services/toast';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  subtotal: number;
}

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
})
export class Sales implements OnInit {
  private salesService = inject(SalesService);
  private productsService = inject(ProductsService);
  private toast = inject(ToastService);

  readonly PAGE_SIZE = 20;

  sales = signal<Sale[]>([]);
  total = signal(0);
  loading = signal(false);
  page = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());
  pageStart = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  // Nouvelle vente
  showSalePanel = signal(false);
  saleLoading = signal(false);
  products = signal<Product[]>([]);
  cart = signal<CartItem[]>([]);

  clientName = '';
  clientPhone = '';
  paymentMethod: 'cash' | 'mobile_money' | 'credit' = 'cash';
  mobileProvider: 'orange' | 'mtn' = 'orange';
  selectedProductId = '';
  addQty = 1;

  totalHT = computed(() => this.cart().reduce((s, i) => s + i.subtotal, 0));
  totalTVA = computed(() => this.cart().reduce((s, i) => s + (i.subtotal * i.tva_rate / 100), 0));
  totalTTC = computed(() => this.totalHT() + this.totalTVA());

  ngOnInit(): void {
    this.load();
    this.productsService.list({ page_size: 200, is_active: true }).subscribe({
      next: (res) => this.products.set(res.results),
    });
  }

  load(): void {
    this.loading.set(true);
    this.salesService.list({ page: this.page(), page_size: this.PAGE_SIZE }).subscribe({
      next: (res) => { this.sales.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  openSalePanel(): void {
    this.cart.set([]);
    this.clientName = ''; this.clientPhone = '';
    this.paymentMethod = 'cash'; this.selectedProductId = ''; this.addQty = 1;
    this.showSalePanel.set(true);
  }

  closeSalePanel(): void { this.showSalePanel.set(false); }

  addToCart(): void {
    if (!this.selectedProductId || this.addQty <= 0) return;
    const product = this.products().find(p => p.id === +this.selectedProductId);
    if (!product) return;

    const existing = this.cart().findIndex(i => i.product.id === product.id);
    if (existing >= 0) {
      this.cart.update(items => items.map((item, idx) =>
        idx === existing ? { ...item, quantity: item.quantity + this.addQty, subtotal: (item.quantity + this.addQty) * item.unit_price } : item
      ));
    } else {
      this.cart.update(items => [...items, {
        product, quantity: this.addQty,
        unit_price: product.selling_price,
        tva_rate: product.tva_rate,
        subtotal: this.addQty * product.selling_price,
      }]);
    }
    this.selectedProductId = ''; this.addQty = 1;
  }

  removeFromCart(idx: number): void {
    this.cart.update(items => items.filter((_, i) => i !== idx));
  }

  saveSale(): void {
    if (this.cart().length === 0) { this.toast.error('Ajoutez au moins un produit.'); return; }
    this.saleLoading.set(true);

    const payload: SaleCreatePayload = {
      client_name: this.clientName || undefined,
      client_phone: this.clientPhone || undefined,
      items: this.cart().map(i => ({ product: i.product.id, quantity: i.quantity, unit_price: i.unit_price, tva_rate: i.tva_rate })),
      payment_method: this.paymentMethod,
      mobile_money_provider: this.paymentMethod === 'mobile_money' ? this.mobileProvider : undefined,
    };

    this.salesService.create(payload).subscribe({
      next: () => { this.toast.success('Vente enregistrée avec succès !'); this.closeSalePanel(); this.load(); this.saleLoading.set(false); },
      error: (e) => { this.toast.error('Erreur lors de la vente.'); this.saleLoading.set(false); },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(price);
  }

  getStatusLabel(status: string): string {
    return { completed: 'Complétée', pending: 'En attente', cancelled: 'Annulée' }[status] || status;
  }

  getStatusClass(status: string): string {
    return {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      cancelled: 'bg-red-50 text-red-600 border-red-200',
    }[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getPaymentLabel(method: string, provider?: string): string {
    if (method === 'mobile_money') return `Mobile Money (${provider === 'orange' ? 'Orange' : 'MTN'})`;
    return { cash: 'Espèces', credit: 'Crédit' }[method] || method;
  }
}