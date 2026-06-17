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
        path: 'first-login',
        loadComponent: () => import('./features/auth/first-login/first-login').then(m => m.FirstLogin),
    },
    {
        path: 'verify-2fa',
        loadComponent: () => import('./features/auth/verify-2fa/verify-2fa').then(m => m.VerifyTwoFactor),
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
            {
                path: 'produits',
                loadComponent: () => import('./features/products/products/products').then(m => m.Products),
            },
            {
                path: 'stocks',
                loadComponent: () => import('./features/inventory/inventory/inventory').then(m => m.Inventory),
            },
            {
                path: 'ventes',
                loadComponent: () => import('./features/sales/sales/sales').then(m => m.Sales),
            },
            {
                path: 'finance',
                loadComponent: () => import('./features/finance/finance/finance').then(m => m.Finance),
            },
            {
                path: 'logistique',
                loadComponent: () => import('./features/logistics/logistics/logistics').then(m => m.Logistics),
            },
            {
                path: 'rh',
                loadComponent: () => import('./features/hr/hr/hr').then(m => m.Hr),
            },
            {
                path: 'fournisseurs',
                loadComponent: () => import('./features/suppliers/suppliers/suppliers').then(m => m.Suppliers),
            },
            {
                path: 'rapports',
                loadComponent: () => import('./features/reports/reports/reports').then(m => m.Reports),
            },
            {
                path: 'documents',
                loadComponent: () => import('./features/documents/documents/documents').then(m => m.Documents),
            },
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
                path: 'zones',
                canActivate: [roleGuard],
                data: { roles: ['admin', 'superadmin'] },
                loadComponent: () => import('./features/zones/zones/zones').then(m => m.Zones),
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
];
