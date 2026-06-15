# DjoulaGest Frontend — CLAUDE.md

> CDC v1.0 — Mars 2026 | Groupe 1 | Deadline livraison : **20/06/2026**

## ⚠️ Règle fondamentale — Backend déployé, source de vérité absolue

> **Le backend Django (`back_fac`) est déjà déployé en production sur `https://gestion.kingreys.fr/api`. C'est lui la source de vérité. Ce frontend doit s'adapter au backend, jamais l'inverse.**

### Ce que cela signifie concrètement

1. **Ne jamais modifier le backend pour accommoder le frontend.** Si un champ s'appelle `new_password_confirm` côté backend, le frontend envoie `new_password_confirm` — pas `confirmPassword`, pas `password_confirm`, exactement ce que le backend attend.

2. **Avant tout appel API — vérifier le backend en premier.** Avant d'implémenter un appel HTTP, consulter dans cet ordre :
   - Le serializer Django correspondant (`back_fac/apps/.../serializers*.py`) → noms exacts des champs request/response
   - La view (`back_fac/apps/.../views*.py`) → méthode HTTP, URL, logique de validation
   - Le Swagger : `https://gestion.kingreys.fr/api/schema/docs/`
   - **Ne jamais deviner un nom de champ.** Un écart = bug silencieux (400 interprété comme "lien invalide").

3. **Format de réponse :** l'app `companies` retourne `{success, data, message}` ; toutes les autres apps retournent le format DRF standard `{count, next, previous, results}` ou directement l'objet. Vérifier avant de parser.

4. **Exceptions (cas où on peut demander une modif backend) :** uniquement si le backend a un bug avéré, une donnée manquante indispensable, ou un endpoint absent du tout. Dans ce cas, coordonner avec l'équipe backend et documenter ici.

### Bugs corrigés suite à cet audit (15/06/2026)

| Endpoint | Bug | Correction |
|----------|-----|------------|
| `POST /auth/logout/` | Envoyait `{refresh_token}` au lieu de `{refresh}` | `auth.ts:101` corrigé |
| `POST /auth/password-reset/confirm/` | N'envoyait pas `new_password_confirm` | `reset-password.ts` corrigé |
| `POST /auth/first-login/` | Envoyait `confirm_password` au lieu de `password_confirm` | `first-login.ts` corrigé |

---

## 📋 Règle de mise à jour — À faire après chaque session de travail

> **Après chaque implémentation de feature, correction de bug ou fin de prompt, mettre à jour la section "État d'avancement" ci-dessous.**

- Déplacer les items terminés de 🔲 vers ✅ avec la date
- Ajouter les bugs corrigés dans la section correspondante
- Documenter toute décision technique importante
- **Ne jamais laisser le CLAUDE.md désynchronisé avec le code réel** — c'est la première chose qu'un agent lit au début d'une session

---

## État d'avancement (15/06/2026)

### ✅ Terminé et fonctionnel

| Module | Composant | Route | Notes |
|--------|-----------|-------|-------|
| **Core** | AuthService, guards (authGuard, roleGuard), interceptors (JWT, erreurs), layout shell, sidebar, topbar, footer | — | Signals-based |
| **Shared** | Forbidden 403, PageNotFound 404, HasRole directive, DateFr pipe, spinner, toast | — | |
| **Auth** | Login | `/login` | |
| **Auth** | Forgot Password | `/forgot-password` | |
| **Auth** | Reset Password | `/reset-password?token=` | Bug `new_password_confirm` corrigé 15/06 |
| **Auth** | First Login | `/first-login?token=` | Créé + bug `password_confirm` corrigé 15/06 |
| **Home** | Landing page publique | `/` | |
| **Dashboard** | Structure de base (KPIs visuels, pas de données API réelles) | `/dashboard` | À compléter avec vrais appels API |
| **Profile** | Profil utilisateur, changement mot de passe | `/profile` | |
| **Admin** | Gestion entreprises (CRUD complet, toggle, recherche) | `/companies` | superadmin seulement |
| **Admin** | Gestion utilisateurs (CRUD, filtres, reset password) | `/admin` | admin + superadmin |

### 🔲 Stubs vides — À implémenter (composants créés, aucun contenu)

> **Tous ces composants sont des stubs de 11 lignes vides.** Les routes sont câblées dans `app.routes.ts` sauf mention contraire.

