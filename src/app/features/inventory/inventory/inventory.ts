// ============================================================
// INVENTORY COMPONENT — Version finale
// Chemin : src/app/features/inventory/inventory/inventory.ts
//
// CORRECTIONS :
//   - movementData.quantite est typé number (pas number | undefined)
//     → supprime les warnings "?? 0" inutiles dans le template
//   - filterLow comme propriété simple (pas signal)
//   - showMovement = signal (pas showMovementPanel)
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  InventoryService, StockItem, StockMovement,
  Transfert, TransfertCreatePayload,
  Inventaire, InventaireCreatePayload,
  Ajustement, AjustementCreatePayload,
} from '../../../core/services/inventory';
import { ToastService } from '../../../core/services/toast';
import { ZonesService, Depot } from '../../../core/services/zones';
import { ProductsService, Product } from '../../../core/services/products';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
})
export class Inventory implements OnInit {
  private inventoryService = inject(InventoryService);
  private zonesService = inject(ZonesService);
  private productsService = inject(ProductsService);
  private toast = inject(ToastService);

  readonly PAGE_SIZE = 20;

  // ── Onglets ────────────────────────────────────────────────────────────
  activeTab = signal<'stocks' | 'transferts' | 'inventaires' | 'ajustements'>('stocks');
  setTab(tab: 'stocks' | 'transferts' | 'inventaires' | 'ajustements'): void {
    this.activeTab.set(tab);
    if (tab === 'transferts' && this.transferts().length === 0) this.loadTransferts();
    if (tab === 'inventaires' && this.inventaires().length === 0) this.loadInventaires();
    if (tab === 'ajustements' && this.ajustements().length === 0) this.loadAjustements();
  }

  // Référentiels partagés (dépôts/produits) pour les selects des formulaires
  depots = signal<Depot[]>([]);
  products = signal<Product[]>([]);
  private loadReferentiels(): void {
    this.zonesService.listDepots({ page: 1 }).subscribe({ next: (r) => this.depots.set(r.results), error: () => {} });
    this.productsService.list({ page_size: 100 }).subscribe({ next: (r) => this.products.set(r.results), error: () => {} });
  }

