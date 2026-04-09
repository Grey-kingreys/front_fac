# GestionMultiSites — Frontend Angular

Interface web de l'application de gestion intégrée multi-sites.

## Prérequis

- Node.js 18+
- Angular CLI : `npm install -g @angular/cli`

## Installation

```bash
npm install
```

## Lancement en développement

```bash
ng serve
```

L'application est accessible sur `http://localhost:4200`.

## Build production

```bash
ng build --configuration production
```

## Variables d'environnement

Copier `.env.example` en `.env` et renseigner les valeurs.

| Variable | Description |
|---|---|
| `apiUrl` | URL de base de l'API backend |
| `swaggerUrl` | URL de la documentation Swagger |

## Structure du projet

```
src/app/
├── core/
│   ├── auth/          → AuthService, guards
│   ├── interceptors/  → JWT, errors
│   ├── models/        → interfaces TypeScript
│   └── utils/         → helpers
├── shared/
│   ├── layout/        → topbar, footer
│   ├── ui-kit/        → spinner, toast, modal
│   ├── pipes/         → date-fr
│   └── directives/    → has-role
└── features/
    ├── auth/          → login
    ├── dashboard/     → page publique
    ├── admin/         → users, zones, dépôts
    ├── products/      → produits
    ├── inventory/     → stocks
    ├── suppliers/     → fournisseurs
    ├── sales/         → ventes, clients
    ├── finance/       → caisses
    ├── logistics/     → flotte, missions
    ├── hr/            → RH
    ├── documents/     → gestion documentaire
    └── reports/       → rapports
```

## Déploiement

Le frontend est déployé sur **Vercel** via `vercel.json` à la racine.