| Priorité | Module | Route | Endpoints backend à utiliser | Rôles concernés |
|----------|--------|-------|------------------------------|-----------------|
| 🔴 CRITIQUE | **Finance** | `/finance` | `GET /sessions-caisse/`, `POST /sessions-caisse/ouvrir/`, `POST /sessions-caisse/{id}/fermer/`, `POST /sessions-caisse/{id}/transaction/`, `GET /caisses/consolidation/`, `POST /versements-caisse/`, `CRUD /depenses/` | admin, caissier, superviseur |
| 🔴 CRITIQUE | **Ventes** | `/ventes` | `CRUD /commandes/`, `CRUD /clients/`, `POST /commandes/{id}/paiement/`, `GET /commandes/{id}/facture/`, `CRUD /devis/`, `POST /devis/{id}/convertir/`, `CRUD /retours/`, `CRUD /promotions/`, `GET /clients/creances/` | caissier, commercial, admin |
| 🔴 CRITIQUE | **Stocks** | `/stocks` | `GET /stocks/`, `POST /stocks/entree/`, `POST /stocks/sortie/`, `CRUD /transferts/`, `CRUD /inventaires/`, `CRUD /ajustements-stock/`, `GET /mouvements-stock/` | gestionnaire_stock, admin |
| 🟠 HAUTE | **Logistique** | `/logistique` | `CRUD /missions/`, `CRUD /vehicules/`, `POST /missions/{id}/chargement/`, `/transit/`, `/arrivee/`, `/terminer/`, `POST /missions/{id}/position/`, `GET /missions/{id}/qr/`, `CRUD /maintenances/`, `CRUD /pannes/` | admin, superviseur |
| 🟠 HAUTE | **RH** | `/rh` | `CRUD /employes/`, `CRUD /presences/`, `CRUD /conges/`, `POST /conges/{id}/approuver/`, `GET /employes/{id}/affectations/`, `CRUD /objectifs-vente/` | admin, superviseur |
| 🟡 MOYENNE | **Produits** | `/produits` ⚠️ route manquante | `CRUD /produits/`, `CRUD /categories/`, `CRUD /unites/` | gestionnaire_stock, admin |
| 🟡 MOYENNE | **Fournisseurs** | `/fournisseurs` ⚠️ route manquante | `CRUD /fournisseurs/`, `CRUD /commandes-fournisseurs/`, `POST /commandes-fournisseurs/{id}/recevoir/`, `CRUD /evaluations-fournisseurs/` | gestionnaire_stock, admin |
| 🟡 MOYENNE | **Documents** | `/documents` ⚠️ route manquante | `CRUD /documents/` avec filtres : type, employe, commande, mission, transfert | tous |
| 🟡 MOYENNE | **Rapports** | `/rapports` ⚠️ route manquante | `GET /analytics/ventes/`, `/stock/`, `/finance/`, `/tva/`, `/performance/`, `GET /superadmin/dashboard/` | admin, superviseur, superadmin |

### ⚠️ Routes à ajouter dans `app.routes.ts`

Ces 4 composants existent (`features/.../`) mais **ne sont pas encore câblés dans les routes** :

```typescript
// À ajouter dans app.routes.ts (enfants du AppLayout avec authGuard) :
{ path: 'produits', loadComponent: () => import('./features/products/products/products').then(m => m.Products) },
{ path: 'fournisseurs', loadComponent: () => import('./features/suppliers/suppliers/suppliers').then(m => m.Suppliers) },
{ path: 'documents', loadComponent: () => import('./features/documents/documents/documents').then(m => m.Documents) },
{ path: 'rapports', loadComponent: () => import('./features/reports/reports/reports').then(m => m.Reports) },
```

### 📊 Avancement global

```
Auth & Core       ████████████████████ 100%
Admin             ████████████████████ 100%
Dashboard         ████████░░░░░░░░░░░░  40%  (structure OK, pas d'API réelle)
Finance           ░░░░░░░░░░░░░░░░░░░░   0%  (stub vide)
Ventes            ░░░░░░░░░░░░░░░░░░░░   0%  (stub vide)
Stocks            ░░░░░░░░░░░░░░░░░░░░   0%  (stub vide)
Logistique        ░░░░░░░░░░░░░░░░░░░░   0%  (stub vide)
RH                ░░░░░░░░░░░░░░░░░░░░   0%  (stub vide)
Produits          ░░░░░░░░░░░░░░░░░░░░   0%  (stub + route manquante)
Fournisseurs      ░░░░░░░░░░░░░░░░░░░░   0%  (stub + route manquante)
Documents         ░░░░░░░░░░░░░░░░░░░░   0%  (stub + route manquante)
Rapports          ░░░░░░░░░░░░░░░░░░░░   0%  (stub + route manquante)
```

