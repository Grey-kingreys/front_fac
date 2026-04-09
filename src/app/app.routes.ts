import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./features/dashboard/dashboard').then(m => m.Dashboard),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login').then(m => m.Login),
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