  stocks    = signal<StockItem[]>([]);
  movements = signal<StockMovement[]>([]);
  total     = signal(0);
  loading   = signal(false);
  page      = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());
  pageStart  = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd    = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  search    = '';
  filterLow = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showMovement    = signal(false);
  selectedStock   = signal<StockItem | null>(null);
  movementLoading = signal(false);

  // quantite est number (jamais undefined) → élimine les warnings NG8102 du template
  movementData: {
    depot: number;
    produit: number;
    movement_type: 'entry' | 'exit';
    quantite: number;
    motif: string;
  } = { depot: 0, produit: 0, movement_type: 'entry', quantite: 0, motif: '' };

  ngOnInit(): void { this.load(); this.loadReferentiels(); }

  load(): void {
    this.loading.set(true);
    this.inventoryService.listStock({
      page: this.page(),
      page_size: this.PAGE_SIZE,
      search: this.search || undefined,
      is_low: this.filterLow || undefined,
    }).subscribe({
      next: (res) => { this.stocks.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement.'); this.loading.set(false); },
    });
    this.inventoryService.listMovements({ page_size: 10 }).subscribe({
      next: (res) => this.movements.set(res.results),
      error: () => {},
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  openMovement(stock: StockItem): void {
    this.selectedStock.set(stock);
    this.movementData = {
      depot: stock.depot,
      produit: stock.produit,
      movement_type: 'entry',
      quantite: 1,
      motif: '',
    };
    this.showMovement.set(true);
  }

  closeMovement(): void {
    this.showMovement.set(false);
    this.selectedStock.set(null);
  }

  saveMovement(): void {
    if (this.movementData.quantite <= 0) {
      this.toast.error('La quantité doit être supérieure à 0.');
      return;
    }
    this.movementLoading.set(true);

    const payload = {
      depot: this.movementData.depot,
      produit: this.movementData.produit,
      quantite: this.movementData.quantite,
      motif: this.movementData.motif,
    };

    const obs = this.movementData.movement_type === 'entry'
      ? this.inventoryService.addEntree(payload)
      : this.inventoryService.addSortie(payload);

    obs.subscribe({
      next: () => {
        this.toast.success('Mouvement enregistré.');
        this.closeMovement();
        this.load();
        this.movementLoading.set(false);
      },
      error: (e: unknown) => {
        const msg = (e as { error?: { detail?: string } })?.error?.detail ?? 'Erreur.';
        this.toast.error(msg);
        this.movementLoading.set(false);
      },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  formatQty(qty: number | string, unit: string): string {
    return `${Number(qty).toLocaleString('fr-FR')} ${unit}`;
  }

  // ════════════════════════════════════════════════════════════════════
  // TRANSFERTS INTER-DÉPÔTS — CDC §3.3
  // Cycle : demande → expedier (auto-crée une Mission logistique côté
  // backend) → receptionner (saisie des quantités reçues, peut différer
  // de l'envoi en cas de casse/perte) → ou annuler
  // ════════════════════════════════════════════════════════════════════

  transferts = signal<Transfert[]>([]);
  transfertsLoading = signal(false);
  showTransfertForm = signal(false);
  transfertForm: { depot_source: number; depot_destination: number; lignes: { produit: number; quantite_envoyee: number }[] } = {
    depot_source: 0, depot_destination: 0, lignes: [{ produit: 0, quantite_envoyee: 1 }],
  };

  showReception = signal(false);
  receptionTarget = signal<Transfert | null>(null);
  receptionLignes: { ligne_id: number; produit_nom: string; quantite_envoyee: number; quantite_recue: number }[] = [];

  loadTransferts(): void {
    this.transfertsLoading.set(true);
    this.inventoryService.listTransferts({ page_size: 50 }).subscribe({
      next: (res) => { this.transferts.set(res.results); this.transfertsLoading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des transferts.'); this.transfertsLoading.set(false); },
    });
  }

  openTransfertForm(): void {
    this.transfertForm = { depot_source: 0, depot_destination: 0, lignes: [{ produit: 0, quantite_envoyee: 1 }] };
    this.showTransfertForm.set(true);
  }
  closeTransfertForm(): void { this.showTransfertForm.set(false); }

  addLigneTransfert(): void { this.transfertForm.lignes.push({ produit: 0, quantite_envoyee: 1 }); }
  removeLigneTransfert(i: number): void { this.transfertForm.lignes.splice(i, 1); }

  saveTransfert(): void {
    if (!this.transfertForm.depot_source || !this.transfertForm.depot_destination) {
      this.toast.error('Sélectionnez les dépôts source et destination.');
      return;
    }
    if (this.transfertForm.depot_source === this.transfertForm.depot_destination) {
      this.toast.error('Le dépôt source et destination doivent être différents.');
      return;
    }
    const lignes = this.transfertForm.lignes.filter(l => l.produit > 0 && l.quantite_envoyee > 0);
    if (lignes.length === 0) {
      this.toast.error('Ajoutez au moins une ligne de produit.');
      return;
    }
    const payload: TransfertCreatePayload = {
      depot_source: this.transfertForm.depot_source,
      depot_destination: this.transfertForm.depot_destination,
      lignes,
    };
    this.inventoryService.createTransfert(payload).subscribe({
      next: () => { this.toast.success('Demande de transfert créée.'); this.closeTransfertForm(); this.loadTransferts(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la création du transfert.')),
    });
  }

  // Expédie le transfert : passe EN_TRANSIT, crée automatiquement une mission logistique côté backend
  expedierTransfert(t: Transfert): void {
    this.inventoryService.expedierTransfert(t.id).subscribe({
      next: () => { this.toast.success('Transfert expédié — une mission logistique a été créée.'); this.loadTransferts(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de l\'expédition.')),
    });
  }

  openReception(t: Transfert): void {
    this.receptionTarget.set(t);
    this.receptionLignes = t.lignes.map(l => ({
      ligne_id: l.id,
      produit_nom: l.produit_nom,
      quantite_envoyee: l.quantite_envoyee,
      quantite_recue: l.quantite_envoyee, // pré-rempli, l'utilisateur ajuste si écart
    }));
    this.showReception.set(true);
  }
  closeReception(): void { this.showReception.set(false); this.receptionTarget.set(null); }

  confirmReception(): void {
    const t = this.receptionTarget();
    if (!t) return;
    const lignes = this.receptionLignes.map(l => ({ ligne_id: l.ligne_id, quantite_recue: l.quantite_recue }));
    this.inventoryService.receptionnerTransfert(t.id, lignes).subscribe({
      next: () => { this.toast.success('Réception enregistrée — stock mis à jour.'); this.closeReception(); this.loadTransferts(); this.load(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la réception.')),
    });
  }

  annulerTransfert(t: Transfert): void {
    this.inventoryService.annulerTransfert(t.id).subscribe({
      next: () => { this.toast.success('Transfert annulé.'); this.loadTransferts(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de l\'annulation.')),
    });
  }

  transfertStatusLabel(s: string): string {
    return { demande: 'Demandé', en_transit: 'En transit', recu: 'Reçu', annule: 'Annulé' }[s] ?? s;
  }
  transfertStatusClass(s: string): string {
    return {
      demande: 'bg-amber-50 text-amber-700 border-amber-200',
      en_transit: 'bg-blue-50 text-blue-700 border-blue-200',
      recu: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      annule: 'bg-gray-100 text-gray-500 border-gray-200',
    }[s] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  }

  // ════════════════════════════════════════════════════════════════════
  // INVENTAIRES PHYSIQUES — CDC §3.3
  // Cycle : création (le backend pré-remplit les lignes avec le stock
  // théorique du dépôt) → saisie des quantités comptées → valider
  // (calcule les écarts et corrige le stock définitivement)
  // ════════════════════════════════════════════════════════════════════

  inventaires = signal<Inventaire[]>([]);
  inventairesLoading = signal(false);
  showInventaireForm = signal(false);
  inventaireDepotId = 0;

  showInventaireDetail = signal(false);
  inventaireDetail = signal<Inventaire | null>(null);

  loadInventaires(): void {
    this.inventairesLoading.set(true);
    this.inventoryService.listInventaires({ page_size: 50 }).subscribe({
      next: (res) => { this.inventaires.set(res.results); this.inventairesLoading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des inventaires.'); this.inventairesLoading.set(false); },
    });
  }

  openInventaireForm(): void { this.inventaireDepotId = 0; this.showInventaireForm.set(true); }
  closeInventaireForm(): void { this.showInventaireForm.set(false); }

  createInventaire(): void {
    if (!this.inventaireDepotId) { this.toast.error('Sélectionnez un dépôt.'); return; }
    const payload: InventaireCreatePayload = { depot: this.inventaireDepotId };
    this.inventoryService.createInventaire(payload).subscribe({
      next: () => { this.toast.success('Inventaire créé — saisissez les quantités comptées.'); this.closeInventaireForm(); this.loadInventaires(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la création de l\'inventaire.')),
    });
  }

  openInventaireDetail(inv: Inventaire): void {
    this.inventoryService.getInventaire(inv.id).subscribe({
      next: (full) => { this.inventaireDetail.set(full); this.showInventaireDetail.set(true); },
      error: () => this.toast.error('Erreur lors du chargement du détail.'),
    });
  }
  closeInventaireDetail(): void { this.showInventaireDetail.set(false); this.inventaireDetail.set(null); }

  saveLigneComptee(inventaireId: number, ligneId: number, quantite: number): void {
    this.inventoryService.updateLigneInventaire(inventaireId, ligneId, quantite).subscribe({
      next: (full) => { this.inventaireDetail.set(full); this.toast.success('Quantité enregistrée.'); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de l\'enregistrement.')),
    });
  }

  validerInventaire(inv: Inventaire): void {
    this.inventoryService.validerInventaire(inv.id).subscribe({
      next: () => { this.toast.success('Inventaire validé — les écarts ont été appliqués au stock.'); this.closeInventaireDetail(); this.loadInventaires(); this.load(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la validation.')),
    });
  }

  inventaireStatusLabel(s: string): string {
    return { en_cours: 'En cours', valide: 'Validé', annule: 'Annulé' }[s] ?? s;
  }
  inventaireStatusClass(s: string): string {
    return {
      en_cours: 'bg-amber-50 text-amber-700 border-amber-200',
      valide: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      annule: 'bg-gray-100 text-gray-500 border-gray-200',
    }[s] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  }

  // ════════════════════════════════════════════════════════════════════
  // AJUSTEMENTS DE STOCK — CDC §3.3
  // Toute correction manuelle nécessite un motif obligatoire et une
  // validation superviseur (statut en_attente → approuve | refuse)
  // ════════════════════════════════════════════════════════════════════

  ajustements = signal<Ajustement[]>([]);
  ajustementsLoading = signal(false);
  showAjustementForm = signal(false);
  ajustementForm: { depot: number; produit: number; quantite: number; motif: string } = {
    depot: 0, produit: 0, quantite: 0, motif: '',
  };

  loadAjustements(): void {
    this.ajustementsLoading.set(true);
    this.inventoryService.listAjustements({ page_size: 50 }).subscribe({
      next: (res) => { this.ajustements.set(res.results); this.ajustementsLoading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des ajustements.'); this.ajustementsLoading.set(false); },
    });
  }

  openAjustementForm(): void {
    this.ajustementForm = { depot: 0, produit: 0, quantite: 0, motif: '' };
    this.showAjustementForm.set(true);
  }
  closeAjustementForm(): void { this.showAjustementForm.set(false); }

  saveAjustement(): void {
    if (!this.ajustementForm.depot || !this.ajustementForm.produit) {
      this.toast.error('Sélectionnez un dépôt et un produit.');
      return;
    }
    if (this.ajustementForm.quantite === 0) {
      this.toast.error('La quantité d\'ajustement ne peut pas être nulle.');
      return;
    }
    if (!this.ajustementForm.motif.trim()) {
      this.toast.error('Le motif est obligatoire.');
      return;
    }
    const payload: AjustementCreatePayload = { ...this.ajustementForm };
    this.inventoryService.createAjustement(payload).subscribe({
      next: () => { this.toast.success('Demande d\'ajustement envoyée pour validation.'); this.closeAjustementForm(); this.loadAjustements(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de la création.')),
    });
  }

  approuverAjustement(a: Ajustement): void {
    this.inventoryService.approuverAjustement(a.id).subscribe({
      next: () => { this.toast.success('Ajustement approuvé — stock corrigé.'); this.loadAjustements(); this.load(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors de l\'approbation.')),
    });
  }

  refuserAjustement(a: Ajustement): void {
    this.inventoryService.refuserAjustement(a.id).subscribe({
      next: () => { this.toast.success('Ajustement refusé.'); this.loadAjustements(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur lors du refus.')),
    });
  }

  ajustementStatusLabel(s: string): string {
    return { en_attente: 'En attente', approuve: 'Approuvé', refuse: 'Refusé' }[s] ?? s;
  }
  ajustementStatusClass(s: string): string {
    return {
      en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
      approuve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      refuse: 'bg-red-50 text-red-700 border-red-200',
    }[s] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  }

  // ── Utilitaire commun : extraction de message d'erreur DRF ─────────────
  private extractError(e: unknown, fallback: string): string {
    const err = (e as { error?: Record<string, unknown> })?.error;
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (typeof err['detail'] === 'string') return err['detail'];
    const firstKey = Object.keys(err)[0];
    if (firstKey) {
      const val = err[firstKey];
      const msg = Array.isArray(val) ? val[0] : val;
      return typeof msg === 'string' ? msg : fallback;
    }
    return fallback;
  }
}