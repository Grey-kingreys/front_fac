import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuppliersService, Supplier, SupplierPayload } from '../../../core/services/suppliers.service';
import { ToastService } from '../../../core/services/toast';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.html',
})
export class Suppliers implements OnInit {
  private suppliersService = inject(SuppliersService);
  private toast = inject(ToastService);

  readonly PAGE_SIZE = 20;
  suppliers = signal<Supplier[]>([]);
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

  formData: SupplierPayload = {
    name: '', contact_name: '', email: '', phone: '', address: '', payment_terms: 'immediate',
  };

  deleteTarget = signal<Supplier | null>(null);
  deleteLoading = signal(false);

  readonly paymentTerms = [
    { value: 'immediate', label: 'Paiement immédiat' },
    { value: '30_days', label: '30 jours' },
    { value: '60_days', label: '60 jours' },
    { value: '90_days', label: '90 jours' },
    { value: 'credit', label: 'À crédit' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.suppliersService.list({ page: this.page(), search: this.search || undefined }).subscribe({
      next: (res) => { this.suppliers.set(res.results); this.total.set(res.count); this.loading.set(false); },
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
    this.formData = { name: '', contact_name: '', email: '', phone: '', address: '', payment_terms: 'immediate' };
    this.showPanel.set(true);
  }

  openEdit(s: Supplier): void {
    this.isEditing.set(true);
    this.editingId.set(s.id);
    this.formData = { name: s.name, contact_name: s.contact_name, email: s.email, phone: s.phone, address: s.address, payment_terms: s.payment_terms };
    this.showPanel.set(true);
  }

  closePanel(): void { this.showPanel.set(false); }
  canSave(): boolean { return !!this.formData.name.trim(); }

  save(): void {
    if (!this.canSave()) return;
    this.panelLoading.set(true);
    const obs = this.isEditing()
      ? this.suppliersService.update(this.editingId()!, this.formData)
      : this.suppliersService.create(this.formData);
    obs.subscribe({
      next: () => { this.toast.success(this.isEditing() ? 'Fournisseur mis à jour.' : 'Fournisseur créé.'); this.closePanel(); this.load(); this.panelLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.panelLoading.set(false); },
    });
  }

  openDelete(s: Supplier): void { this.deleteTarget.set(s); }
  closeDelete(): void { this.deleteTarget.set(null); }

  executeDelete(): void {
    const s = this.deleteTarget();
    if (!s) return;
    this.deleteLoading.set(true);
    this.suppliersService.remove(s.id).subscribe({
      next: () => { this.toast.success('Fournisseur supprimé.'); this.closeDelete(); this.load(); this.deleteLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.deleteLoading.set(false); },
    });
  }

  getPaymentLabel(term: string): string {
    return this.paymentTerms.find(t => t.value === term)?.label || term;
  }
}