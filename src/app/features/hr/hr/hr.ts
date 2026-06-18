// ============================================================
// RH COMPONENT — Version avec création d'employé
// Chemin : src/app/features/hr/hr/hr.ts
//
// AJOUT : Panneau "Nouvel employé" → POST /api/employes/
// Champs obligatoires : matricule, nom
// Champs optionnels  : prenom, poste, telephone, email,
//                      depot (ID FK), date_embauche, salaire_base
// ============================================================
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast';
import { environment } from '../../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Employee {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  poste: string;
  depot: number | null;
  depot_nom: string;
  statut: 'actif' | 'inactif' | 'suspendu' | 'conge' | 'quitte';
  statut_label: string;
  telephone?: string;
  email?: string;
  date_embauche?: string;
  salaire_base?: number;
  created_at: string;
}

export interface EmployeePayload {
  matricule: string;          // obligatoire
  nom: string;                // obligatoire
  prenom?: string;
  poste?: string;
  telephone?: string;
  email?: string;
  depot?: number | null;
  date_embauche?: string;     // format YYYY-MM-DD
  salaire_base?: number;
  statut?: string;
}

export interface Leave {
  id: number;
  employe: number;
  employe_nom: string;
  type_conge: string;
  type_label: string;
  date_debut: string;
  date_fin: string;
  nb_jours: number;
  statut: 'en_attente' | 'approuve' | 'refuse';
  statut_label: string;
  motif?: string;
}