---

## Contexte projet

DjoulaGest est un ERP multi-sites pour les entreprises guinéennes (Guinée Conakry).
Problème résolu : entreprises gérant leurs activités via des tableurs/registres papier disparates → erreurs, fraudes, manque de traçabilité.

Ce dépôt (`front_fac`) est l'application **Angular** du projet. Elle partage :

- Le même **backend** : Django REST Framework sur `https://gestion.kingreys.fr/api`
- Le même **design system** que l'app mobile Flutter (`mobile_fac`)
- Le même **nom et logo** « DJ »

## Stack technique

| Outil | Version |
|-------|---------|
| Angular | ^20.3 |
| TypeScript | ~5.9 |
| Tailwind CSS | ^4.2 |
| RxJS | ~7.8 |
| Karma / Jasmine | Tests unitaires |
| Déploiement | Docker + Nginx (backend), Vercel possible (frontend) |

## Structure du projet

```
front_fac/src/app/
├── core/
│   ├── auth/           ← AuthStateService (signal-based)
│   ├── guards/         ← authGuard, roleGuard
│   ├── interceptors/   ← AuthInterceptor (JWT), ErrorInterceptor
│   ├── models/         ← user.model.ts
│   ├── services/
│   │   ├── auth.ts         ← Login, refresh, logout, simulation de rôle
│   │   ├── companies.ts    ← CRUD companies (superadmin)
│   │   ├── users.ts        ← CRUD users
│   │   ├── storage.ts      ← localStorage wrapper
│   │   └── toast.ts        ← Notifications toast
│   ├── theme/
│   │   └── theme.ts        ← Couleurs + design tokens
│   └── utils/
│       ├── token.utils.ts  ← Décodage + expiration JWT
│       └── validators.ts
├── shared/
│   ├── layout/
│   │   ├── app-layout/             ← Shell app authentifiée
│   │   ├── topbar/                 ← Header page publique
│   │   ├── authenticated-topbar/   ← Header app protégée
│   │   ├── sidebar/                ← Navigation latérale
│   │   └── footer/                 ← Footer page publique
│   ├── components/
│   │   ├── forbidden/      ← Page 403
│   │   ├── page-not-found/ ← Page 404
│   │   └── spinner/
│   ├── directives/
│   │   └── has-role.ts     ← *hasRole="['admin']"
│   ├── pipes/
│   │   └── date-fr-pipe.ts ← Date en français
│   └── ui-kit/
│       ├── modal/
│       ├── spinner/
│       └── toast/
└── features/
    ├── auth/
    │   ├── login/
    │   ├── forgot-password/
    │   └── reset-password/
    ├── home/           ← Landing page publique
    ├── dashboard/      ← KPIs personnalisés par rôle
    ├── profile/        ← Profil utilisateur
    ├── admin/
    │   ├── companies/  ← superadmin seulement
    │   └── users/
    ├── inventory/      ← Stocks et mouvements
    ├── sales/          ← Ventes, clients, commandes, devis
    ├── finance/        ← Caisses, sessions, transactions
    ├── logistics/      ← Missions, véhicules, carte temps réel
    ├── hr/             ← Employés, présences, congés
    ├── documents/      ← Gestion documentaire
    ├── suppliers/      ← Fournisseurs
    ├── products/       ← Catalogue produits
    └── reports/        ← Rapports PDF/Excel
```

## API Backend

**Base URL :** `https://gestion.kingreys.fr/api` (défini dans `environment.ts`)
**Swagger :** `https://gestion.kingreys.fr/api/schema/docs/`
**Auth :** JWT Bearer token (SimpleJWT)

### Environments

```typescript
// environment.ts (dev)
{ production: false, apiUrl: 'https://gestion.kingreys.fr/api', swaggerUrl: '...docs/' }

// environment.prod.ts (prod)
{ production: true, apiUrl: 'https://gestion.kingreys.fr/api', swaggerUrl: '...swagger-ui/' }
```

