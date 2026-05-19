import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

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
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/dashboard').then(m => m.Dashboard),
    },
    {
        path: 'app',
        canActivate: [authGuard],
        children: [
            // tes routes protégées arriveront ici plus tard
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];