export interface Depot {
  id: number;
  name: string;
  code: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr.html',
})
export class Hr implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  private readonly BASE_EMPLOYES = `${environment.apiUrl}/employes`;
  private readonly BASE_CONGES   = `${environment.apiUrl}/conges`;
  private readonly BASE_DEPOTS   = `${environment.apiUrl}/depots`;

  activeTab = signal<'employees' | 'leaves'>('employees');

  // ── Données ───────────────────────────────────────────────────────────────
  employees = signal<Employee[]>([]);
  leaves    = signal<Leave[]>([]);
  depots    = signal<Depot[]>([]);
  loading   = signal(false);
  total     = signal(0);
  page      = signal(1);
  readonly PAGE_SIZE = 20;

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  hasPrev    = computed(() => this.page() > 1);
  hasNext    = computed(() => this.page() < this.totalPages());

  pendingCount  = computed(() => this.leaves().filter(l => l.statut === 'en_attente').length);
  approvedCount = computed(() => this.leaves().filter(l => l.statut === 'approuve').length);
  activeCount   = computed(() => this.employees().filter(e => e.statut === 'actif').length);

  // ── Panneau Nouvel employé ────────────────────────────────────────────────
  showEmployeePanel    = signal(false);
  isEditingEmployee    = signal(false);
  editingEmployeeId    = signal<number | null>(null);
  employeePanelLoading = signal(false);

  employeeForm: EmployeePayload = {
    matricule: '', nom: '', prenom: '',
    poste: '', telephone: '', email: '',
    depot: null, date_embauche: '', salaire_base: 0,
    statut: 'actif',
  };

  // ── Panneau Congé ─────────────────────────────────────────────────────────
  showLeavePanel = signal(false);
  leaveLoading   = signal(false);

  leaveForm: {
    employe: number;
    type_conge: string;
    date_debut: string;
    date_fin: string;
    motif: string;
  } = { employe: 0, type_conge: 'conge_annuel', date_debut: '', date_fin: '', motif: '' };

  readonly leaveTypes = [
    { value: 'conge_annuel', label: 'Congé annuel' },
    { value: 'maladie',      label: 'Maladie' },
    { value: 'sans_solde',   label: 'Sans solde' },
    { value: 'maternite',    label: 'Maternité' },
    { value: 'autre',        label: 'Autre' },
  ];

  readonly statutOptions = [
    { value: 'actif',    label: 'Actif' },
    { value: 'conge',    label: 'En congé' },
    { value: 'suspendu', label: 'Suspendu' },
    { value: 'quitte',   label: 'A quitté' },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadEmployees();
    // Charge les dépôts pour le select dans le formulaire employé
    this.http.get<{ count: number; results: Depot[] }>(`${this.BASE_DEPOTS}/?page_size=100`).subscribe({
      next: (r) => this.depots.set(r.results),
      error: () => {},
    });
  }

  // ── Employés ──────────────────────────────────────────────────────────────

  loadEmployees(): void {
    this.loading.set(true);
    this.http.get<{ count: number; results: Employee[] }>(
      `${this.BASE_EMPLOYES}/?page=${this.page()}&page_size=${this.PAGE_SIZE}`
    ).subscribe({
      next: (res) => { this.employees.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement employés.'); this.loading.set(false); },
    });
  }

  openCreateEmployee(): void {
    this.isEditingEmployee.set(false);
    this.editingEmployeeId.set(null);
    this.employeeForm = {
      matricule: '', nom: '', prenom: '',
      poste: '', telephone: '', email: '',
      depot: null, date_embauche: '', salaire_base: 0,
      statut: 'actif',
    };
    this.showEmployeePanel.set(true);
  }

  openEditEmployee(emp: Employee): void {
    this.isEditingEmployee.set(true);
    this.editingEmployeeId.set(emp.id);
    this.employeeForm = {
      matricule:      emp.matricule,
      nom:            emp.nom,
      prenom:         emp.prenom || '',
      poste:          emp.poste || '',
      telephone:      emp.telephone || '',
      email:          emp.email || '',
      depot:          emp.depot,
      date_embauche:  emp.date_embauche || '',
      salaire_base:   emp.salaire_base || 0,
      statut:         emp.statut,
    };
    this.showEmployeePanel.set(true);
  }

  closeEmployeePanel(): void { this.showEmployeePanel.set(false); }

  canSaveEmployee(): boolean {
    return !!(this.employeeForm.matricule?.trim() && this.employeeForm.nom?.trim());
  }

  saveEmployee(): void {
    if (!this.canSaveEmployee()) return;
    this.employeePanelLoading.set(true);

    // Nettoie les champs vides optionnels pour ne pas envoyer des strings vides
    const payload: Record<string, unknown> = {
      matricule: this.employeeForm.matricule.trim().toUpperCase(),
      nom:       this.employeeForm.nom.trim(),
      statut:    this.employeeForm.statut || 'actif',
    };
    if (this.employeeForm.prenom?.trim())      payload['prenom']        = this.employeeForm.prenom.trim();
    if (this.employeeForm.poste?.trim())       payload['poste']         = this.employeeForm.poste.trim();
    if (this.employeeForm.telephone?.trim())   payload['telephone']     = this.employeeForm.telephone.trim();
    if (this.employeeForm.email?.trim())       payload['email']         = this.employeeForm.email.trim();
    if (this.employeeForm.depot)               payload['depot']         = this.employeeForm.depot;
    if (this.employeeForm.date_embauche)       payload['date_embauche'] = this.employeeForm.date_embauche;
    if ((this.employeeForm.salaire_base ?? 0) > 0) payload['salaire_base'] = this.employeeForm.salaire_base;

    const url = this.isEditingEmployee()
      ? `${this.BASE_EMPLOYES}/${this.editingEmployeeId()!}/`
      : `${this.BASE_EMPLOYES}/`;

    const req = this.isEditingEmployee()
      ? this.http.patch<Employee>(url, payload)
      : this.http.post<Employee>(url, payload);

    req.subscribe({
      next: (emp) => {
        this.toast.success(this.isEditingEmployee()
          ? `${emp.nom_complet} mis à jour.`
          : `Employé ${emp.nom_complet} créé avec le matricule ${emp.matricule} !`);
        this.closeEmployeePanel();
        this.loadEmployees();
        this.employeePanelLoading.set(false);
      },
      error: (e) => {
        this.toast.error(this.extractError(e, 'Erreur lors de la sauvegarde.'));
        this.employeePanelLoading.set(false);
      },
    });
  }

  // ── Congés ────────────────────────────────────────────────────────────────

  loadLeaves(): void {
    this.loading.set(true);
    this.http.get<{ count: number; results: Leave[] }>(
      `${this.BASE_CONGES}/?page=${this.page()}&page_size=${this.PAGE_SIZE}`
    ).subscribe({
      next: (res) => { this.leaves.set(res.results); this.total.set(res.count); this.loading.set(false); },
      error: () => { this.toast.error('Erreur chargement congés.'); this.loading.set(false); },
    });
  }

  switchTab(tab: 'employees' | 'leaves'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    tab === 'employees' ? this.loadEmployees() : this.loadLeaves();
  }

  submitLeave(): void {
    if (!this.leaveForm.employe || !this.leaveForm.date_debut || !this.leaveForm.date_fin) {
      this.toast.error('Employé, date de début et date de fin sont obligatoires.');
      return;
    }
    this.leaveLoading.set(true);
    this.http.post<Leave>(`${this.BASE_CONGES}/`, this.leaveForm).subscribe({
      next: () => {
        this.toast.success('Demande de congé soumise.');
        this.showLeavePanel.set(false);
        this.leaveForm = { employe: 0, type_conge: 'conge_annuel', date_debut: '', date_fin: '', motif: '' };
        this.loadLeaves();
        this.leaveLoading.set(false);
      },
      error: (e) => { this.toast.error(this.extractError(e, 'Erreur.')); this.leaveLoading.set(false); },
    });
  }

  approveLeave(id: number): void {
    this.http.post(`${this.BASE_CONGES}/${id}/approuver/`, {}).subscribe({
      next: () => { this.toast.success('Congé approuvé.'); this.loadLeaves(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
    });
  }

  rejectLeave(id: number): void {
    this.http.post(`${this.BASE_CONGES}/${id}/rejeter/`, {}).subscribe({
      next: () => { this.toast.success('Congé refusé.'); this.loadLeaves(); },
      error: (e) => this.toast.error(this.extractError(e, 'Erreur.')),
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  prevPage(): void {
    if (this.hasPrev()) {
      this.page.update(p => p - 1);
      this.activeTab() === 'employees' ? this.loadEmployees() : this.loadLeaves();
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.page.update(p => p + 1);
      this.activeTab() === 'employees' ? this.loadEmployees() : this.loadLeaves();
    }
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  getStatutClass(statut: string): string {
    const m: Record<string, string> = {
      actif:    'bg-emerald-50 text-emerald-700 border-emerald-200',
      conge:    'bg-blue-50 text-blue-700 border-blue-200',
      suspendu: 'bg-amber-50 text-amber-700 border-amber-200',
      quitte:   'bg-gray-100 text-gray-500 border-gray-200',
      inactif:  'bg-gray-100 text-gray-500 border-gray-200',
    };
    return m[statut] || 'bg-gray-100 text-gray-500';
  }

  getLeaveStatutClass(statut: string): string {
    const m: Record<string, string> = {
      en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
      approuve:   'bg-emerald-50 text-emerald-700 border-emerald-200',
      refuse:     'bg-red-50 text-red-600 border-red-200',
    };
    return m[statut] || 'bg-gray-100 text-gray-600';
  }

  formatSalaire(amount: number): string {
    return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(amount || 0);
  }

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