### Auth flow (AuthService)

> ⚠️ Endpoints corrects — vérifiés contre `back_fac` le 15/06/2026

```
POST /auth/login/                    body: {email, password}
                                     ← {access, refresh, user} → stocké en localStorage
POST /auth/refresh/                  body: {refresh}
                                     ← {access, refresh} → auto-refresh 1 min avant expiration
POST /auth/logout/                   body: {refresh}  ← OBLIGATOIRE pour blacklister le token
GET  /auth/me/
POST /auth/first-login/              body: {token, password, password_confirm}
                                     ← {success, data: {access, refresh, user}, message}
POST /auth/password-reset/           body: {email}
POST /auth/password-reset/confirm/   body: {token, new_password, new_password_confirm}
```

Les tokens sont gérés par `AuthService` avec des **Angular Signals** (`signal<CurrentUser | null>`).
Le refresh est planifié automatiquement via `setTimeout` à chaque login.

## Routes (app.routes.ts)

| Path | Composant | Protection |
|------|-----------|------------|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/forgot-password` | ForgotPassword | Public |
| `/reset-password` | ResetPassword | Public |
| `/first-login` | FirstLogin | Public |
| `/dashboard` | Dashboard | authGuard |
| `/profile` | Profile | authGuard |
| `/stocks` | Inventory | authGuard |
| `/ventes` | Sales | authGuard |
| `/finance` | Finance | authGuard |
| `/logistique` | Logistics | authGuard |
| `/rh` | Hr | authGuard |
| `/produits` | Products | authGuard |
| `/fournisseurs` | Suppliers | authGuard |
| `/documents` | Documents | authGuard |
| `/rapports` | Reports | authGuard |
| `/companies` | Companies | authGuard + roleGuard(superadmin) |
| `/admin` | Users | authGuard + roleGuard(admin, superadmin) |
| `/forbidden` | Forbidden | authGuard |
| `**` | PageNotFound | — |

Toutes les routes protégées sont enfants d'un `AppLayout` (shell avec sidebar + topbar).

## Rôles utilisateur

```typescript
// Directive template
<div *hasRole="['admin', 'superadmin']">...</div>

