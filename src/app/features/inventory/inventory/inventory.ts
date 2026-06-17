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
import { InventoryService, StockItem, StockMovement } from '../../../core/services/inventory';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
})
export class Inventory implements OnInit {
  private inventoryService = inject(InventoryService);
  private toast = inject(ToastService);

  readonly PAGE_SIZE = 20;

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

  ngOnInit(): void { this.load(); }

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
}