import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./features/home/home').then(m => m.Home),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login').then(m => m.Login),
    },
    {
        path: 'forgot-password',
        loadComponent: () =>
            import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
    },
    {
        path: 'reset-password',
        loadComponent: () =>
            import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword),
    },
    {
        path: 'dashboard',
        redirectTo: '/app/dashboard',
        pathMatch: 'full',
    },
    {
        path: 'app',
        canActivate: [authGuard],
        loadComponent: () => import('./shared/layout/app-layout/app-layout').then(m => m.AppLayout),
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
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
                path: 'admin',
                canActivate: [roleGuard],
                data: { roles: ['admin'] },
                loadComponent: () => import('./features/admin/users/users').then(m => m.Users),
            },
            {
                path: 'forbidden',
                loadComponent: () => import('./shared/components/forbidden/forbidden').then(m => m.Forbidden),
            },
            {
                path: '**',
                loadComponent: () => import('./shared/components/page-not-found/page-not-found').then(m => m.PageNotFound),
            },
        ],
    },
    {
        path: '**',
        loadComponent: () => import('./shared/components/page-not-found/page-not-found').then(m => m.PageNotFound),
    },
];