// Dans les routes
data: { roles: ['superadmin'] }  // roleGuard vérifie ce tableau
```

| Rôle | Accès et responsabilités |
|------|--------------------------|
| **superadmin** | Tout + gestion multi-entreprise (`/companies`), activation/désactivation entreprises |
| **admin** | Configuration système, gestion utilisateurs, validation caisses de zone |
| **superviseur** | Vue globale multi-sites, validation opérations sensibles, rapports consolidés |
| **gestionnaire_stock** | Stocks, produits, approvisionnements, transferts inter-dépôts |
| **caissier** | Ouverture/fermeture session caisse, enregistrement ventes et paiements |
| **chauffeur** | Ses missions, scan QR démarrage, GPS, signature réception, déclaration pannes |
| **maintenancier** | Interventions et maintenance des véhicules |
| **commercial** | Clients, devis, commandes |

**Simulation de rôle** : le superadmin peut simuler n'importe quel utilisateur via `AuthService.simulateUser()`.
`isSimulating` et `simulatedAs` sont des signals computed.

Permissions granulaires : lecture seule / écriture / validation — gérées côté backend.
Journal d'audit : toutes les actions sont tracées (qui, quand, quelle action).
Blocage du compte après plusieurs tentatives de connexion échouées.

## Périmètre Fonctionnel (CDC §3)

### 3.1 Zones et Dépôts
- Zones géographiques nommées (ex : Coyah, Kaloum) avec coordonnées GPS
- L'administrateur clique sur la carte OpenStreetMap pour définir le centre de la zone
- Chaque dépôt : gestionnaire assigné, caisse physique, comptes mobile money (Orange Money, MTN)
- Tableau de bord par dépôt : stock disponible, solde caisse, historique des opérations
- Transfert de responsabilité entre gestionnaires avec historique

### 3.2 Produits
- Fiche produit : nom, référence, catégorie, unité de mesure, prix achat/vente par zone
- Seuils de stock minimum avec alertes automatiques
- Variantes (taille, couleur, conditionnement)
- Produits périmables : suivi FEFO (First Expired, First Out)
- Import/export catalogue CSV/Excel

### 3.3 Stocks et Mouvements
- Approvisionnement : achats fournisseurs + bons de réception
- Transferts inter-dépôts : demande → validation → expédition → réception (traçabilité complète)
- Inventaires physiques périodiques + détection d'écarts
- Ajustements de stock : motif obligatoire + validation superviseur
- Gestion FIFO (First In, First Out) par défaut

### 3.4 Fournisseurs
- Fiche fournisseur : nom, contacts, adresse, conditions de paiement
- Suivi commandes et livraisons attendues
- Historique des achats, gestion avances et dettes
- Évaluation et comparaison fournisseurs (délais, qualité, coût)

### 3.5 Ventes et Clients
- Fiche client : particulier ou entreprise
- Commandes avec sélection dépôt source
- Génération bons de livraison et factures PDF avec numérotation automatique
- Paiements : comptant, partiel, à crédit
- Suivi créances et relances automatiques
- Devis avec conversion en commande
- Application automatique TVA sur les factures
- Remises et promotions (par produit / client / période)

### 3.6 Finance — CRITIQUE

#### Hiérarchie des caisses physiques (4 niveaux)

```
Caisse Entreprise (permanente) → Caisse Zone → Caisse Dépôt → Session Caissier
```

Chaque niveau consolide automatiquement les fonds du niveau inférieur à sa fermeture.

| Règle | Détail |
|-------|--------|
| Jamais supprimée | Une caisse fermée reste en base définitivement |
| Jamais réouverte | Une caisse fermée ne peut plus être modifiée |
| Motif obligatoire | Tout écart à la fermeture exige un motif saisi |
| Double comptage | Le receveur compte lui-même et saisit son propre montant |
| Justificatif | Tout versement inter-niveau nécessite un justificatif joint |
| Blocage | Impossible de fermer une caisse si des sous-caisses sont ouvertes |

#### Comptes de paiement mobile (Orange Money, MTN Money)

- Même hiérarchie que les caisses physiques
- ID de transaction opérateur **obligatoire** pour chaque transaction mobile
- À la fermeture : capture du relevé de compte opérateur comme justificatif
- Comparaison solde virtuel calculé vs relevé réel — tout écart exige un motif

#### Autres fonctionnalités financières

- Dépenses opérationnelles par catégorie (carburant, maintenance, salaires)
- Rapports : journal de caisse, bilan recettes/dépenses, état des créances
- Gestion multi-devises dynamique : GNF (défaut), USD, EUR — taux avec date d'expiration
- Alerte automatique à l'expiration d'un taux de change
- Vue consolidée administrateur : tableau récapitulatif de toutes les caisses

### 3.7 Logistique (Flotte et Transport)

#### Modes de transport

| Mode | Processus | Différence |
|------|-----------|------------|
| **Standard (obligatoire)** | Création mission → QR généré → chauffeur scanne QR → démarrage → GPS toutes les 1 min → signature à l'arrivée | Aucun équipement spécial |
| **Avancé NFC (optionnel)** | Idem + scan puce NFC sur véhicule pour vérifier présence physique | Puce NFC installée sur chaque véhicule |

#### Suivi GPS

- QR code UUID unique généré à la création de la mission
- Le chauffeur scanne le QR depuis son téléphone mobile (navigateur ou app)
- GPS activé : position envoyée toutes les **1 minute** via API Geolocation navigateur
- Enregistrement heure départ, trajet, distance, heure arrivée

#### Signature numérique de réception

- Le destinataire signe sur l'écran du téléphone du chauffeur (Canvas HTML5)
- Signature horodatée et rattachée définitivement à la mission
- Bon de livraison signé généré automatiquement en PDF
- En cas de produits manquants : signature avec réserve + motif + alerte responsable
- En cas de refus : mission → statut **Litige** + alerte immédiate superviseur

#### Statuts de mission

| Statut | Description |
|--------|-------------|
| Planifiée | Créée, transport pas encore démarré |
| Chargement en cours | Chargement des marchandises |
| Transport en cours | Camion en route vers la destination |
| Arrivé à destination | En attente de signature |
| Litige | Refus de signature ou problème signalé |
| Terminée | Signature validée, mission clôturée |

#### Gestion de la flotte

- Fiche véhicule : immatriculation, marque, modèle, année, capacité, statut NFC
- Suivi kilométrage et consommation carburant
- Maintenance préventive (alertes kilométrage/calendrier) et corrective
- Gestion pannes : déclaration, réparation, coût associé
- Documents véhicule (assurance, visite technique) avec rappels d'expiration

### 3.8 Tableau de Bord Logistique

- Carte OpenStreetMap interactive : positions camions en mission en temps réel
- Liste missions actives : identifiant, chauffeur, camion, sites départ/destination, statut
- Historique trajets par mission : bons de livraison signés, durée totale
- Alertes automatiques : arrêt prolongé, retard, perte signal GPS, mission en litige

### 3.9 Planification des Transferts de Stock

- Mode automatique : analyse périodique niveaux de stock + recommandations soumises à validation
- Mode manuel : transferts créés par admin ou responsable logistique
- Un transfert validé déclenche la création d'une mission logistique

### 3.10 Ressources Humaines

- Fiche employé : informations personnelles, poste, dépôt d'affectation
- Gestion présences, absences et congés
- Suivi permissions et historique des mutations entre dépôts

### 3.11 Gestion des Utilisateurs et Rôles

(voir section Rôles ci-dessus)

### 3.12 Fidélité Client

- Attribution automatique de points à chaque achat (barème configurable par l'admin)
- Conversion points → réductions ou bons d'achat (ex : 100 points = réduction)
- Tableau de bord de suivi des points par client
- Notifications automatiques au client à l'atteinte d'un seuil de récompense

### 3.13 Gestion Documentaire

- Stockage contrats fournisseurs et clients
- Archivage factures fournisseurs et bons de livraison
- Rattachement documents à une opération (commande, transfert, mission logistique)
- Recherche et consultation par catégorie, date ou opération
- Contrôle d'accès selon le rôle

### 3.14 Taxes (TVA)

- Configuration taux TVA global et par catégorie de produit
- Application automatique sur les factures de vente
- Affichage prix HT et TTC sur les factures
- Rapports TVA collectée par période
- Paramétrage multi-taxes pour les réglementations locales

### 3.15 Multi-Entreprise (SaaS)

- Chaque entreprise : espace isolé, données propres, aucun accès croisé
- Création et gestion depuis le superadmin
- Activation/désactivation sans perte de données
- Tableau de bord superadmin : vue globale toutes entreprises actives
- Facturation et abonnement par entreprise (configurable)

## Fonctionnalités Transversales (CDC §4)

### Dashboard & Analytique (4.1)

- KPIs personnalisés par rôle : CA (jour/semaine/mois), bénéfices, dépenses, stock critique
- Graphiques : évolution ventes, top produits, taux de rotation stocks
- Comparaison performances entre zones/dépôts
- Meilleurs clients et produits les plus vendus
- Export rapports PDF et Excel

### Notifications et Alertes (4.2)

- Temps réel (in-app) : rupture stock, échéance client, maintenance véhicule, expiration documents
- Alertes : écarts de caisse, missions en litige, caisse négative
- Notifications email pour les événements importants
- Centre de notifications avec historique

### Messagerie Interne (4.3)

- Communication entre utilisateurs du système
- Discussions liées à une opération spécifique (commande, transfert, panne, litige)

### Objectifs Commerciaux (4.4)

- Définition d'objectifs de vente par dépôt et par période
- Suivi de l'avancement en temps réel
- Rapports de performance commerciale

### API & Intégrations (4.5)

- API RESTful documentée (Swagger/OpenAPI)
- Intégration Orange Money API (paiement mobile)
- Export de données pour systèmes comptables externes

## Fonctionnalités Optionnelles (CDC §5)

À implémenter uniquement si le temps le permet :

| Feature | Note |
|---------|------|
| **NFC véhicules** | Requiert puce NFC physique sur chaque véhicule |
| **Scan code-barres** | Via API caméra navigateur mobile |
| **IA / prévisions** | Prévisions ventes, suggestions réapprovisionnement, détection anomalies |
| **2FA** | JWT + blocage compte couvre les besoins de base |
| **Cartographie avancée** | Polygones zones avec Leaflet.draw |

## Architecture Technique (CDC §7)

| Composant | Technologie |
|-----------|-------------|
| Frontend | Angular (LTS) |
| Backend | Django REST Framework |
| Base de données | PostgreSQL |
| Authentification | JWT (SimpleJWT) |
| Cartographie | OpenStreetMap / Leaflet.js |
| Suivi GPS | API Geolocation navigateur (polling 1 min) |
| Signatures numériques | Canvas HTML5 |
| Stockage fichiers | AWS S3 ou local (configurable) |
| Déploiement | Docker + Nginx |
| Documentation API | Swagger / drf-spectacular |

## Design System

### Palette de couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#1A56A0` | Bleu institutionnel, boutons, liens |
| secondary | `#0E9F6E` | Vert validation, succès |
| accent | `#F59E0B` | Ambre, alertes |
| danger | `#EF4444` | Erreurs |
| background (light) | `#F4F6FA` | Fond général |
| surface (light) | `#FFFFFF` | Cartes |
| background (dark) | `#0F1117` | Fond nuit |
| orangeMoney | `#F97316` | Badge Orange Money |
| mtnMoney | `#EAB308` | Badge MTN Money |

