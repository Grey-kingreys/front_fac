import { Component, EventEmitter, Output, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, CurrentUser } from '../../../core/services/auth';
import { UsersService, UserSummary } from '../../../core/services/users';
import { UserRole, ROLE_LABELS } from '../sidebar/sidebar';

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  superviseur: 'bg-purple-50 text-purple-700 border-purple-200',
  gestionnaire_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  caissier: 'bg-green-50 text-green-700 border-green-200',
  chauffeur: 'bg-orange-50 text-orange-700 border-orange-200',
  maintenancier: 'bg-slate-50 text-slate-600 border-slate-200',
  commercial: 'bg-teal-50 text-teal-700 border-teal-200',
};

@Component({
  selector: 'app-authenticated-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './authenticated-topbar.html',
  styleUrl: './authenticated-topbar.css',
})
export class AuthenticatedTopbar {
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  currentUser = this.authService.currentUser;
  isSimulating = this.authService.isSimulating;
  simulatedAs = this.authService.simulatedAs;

  // Vérifie le VRAI user connecté (même pendant une simulation) pour afficher le
  // bouton simulateur. Réservé à l'admin (le superadmin gère la plateforme SaaS,
  // pas les données internes d'une entreprise — cf. CDC, isolation multi-entreprise).
  canSimulate = computed(() => {
    const real = this.authService.realUser() ?? this.currentUser();
    return real?.role === 'admin';
  });

  isUserMenuOpen = signal(false);
  isSimulatorOpen = signal(false);

  // Liste des users chargée à l'ouverture du simulateur
  simulatorUsers = signal<UserSummary[]>([]);
  simulatorLoading = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isUserMenuOpen.set(false);
      this.isSimulatorOpen.set(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  getUserDisplayName(user: CurrentUser | null): string {
    if (!user) return 'Utilisateur';
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email;
  }

  getUserInitials(user: CurrentUser | null): string {
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.email[0].toUpperCase();
  }

  getCompanyLabel(user: CurrentUser | null): string {
    if (!user) return '';
    if (user.role === 'superadmin') return 'Super Admin';
    return user.company_name || `Entreprise #${user.company_id}`;
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] || role;
  }

  getRoleBadgeClass(role: string): string {
    return ROLE_BADGE[role as UserRole] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getUserSimulatorInitials(user: UserSummary): string {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.email[0].toUpperCase();
  }

  // ── Actions topbar ────────────────────────────────────────────────────────────
  onToggle(): void {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
    if (this.isSimulatorOpen()) this.isSimulatorOpen.set(false);
  }

  toggleSimulator(): void {
    const opening = !this.isSimulatorOpen();
    this.isSimulatorOpen.set(opening);
    if (this.isUserMenuOpen()) this.isUserMenuOpen.set(false);
    if (opening && this.simulatorUsers().length === 0) {
      this.loadSimulatorUsers();
    }
  }

  loadSimulatorUsers(): void {
    this.simulatorLoading.set(true);
    // Exclure le vrai utilisateur connecté de la liste (on ne se simule pas soi-même).
    const realId = (this.authService.realUser() ?? this.currentUser())?.id;
    this.usersService.list({ is_active: true, page_size: 100 }).subscribe({
      next: (res) => {
        this.simulatorUsers.set(res.results.filter(u => u.id !== realId));
        this.simulatorLoading.set(false);
      },
      error: () => this.simulatorLoading.set(false),
    });
  }

  // ── Simulation ────────────────────────────────────────────────────────────────
  simulate(user: UserSummary): void {
    const target: CurrentUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      company_id: user.company_id,
      company_name: user.company_name,
      depot_id: user.depot_id,
      depot_name: user.depot_name,
      avatar_url: user.avatar_url,
    };
    this.authService.simulateUser(target);
    this.isSimulatorOpen.set(false);
    // Rediriger vers le dashboard pour réinitialiser la navigation
    this.router.navigate(['/dashboard']);
  }

  stopSimulation(): void {
    this.authService.stopSimulation();
    this.router.navigate(['/dashboard']);
  }

  goToProfile(): void {
    this.isUserMenuOpen.set(false);
    this.router.navigate(['/profile']);
  }

  logout(): void {
    if (this.isSimulating()) this.authService.stopSimulation();
    this.isUserMenuOpen.set(false);
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
