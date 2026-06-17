import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast';
import { environment } from '../../../../environments/environment';

export interface Employee {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  depot_name?: string;
  hire_date: string;
  is_active: boolean;
  solde_conges: number;
}

export interface Leave {
  id: number;
  employee_name: string;
  type: 'conge_annuel' | 'maladie' | 'sans_solde' | 'autre';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr.html',
})
export class Hr implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private readonly BASE = `${environment.apiUrl}/hr`;

  activeTab = signal<'employees' | 'leaves'>('employees');

  employees = signal<Employee[]>([]);
  leaves = signal<Leave[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  readonly PAGE_SIZE = 20;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());
  pendingCount = computed(() => 
    this.leaves().filter(l => l.status === 'pending').length
  );

  approvedCount = computed(() => 
    this.leaves().filter(l => l.status === 'approved').length
  );

  showLeavePanel = signal(false);
  leaveLoading = signal(false);
  leaveForm = { employee_id: 0, type: 'conge_annuel', start_date: '', end_date: '', reason: '' };

  ngOnInit(): void { this.loadEmployees(); }

  loadEmployees(): void {
    this.loading.set(true);
    this.http.get<{ count: number; results: Employee[] }>(`${this.BASE}/employees/?page=${this.page()}&page_size=${this.PAGE_SIZE}`).subscribe({
      next: (res) => { this.employees.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des employés.'); this.loading.set(false); },
    });
  }

  loadLeaves(): void {
    this.loading.set(true);
    this.http.get<{ count: number; results: Leave[] }>(`${this.BASE}/leaves/?page=${this.page()}&page_size=${this.PAGE_SIZE}`).subscribe({
      next: (res) => { this.leaves.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur lors du chargement des congés.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'employees' | 'leaves'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    if (tab === 'employees') this.loadEmployees();
    else this.loadLeaves();
  }

  prevPage(): void { if (this.hasPrev()) { this.page.update(p => p - 1); this.activeTab() === 'employees' ? this.loadEmployees() : this.loadLeaves(); } }
  nextPage(): void { if (this.hasNext()) { this.page.update(p => p + 1); this.activeTab() === 'employees' ? this.loadEmployees() : this.loadLeaves(); } }

  approveLeave(id: number): void {
    this.http.post(`${this.BASE}/leaves/${id}/approve/`, {}).subscribe({
      next: () => { this.toast.success('Congé approuvé.'); this.loadLeaves(); },
      error: () => this.toast.error('Erreur.'),
    });
  }

  rejectLeave(id: number): void {
    this.http.post(`${this.BASE}/leaves/${id}/reject/`, {}).subscribe({
      next: () => { this.toast.success('Congé refusé.'); this.loadLeaves(); },
      error: () => this.toast.error('Erreur.'),
    });
  }

  submitLeave(): void {
    this.leaveLoading.set(true);
    this.http.post(`${this.BASE}/leaves/`, this.leaveForm).subscribe({
      next: () => { this.toast.success('Demande de congé soumise.'); this.showLeavePanel.set(false); this.loadLeaves(); this.leaveLoading.set(false); },
      error: () => { this.toast.error('Erreur.'); this.leaveLoading.set(false); },
    });
  }

  getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = { conge_annuel: 'Congé annuel', maladie: 'Maladie', sans_solde: 'Sans solde', autre: 'Autre' };
    return labels[type] || type;
  }

  getStatusClass(status: string): string {
    return { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-red-50 text-red-600 border-red-200' }[status] || '';
  }

  getStatusLabel(status: string): string {
    return { pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé' }[status] || status;
  }
}