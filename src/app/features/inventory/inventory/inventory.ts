// ============================================================
// STOCKS — inventory.ts mis à jour
// Chemin : src/app/features/inventory/inventory/inventory.ts
// Ajoute : filterLow, onSearch, movements dans le template
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, StockItem, StockMovement, MovementPayload } from '../../../core/services/inventory';
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

  stocks = signal<StockItem[]>([]);
  movements = signal<StockMovement[]>([]);
  total = signal(0);
  loading = signal(false);
  page = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());
  pageStart = computed(() => Math.min((this.page() - 1) * this.PAGE_SIZE + 1, this.total()));
  pageEnd = computed(() => Math.min(this.page() * this.PAGE_SIZE, this.total()));

  search = '';
  filterLow = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Mouvement panel
  showMovement = signal(false);
  selectedStock = signal<StockItem | null>(null);
  movementLoading = signal(false);
  movementData: MovementPayload = { stock_item: 0, movement_type: 'entry', quantity: 0, reason: '' };

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
    // Charger les mouvements récents
    this.inventoryService.listMovements({ page_size: 10 }).subscribe({
      next: (res) => this.movements.set(res.results),
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  openMovement(stock: StockItem): void {
    this.selectedStock.set(stock);
    this.movementData = { stock_item: stock.id, movement_type: 'entry', quantity: 0, reason: '' };
    this.showMovement.set(true);
  }

  closeMovement(): void { this.showMovement.set(false); this.selectedStock.set(null); }

  saveMovement(): void {
    if (this.movementData.quantity <= 0) { this.toast.error('La quantité doit être supérieure à 0.'); return; }
    if (this.movementData.movement_type === 'adjustment' && !this.movementData.reason) {
      this.toast.error('Le motif est obligatoire pour un ajustement.'); return;
    }
    this.movementLoading.set(true);
    this.inventoryService.addMovement(this.movementData).subscribe({
      next: () => { this.toast.success('Mouvement enregistré.'); this.closeMovement(); this.load(); this.movementLoading.set(false); },
      error: () => { this.toast.error('Erreur lors de l\'enregistrement.'); this.movementLoading.set(false); },
    });
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.load(); } }

  formatQty(qty: number, unit: string): string { return `${qty.toLocaleString('fr-FR')} ${unit}`; }
}