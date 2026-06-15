import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then(m => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
      },
      // --- STOCKS & PRODUITS ---
      {
        path: 'produits',
        loadComponent: () => import('./features/products/products/products').then(m => m.Products),
      },
      {
        path: 'stocks',
        loadComponent: () => import('./features/inventory/inventory/inventory').then(m => m.Inventory),
      },
      // --- VENTES ---
      {
        path: 'ventes',
        loadComponent: () => import('./features/sales/sales/sales').then(m => m.Sales),
      },
      // --- FINANCE ---
      {
        path: 'finance',
        loadComponent: () => import('./features/finance/finance/finance').then(m => m.Finance),
      },
      // --- LOGISTIQUE ---
      {
        path: 'logistique',
        loadComponent: () => import('./features/logistics/logistics/logistics').then(m => m.Logistics),
      },
      // --- RH ---
      {
        path: 'rh',
        loadComponent: () => import('./features/hr/hr/hr').then(m => m.Hr),
      },
      // --- FOURNISSEURS ---
      {
        path: 'fournisseurs',
        loadComponent: () => import('./features/suppliers/suppliers/suppliers').then(m => m.Suppliers),
      },
      // --- RAPPORTS ---
      {
        path: 'rapports',
        loadComponent: () => import('./features/reports/reports/reports').then(m => m.Reports),
      },
      // --- DOCUMENTS ---
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents/documents').then(m => m.Documents),
      },
      // --- ADMIN ---
      {
        path: 'companies',
        canActivate: [roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () => import('./features/admin/companies/companies').then(m => m.Companies),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'superadmin'] },
        loadComponent: () => import('./features/admin/users/users').then(m => m.Users),
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./shared/components/forbidden/forbidden').then(m => m.Forbidden),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/page-not-found/page-not-found').then(m => m.PageNotFound),
  },
  {
  path: 'zones',
  canActivate: [roleGuard],
  data: { roles: ['admin', 'superadmin'] },
  loadComponent: () => import('./features/zones/zones/zones').then(m => m.Zones),
},
];