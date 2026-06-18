// ============================================================
// SALES COMPONENT — Version corrigée et complète
// Chemin : src/app/features/sales/sales/sales.ts
//
// CORRECTIONS APPLIQUÉES :
//   - Import Sale, SalesService depuis le nouveau service corrigé
//   - Payload saveSale() utilise les vrais champs backend :
//       lignes (pas items), produit (pas product), quantite (pas quantity)
//       mode_paiement_initial avec 'especes'/'orange_money'/'mtn_money'
//   - Récupère le depot_id depuis l'utilisateur connecté (AuthService)
//   - Affichage dans le template : sale.numero (pas sale.reference)
//       sale.client_nom (pas sale.client_name)
//       sale.montant_ttc (pas sale.total_ttc)
//       sale.statut (pas sale.status)
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Sale, SaleCreatePayload, SalesService, Client
} from '../../../core/services/sales';
import { ProductsService, Product } from '../../../core/services/products';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';

// ── Interface locale pour le panier ──────────────────────────────────────────

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
  private salesService    = inject(SalesService);
  private productsService = inject(ProductsService);
  private authService     = inject(AuthService);
  private toast           = inject(ToastService);

  readonly PAGE_SIZE = 20;

  // ── Signaux pour la liste des ventes ─────────────────────────────────────

  sales   = signal<Sale[]>([]);
  total   = signal(0);
  loading = signal(false);
  page    = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());
  pageStart  = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd    = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  // ── État du panel "Nouvelle vente" ────────────────────────────────────────

  showSalePanel = signal(false);
  saleLoading   = signal(false);

  // Données produits et clients pour les selects
  products = signal<Product[]>([]);
  clients  = signal<Client[]>([]);

  // Panier
  cart = signal<CartItem[]>([]);

  // Champs du formulaire
  selectedClientId  = '';           // ID du client sélectionné (optionnel)
  selectedProductId = '';           // ID du produit à ajouter
  addQty            = 1;

  // Mode de paiement → correspond aux valeurs acceptées par CommandeCreateSerializer
  // mode_paiement_initial : 'especes' | 'orange_money' | 'mtn_money' | 'virement'
  paymentMode: 'especes' | 'orange_money' | 'mtn_money' | 'virement' = 'especes';

  // Montant encaissé (pour mode partiel)
  montantPaye = 0;

  // Totaux calculés dynamiquement depuis le panier
  totalHT  = computed(() => this.cart().reduce((s, i) => s + i.subtotal, 0));
  totalTVA = computed(() => this.cart().reduce((s, i) => s + (i.subtotal * i.tva_rate / 100), 0));
  totalTTC = computed(() => this.totalHT() + this.totalTVA());

  // ── Initialisation ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();

    // Charge la liste des produits actifs pour le select du formulaire
    this.productsService.list({ page_size: 200, is_active: true }).subscribe({
      next: (res) => this.products.set(res.results),
      error: () => this.toast.error('Impossible de charger les produits.'),
    });

    // Charge la liste des clients pour le select (optionnel)
    this.salesService.listClients({ page_size: 200 }).subscribe({
      next: (res) => this.clients.set(res.results),
      error: () => {}, // pas bloquant, le client peut être anonyme
    });
  }

  // ── Chargement de la liste des ventes ─────────────────────────────────────

  load(): void {
    this.loading.set(true);
    this.salesService.list({
      page: this.page(),
      page_size: this.PAGE_SIZE,
    }).subscribe({
      next: (res) => {
        this.sales.set(res.results);
        this.total.set(res.count);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des ventes.');
        this.loading.set(false);
      },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  // ── Ouverture / Fermeture du panel ────────────────────────────────────────

  openSalePanel(): void {
    // Réinitialise tout le formulaire
    this.cart.set([]);
    this.selectedClientId  = '';
    this.selectedProductId = '';
    this.addQty            = 1;
    this.paymentMode       = 'especes';
    this.montantPaye       = 0;
    this.showSalePanel.set(true);
  }

  closeSalePanel(): void {
    this.showSalePanel.set(false);
  }

  // ── Gestion du panier ─────────────────────────────────────────────────────

  addToCart(): void {
    if (!this.selectedProductId || this.addQty <= 0) return;
    const product = this.products().find(p => p.id === +this.selectedProductId);
    if (!product) return;

    // Si le produit est déjà dans le panier, on ajoute la quantité
    const existing = this.cart().findIndex(i => i.product.id === product.id);
    if (existing >= 0) {
      this.cart.update(items => items.map((item, idx) =>
        idx === existing
          ? {
              ...item,
              quantity: item.quantity + this.addQty,
              subtotal: (item.quantity + this.addQty) * item.unit_price,
            }
          : item
      ));
    } else {
      this.cart.update(items => [...items, {
        product,
        quantity:   this.addQty,
        unit_price: product.selling_price,
        tva_rate:   product.tva_rate,
        subtotal:   this.addQty * product.selling_price,
      }]);
    }

    // Remet le select à zéro
    this.selectedProductId = '';
    this.addQty = 1;
  }

  removeFromCart(idx: number): void {
    this.cart.update(items => items.filter((_, i) => i !== idx));
  }

  // ── Enregistrement de la vente ────────────────────────────────────────────
  //
  // PAYLOAD CORRIGÉ — correspond exactement à CommandeCreateSerializer :
  //   depot              : ID dépôt de l'utilisateur connecté (OBLIGATOIRE)
  //   client             : ID client (optionnel)
  //   lignes             : tableau de { produit, quantite, prix_unitaire_ht }
  //   mode_paiement      : 'comptant' | 'partiel' | 'credit'
  //   montant_paye       : montant encaissé
  //   mode_paiement_initial : 'especes' | 'orange_money' | 'mtn_money'

  saveSale(): void {
    if (this.cart().length === 0) {
      this.toast.error('Ajoutez au moins un produit au panier.');
      return;
    }

    // Récupère l'ID du dépôt depuis l'utilisateur connecté
    const user = this.authService.getCurrentUser();
    const depotId = user?.depot_id;

    if (!depotId) {
      this.toast.error('Aucun dépôt associé à votre compte. Contactez l\'administrateur.');
      return;
    }

    this.saleLoading.set(true);

    // Construit le payload avec les VRAIS champs du backend
    const payload: SaleCreatePayload = {
      depot: depotId,                          // ✅ ID dépôt obligatoire
      client: this.selectedClientId
        ? +this.selectedClientId : null,        // ✅ ID client (null = anonyme)
      lignes: this.cart().map(i => ({           // ✅ "lignes" pas "items"
        produit:          i.product.id,          // ✅ "produit" pas "product"
        quantite:         i.quantity,            // ✅ "quantite" pas "quantity"
        prix_unitaire_ht: i.unit_price,          // ✅ "prix_unitaire_ht" pas "unit_price"
      })),
      mode_paiement:         'comptant',         // ✅ champ requis par backend
      montant_paye:          this.totalTTC(),    // ✅ montant encaissé
      mode_paiement_initial: this.paymentMode,  // ✅ mode d'encaissement
    };

    this.salesService.create(payload).subscribe({
      next: (sale) => {
        this.toast.success(`Vente ${sale.numero} enregistrée avec succès !`);
        this.closeSalePanel();
        this.load();
        this.saleLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Erreur lors de l\'enregistrement de la vente.'));
        this.saleLoading.set(false);
      },
    });
  }

  // ── Formatage et labels ───────────────────────────────────────────────────

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency', currency: 'GNF', minimumFractionDigits: 0,
    }).format(price || 0);
  }

  // ✅ CORRIGÉ — utilise sale.statut (pas sale.status)
  getStatusLabel(statut: string): string {
    const labels: Record<string, string> = {
      en_attente:          'En attente',
      livree:              'Livrée',
      annulee:             'Annulée',
      partiellement_payee: 'Partiellement payée',
    };
    return labels[statut] || statut;
  }

  getStatusClass(statut: string): string {
    const classes: Record<string, string> = {
      livree:              'bg-emerald-50 text-emerald-700 border-emerald-200',
      en_attente:          'bg-amber-50 text-amber-700 border-amber-200',
      annulee:             'bg-red-50 text-red-600 border-red-200',
      partiellement_payee: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return classes[statut] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  getPaymentLabel(mode: string): string {
    const labels: Record<string, string> = {
      especes:      'Espèces',
      orange_money: 'Orange Money',
      mtn_money:    'MTN Money',
      virement:     'Virement',
    };
    return labels[mode] || mode;
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