Défini dans `src/app/core/theme/theme.ts`.

### Tailwind CSS 4

Ce projet utilise **Tailwind CSS v4** avec `@tailwindcss/postcss`.

- Pas de `tailwind.config.js` — configuration inline via `@theme` dans CSS
- Classes utilitaires directement dans les templates HTML

### Conventions de code

- Composants **Standalone** (pas de `NgModule`)
- Lazy loading avec `loadComponent()` sur toutes les routes features
- Services avec `providedIn: 'root'`
- État avec **Angular Signals** (pas RxJS BehaviorSubject pour l'état UI)
- Injection avec `inject()` (pas de constructeur)

## Services

### AuthService (`core/services/auth.ts`)

- `currentUser` : `Signal<CurrentUser | null>`
- `isLoggedIn` : `Signal<boolean>`
- `isSimulating` : `computed` signal
- `login(credentials)` → `Observable<LoginResponse>`
- `logout()` → `Observable<void>`
- `refreshToken()` → `Observable<RefreshTokenResponse>`
- `simulateUser(userId)` / `stopSimulation()`
- `hasRole(roles[])` : vérification rôle courant
- Auto-refresh planifié 60s avant expiration

### StorageService (`core/services/storage.ts`)

Wrapper `localStorage` typé pour les tokens JWT et données utilisateur.

## Interceptors

| Interceptor | Rôle |
|-------------|------|
| `auth-interceptor.ts` | Injecte `Authorization: Bearer <token>` sur toutes les requêtes |
| `error-interceptor.ts` | Gère 401 → logout, 403 → /forbidden, affiche les toasts d'erreur |

## Tests

Framework : **Karma + Jasmine**

```bash
npm test                          # watch mode
npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage
```

### Pattern de test (spec.ts)

Toujours fournir `provideHttpClient()` dans les specs de composants qui injectent des services HTTP :

```typescript
await TestBed.configureTestingModule({
  imports: [MonComposant],
  providers: [provideRouter([]), provideHttpClient()],
}).compileComponents();
```

## Commandes utiles

```bash
# Développement
npm start              # ng serve (port 4200)

# Build
npm run build          # production build

# Tests
npm test               # watch mode
npm run test -- --watch=false --browsers=ChromeHeadless   # CI

# Linting / type check
npx tsc --noEmit       # vérification TypeScript
```

## Notes importantes

1. **Toujours utiliser `inject()`** — pas de constructeur avec paramètres dans les services.
2. **Signals > RxJS** pour l'état UI local — réserver `Observable` pour les appels HTTP.
3. **Standalone components** partout — ne pas importer dans un `NgModule`.
4. **Lazy loading obligatoire** — toutes les features sont chargées avec `loadComponent()`.
5. **`[href]="swaggerUrl"`** dans le footer (property binding Angular), jamais `href={...}` (syntaxe JSX invalide).
6. **Monnaie** : afficher toujours en GNF par défaut. Le système gère aussi USD et EUR avec taux configurables et date d'expiration.
7. **Caisses** : jamais supprimées, jamais réouvertes. Ne pas implémenter de bouton "supprimer" sur une caisse.
8. **Signature numérique** : obligatoire dans tous les cas de réception de mission. Canvas HTML5.
9. **Offline** : L'interface doit être résiliente aux timeouts. Mode offline partiel prévu (enregistrement + sync ultérieure).
10. **Langue** : interface entièrement en français.
11. **Dark mode** : le thème est défini mais le toggle UI n'est pas encore implémenté.
