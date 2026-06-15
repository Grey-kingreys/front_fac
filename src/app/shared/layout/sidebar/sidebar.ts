import { Component, inject, Output, EventEmitter, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth';

// ============================================================================
// Rôles backend (synchronisés avec accounts/models.py)
// ============================================================================
export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'superviseur'
  | 'gestionnaire_stock'
  | 'caissier'
  | 'chauffeur'
  | 'maintenancier'
  | 'commercial';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Administrateur',
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  gestionnaire_stock: 'Gestionnaire de Stock',
  caissier: 'Caissier',
  chauffeur: 'Chauffeur',
  maintenancier: 'Maintenancier',
  commercial: 'Commercial',
};

// ============================================================================
// Navigation items avec rôles et sections
// ============================================================================
export interface NavItem {
  path: string;
  label: string;
  icon: string;
  section: string;
  roles: UserRole[];
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    path: '/dashboard',
    label: 'Tableau de bord',
    icon: 'dashboard',
    section: 'GÉNÉRAL',
    roles: ['superadmin', 'admin', 'superviseur', 'gestionnaire_stock', 'caissier', 'chauffeur', 'maintenancier', 'commercial'],
  },

  // ── SuperAdmin : plateforme SaaS ──────────────────────────────────────────
  {
    path: '/companies',
    label: 'Entreprises',
    icon: 'building',
    section: 'GESTION PLATEFORME',
    roles: ['superadmin'],
  },
  {
    path: '/admin',
    label: 'Tous les utilisateurs',
    icon: 'users',
    section: 'GESTION PLATEFORME',
    roles: ['superadmin'],
  },

  // ── Catalogue ─────────────────────────────────────────────────────────────
  {
    path: '/produits',
    label: 'Produits',
    icon: 'inventory',
    section: 'CATALOGUE',
    roles: ['admin', 'superviseur', 'gestionnaire_stock'],
  },
  {
    path: '/fournisseurs',
    label: 'Fournisseurs',
    icon: 'truck',
    section: 'CATALOGUE',
    roles: ['admin', 'superviseur'],
  },

  // ── Opérations ────────────────────────────────────────────────────────────
  {
    path: '/ventes',
    label: 'Ventes',
    icon: 'sales',
    section: 'OPÉRATIONS',
    roles: ['admin', 'superviseur', 'caissier', 'commercial'],
  },
  {
    path: '/stocks',
    label: 'Stocks',
    icon: 'inventory',
    section: 'OPÉRATIONS',
    roles: ['admin', 'superviseur', 'gestionnaire_stock', 'caissier'],
  },
  {
    path: '/logistique',
    label: 'Logistique',
    icon: 'truck',
    section: 'OPÉRATIONS',
    roles: ['admin', 'superviseur', 'chauffeur'],
  },

  // ── Gestion interne ────────────────────────────────────────────────────────
  {
    path: '/finance',
    label: 'Finance',
    icon: 'finance',
    section: 'GESTION',
    roles: ['admin', 'superviseur', 'caissier'],
  },
  {
    path: '/rh',
    label: 'Ressources Humaines',
    icon: 'users',
    section: 'GESTION',
    roles: ['admin', 'superviseur'],
  },
  {
    path: '/documents',
    label: 'Documents',
    icon: 'documents',
    section: 'GESTION',
    roles: ['admin', 'superviseur'],
  },

  // ── Rapports ──────────────────────────────────────────────────────────────
  {
    path: '/rapports',
    label: 'Rapports',
    icon: 'reports',
    section: 'ANALYSE',
    roles: ['admin', 'superviseur'],
  },

  // ── Administration entreprise ──────────────────────────────────────────────
  {
    path: '/admin',
    label: 'Utilisateurs',
    icon: 'settings',
    section: 'ADMINISTRATION',
    roles: ['admin'],
  },
];
// ============================================================================
// Icônes SVG
// ============================================================================
const ICONS: Record<string, string> = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  sales: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><path d="M9 9a5 5 0 0 0 5 5"/><path d="M14 14a5 5 0 0 0 5 5"/><circle cx="14" cy="14" r="5"/><path d="M14 9a5 5 0 0 1 5 5"/><path d="M9 14a5 5 0 0 1-5-5"/></svg>`,
  inventory: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  truck: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M14 18h-2"/><path d="M19 18h-1"/><circle cx="7" cy="18" r="2"/><path d="M14 16h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1"/><circle cx="17" cy="18" r="2"/></svg>`,
  finance: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  chevronsLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>`,
  chevronsRight: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>`,
  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
package: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
barChart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
documents: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  reports: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Output() collapsedChange = new EventEmitter<boolean>();

  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  isCollapsed = signal(false);
  isDarkTheme = signal(false);
  currentUser = computed(() => this.authService.currentUser());

  get filteredNavItems(): NavItem[] {
    const user = this.currentUser();
    if (!user) return [];
    return NAV_ITEMS.filter(item => item.roles.includes(user.role as UserRole));
  }

  get navSections(): NavSection[] {
    const map = new Map<string, NavSection>();
    const order: string[] = [];
    for (const item of this.filteredNavItems) {
      if (!map.has(item.section)) {
        map.set(item.section, { label: item.section, items: [] });
        order.push(item.section);
      }
      map.get(item.section)!.items.push(item);
    }
    return order.map(k => map.get(k)!);
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
    this.collapsedChange.emit(this.isCollapsed());
  }

  toggleTheme(): void {
    this.isDarkTheme.update(v => !v);
  }

  getIcon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICONS[name] || ICONS['dashboard']);
  }
}
