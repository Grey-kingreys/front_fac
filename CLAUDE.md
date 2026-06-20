# DjoulaGest Frontend — CLAUDE.md

> CDC v1.0 — Mars 2026 | Groupe 1 | Deadline livraison : **20/06/2026**

## ➕ RH — présence 100% self-service + récap user-based (20/06/2026)

Suite à la clarification « **les employés sont les utilisateurs de l'entreprise** » :
- **Formulaire « Nouvelle présence » (saisie manuelle admin) SUPPRIMÉ** ([hr.html](src/app/features/hr/hr/hr.html)
  + [hr.ts](src/app/features/hr/hr/hr.ts)) : il faisait doublon avec le pointage self-service et son sélecteur
  `/employes/` était vide. La présence est désormais **100 % self-service** (carte de pointage géolocalisée) ;
  l'admin **consulte** le récap. Bouton FAB + panneau + `presenceForm`/`canCreatePresence` retirés.
- **Récap = utilisateurs** : `GET /presences/recap/` renvoie l'effectif basé sur les **comptes de l'entreprise**
  rattachés à un dépôt (présents = ont pointé, absents = sinon). Aucun changement côté affichage (mêmes clés).
- **Auto-provision backend** : un employé sans fiche peut maintenant pointer (créée à la volée) → la carte de
  pointage s'affiche pour tout le personnel (plus de message « aucune fiche employé » bloquant). `tsc`+`ng build`=0.

## ➕ RH self-service — 2ᵉ vague : navigation, absents, motif de refus (20/06/2026)

Corrections suite à un audit complet du module RH self-service.

- **Navigation RH ouverte à tout le personnel** ([sidebar.ts](src/app/shared/layout/sidebar/sidebar.ts)) :
  l'entrée « Ressources Humaines » (`/rh`) passe de `['admin','superviseur']` à **tous les rôles sauf
  superadmin** — sinon les employés ne peuvent pas pointer / demander un congé. Route `/rh` sans roleGuard
  (déjà le cas).
- **Onglet par défaut** ([hr.ts](src/app/features/hr/hr/hr.ts)) : si `!canManageUsers()` → ouvre sur
  **Présences** (avant : « Utilisateurs » → `GET /users/` 403). L'onglet « Utilisateurs » est **masqué**
  pour les non-admins.
- **Liste présences réservée aux managers** : `GET /presences/` = `RH_READ` (admin/superviseur) côté backend.
  Les autres rôles ne chargent **plus** la liste (évite un 403) — ils n'ont que leur **carte de pointage**
  (+ message si aucune fiche employé liée).
- **Récap du jour (absents)** : bannière admin/superviseur consommant `GET /presences/recap/` →
  **présents / absents / effectif** + liste dépliable des absents (CDC « gérer présence ET absence »).
- **Motif de refus de congé** : modale de saisie au refus → `POST /conges/{id}/refuser/ {motif_traitement}` ;
  affichage « Motif du refus : … » sur les congés refusés (`motif_traitement`).
- **Badges « Sur site / Hors site »** rendus **visibles sur mobile** (étaient en `hidden sm:`).
- `canCreatePresence` aligné sur **admin** (= `RH_WRITE` backend). `tsc` + `ng build` = 0 erreur.

### Superadmin — Zones & Dépôts retirés (20/06/2026)

Le superadmin gère la **plateforme SaaS**, pas les zones/dépôts internes d'une entreprise (CDC §3.15).
Retiré `superadmin` des rôles de l'entrée sidebar « Zones & Dépôts » et du `roleGuard` de la route
`/zones` (`app.routes.ts`) → `['admin']`. (Le backend bloquait déjà via `IsSuperAdminBlocked`.)

## ➕ RH self-service : pointage présence + demande de congé (20/06/2026)

Onglets **Présences** et **Congés** de `/rh` passés en self-service (parité avec le mobile).
⚠️ nécessite le backend RH déployé (migrations `companies/0007`, `rh/0003`, `notifications/0002`).

- **Présences** ([hr.ts](src/app/features/hr/hr/hr.ts) + [hr.html](src/app/features/hr/hr/hr.html)) :
  carte « Pointer ma présence » en haut de l'onglet → bouton qui lit la **géoloc navigateur**
  (`navigator.geolocation`) et envoie `{latitude, longitude}` à `POST /presences/pointer/`. État piloté
  par `GET /presences/aujourdhui/` (`myPresence` signal) : le bouton disparaît une fois pointé et affiche
  « Présence enregistrée · pointé à HH:MM · à X m / hors site ». Badge **Sur site / Hors site**
  (`dans_perimetre`) dans la liste. La saisie manuelle admin (`POST /presences/`) est conservée.
- **Congés** : bouton « Demander un congé » ouvert à **tout le personnel** (`isStaff()`), formulaire
  **sans sélecteur d'employé** (le backend déduit l'employé du compte) + bandeau d'info. `submitLeave()`
  n'envoie plus `employe`. La validation `approuver`/`refuser` reste gatée admin/superviseur.
- **Interfaces** étendues : `Presence` (+ géo), `Leave` (+ `demande_par_nom`, `motif_traitement`),
  `PresenceTodayStatus`. `tsc --noEmit` = 0.

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

### Champ code_barre produit (20/06/2026)

Ajout du code-barres sur la fiche produit : `Product.barcode` (mappé depuis `code_barre`), `ProductPayload.code_barre`,
`BackendProduct.code_barre` + `mapProduct` (`core/services/products.ts`) ; champ de saisie **« Code-barres »** (optionnel)
dans le formulaire produit (`products.ts` : 3 initialisations du `productForm` + `products.html` après la référence).
⚠️ nécessite la migration backend `produits/0004` déployée.

### Correctif (20/06/2026) — QR mission invisible

| Endpoint | Bug | Correction |
|----------|-----|------------|
| `GET /missions/{id}/qr/` | Le front lisait `r.qr_code_base64` (champ inexistant) alors que le backend renvoie `{qr_code, image_base64}` → `qrImageBase64` restait `null` → modale QR vide (rien affiché). | `logistics.service.ts` (type retour → `{qr_code, image_base64}`) + `logistics.ts:openQrPanel` (`r.image_base64`). Backend = source de vérité, non modifié. |

Ajout **bouton « Télécharger »** dans la modale QR (`logistics.ts:downloadQr` + `logistics.html`) : génère un PNG `QR-{numero}.png` via `<a download>` data-URI (pour impression / collage sur le bon de mission). ⚠️ **Fix** : le bouton utilisait `bg-primary`/`hover:bg-primary/90` — token **non défini** dans ce projet (Tailwind v4, aucun `--color-primary` en `@theme`) → fond transparent + `text-white` = bouton invisible (cliquable mais blanc sur blanc). Remplacé par `bg-blue-600`/`hover:bg-blue-700` comme tous les autres boutons primaires de l'app. **Ne jamais utiliser `bg-primary` côté front** — utiliser `bg-blue-600`. ⚠️ Le QR est **par mission** (UUID unique par mission, pas par véhicule) — il change à chaque mission, donc il s'imprime sur le bon de mission, pas en autocollant permanent sur le camion (ça, c'est le rôle de la puce **NFC** optionnelle, CDC §3.7).

### Correctif (20/06/2026) — App entièrement figée (boutons morts) après un clic Simuler

**Symptôme** : après avoir démarré une simulation de rôle, **tous** les boutons de l'app (Simuler, menu profil, repli sidebar…) cessent de répondre, définitivement.

**Cause racine** (capturée au runtime via CDP) : computeds du dashboard avec accès imbriqué **non protégé** —
`ventesData()?.totaux.nb_commandes`, `…?.totaux.ca_ttc` (×2), `superAdminData()?.companies.total/actives`. Le `?.`
ne protège que le 1ᵉʳ niveau. Quand un endpoint `/analytics/*` répond **200 avec un objet sans le sous-objet attendu**
(ou quand le changement de rôle via simulation fait basculer `dashboard.html` sur une branche lisant ces KPI), `.totaux`
est `undefined` → `TypeError` **pendant le change detection**. Une exception en plein CD fige le rendu de toute l'app à
chaque tick ⇒ tous les boutons paraissent morts.

**Correctif** : null-safety complète (`?.totaux?.…`, `?.companies?.…`) dans `dashboard.ts`. Le `catchError(() => of(null))`
gérait déjà le cas échec ; ce correctif gère le cas **succès au format inattendu**. Vérifié : reproduction CDP → après fix,
simulation OK (bannière affichée), boutons réactifs, **zéro exception**. `tsc --noEmit` = 0.

### Correctifs (20/06/2026) — Sidebar responsive mobile

| Zone | Problème | Correction |
|------|----------|------------|
| `app-layout` + `sidebar` | Sur mobile, la sidebar restait affichée en permanence (fixe 280/72px) et le hamburger du topbar ne faisait que **replier** (comportement « PC ») au lieu d'ouvrir/fermer | Refonte en **drawer mobile-natif** : `<lg` la sidebar est hors écran (`-translate-x-full`), le ☰ ouvre un drawer glissant + **backdrop**, fermeture par backdrop / ✕ / clic sur un lien ; `>=lg` comportement inchangé (fixe + repli 280↔72). Détails : `app-layout.ts` (signal `mobileSidebarOpen`, `toggleMobileSidebar`), `app-layout.html` (backdrop, marge `lg:ml-*` responsive au lieu de `style.margin-left`), `sidebar.ts` (input `mobileOpen`, output `closeMobile`, signal `isMobile` via resize, `effectiveCollapsed`, icône `close`), `sidebar.html` (transform du drawer, bouton ✕ mobile, fermeture au clic de lien). Le repli 72px est devenu `lg:`-only. |

> ⚠️ Hors sujet API : `npm install` exécuté car `leaflet@^1.9.4` (déclaré dans `package.json`, importé par `styles.css`) n'était pas présent dans `node_modules` → `ng serve` échouait sur `Can't resolve 'leaflet/dist/leaflet.css'`.

### Correctifs (20/06/2026) — Audit responsive mobile (pages déjà construites)

> Pendant Angular de l'audit design mobile_fac. La plupart des pages étaient déjà propres ; corrections ciblées :

| Page | Correction |
|------|------------|
| `admin/companies.html`, `admin/users.html` | **Tableaux** enveloppés dans `<div class="overflow-x-auto">` (la colonne Actions pouvait déborder horizontalement sur mobile) ; barre de recherche `min-w-[220px]` → `min-w-0 sm:min-w-[220px]` (évite un retour à la ligne moche en `flex-wrap`). |
| `auth/login`, `auth/forgot-password`, `auth/reset-password`, `auth/first-login` | `gap-12` → `gap-8 lg:gap-12` ; carte formulaire `p-8` → `p-6 sm:p-8` (cosmétique). |
| `home.html` | Grille features `gap-8` → `gap-4 sm:gap-6 lg:gap-8`. |
| `profile.html` | Boîtes OTP 2FA : `gap-2` → `gap-1.5 sm:gap-2`, inputs `w-10 h-13` → `w-9 sm:w-10 h-12 sm:h-13` (tiennent mieux sur ≤ 320px). |

> Faux positifs écartés : modales slide-over `w-full max-w-md` (déjà pleine largeur mobile = OK). `ng build` dev = succès. Dashboard, formulaires d'auth, boutons : déjà responsive, non touchés.

### Fusion RH ⇄ Utilisateurs + alignement sur le mobile (20/06/2026)

Le mobile intègre la **gestion des utilisateurs système dans le RH** (pas d'espace « Utilisateurs » séparé). Le web
avait deux espaces distincts (`/admin` = Utilisateurs `/users/` **et** `/rh` = Employés `/employes/` + Congés). Aligné
sur le mobile :

- **`/rh` réécrit en 3 onglets** (miroir `mobile_fac`) : **Utilisateurs** (`/users/` — liste + filtres rôle/statut +
  recherche debounce 400 ms, CRUD complet : créer email/prénom/nom/téléphone/rôle/dépôt/mot de passe, éditer,
  désactiver/réactiver via `PATCH is_active`, reset mot de passe, supprimer `DELETE /users/{id}/`) ·
  **Présences** (`/presences/`, `ordering=-date`, création employé/date/type_presence[present|absent|retard|mission]/observations) ·
  **Congés** (`/conges/`, filtre statut, création + approuver/refuser `POST /conges/{id}/approuver|refuser/`).
  Le tab Utilisateurs réutilise `UsersService`. `/employes/` n'est plus un écran : il alimente seulement les sélecteurs
  d'employé des présences/congés (comme le mobile).
  **Formulaire de création renommé « employé »** (bouton/titre/toast) ; **sélecteur conditionnel zone/dépôt** : si rôle =
  `superviseur` → dropdown **« Zone de supervision * »** (obligatoire, `zone_id`, dépôt forcé null) ; sinon **« Dépôt »**
  (`depot_id`, zone forcée null) — miroir mobile + règle backend (`UserCreate/UpdateSerializer.validate()`). `UsersService`
  étendu (`zone_id` en payload, `zone_id`/`zone_name` en réponse). `onRoleChange()` réinitialise l'affectation invalide au
  changement de rôle. **Gating** : gestion des comptes = **admin** uniquement ;
  validation congés = admin/superviseur ; création présence = admin/superviseur/gestionnaire_stock (via `AuthService.currentUser().role`).
- **Espace « Utilisateurs » supprimé** : route `/admin` retirée d'`app.routes.ts`, entrée sidebar « Utilisateurs »
  (`/admin`) retirée, composant `features/admin/users/` **supprimé**. Raccourci dashboard « Utilisateurs » repointé
  `/admin` → `/rh`. (Companies `/companies` superadmin inchangé.)
- **Rapports** : la page web `/rapports` a été portée à l'identique sur le mobile (feature `reports/`) — parité confirmée.

`tsc --noEmit` = 0 · `ng build` dev = succès (0 erreur, 0 warning sur RH).

---

### Finance — sélection de caisse à l'ouverture : caisses ouvertes only + auto-pick (20/06/2026)

Alignement avec le mobile pour le panneau « Ouvrir une session » (admin/superviseur). Le `<select>`
proposait **toutes** les caisses actives (y compris **fermées**, qui font échouer l'ouverture côté backend).
Contrainte backend : `CaissePhysique` n'autorise **qu'une caisse ouverte par dépôt**
(`UniqueConstraint(depot, condition=statut='ouverte')`) — pas une seule par entreprise.

- `CaissePhysique` (interface, `finance.service.ts`) : champ **`statut: 'ouverte' | 'fermee'`** ajouté
  (déjà renvoyé par `CaissePhysiqueSerializer`).
- `loadCaisses()` filtre désormais **`is_active && statut === 'ouverte'`** (avant : `is_active` seul).
- `openOpenPanel()` : si **une seule** caisse ouverte (cas mono-dépôt) → `openForm.caisse` **pré-sélectionnée
  d'office** ; plusieurs → choix manuel.
- `finance.html` : 0 caisse → message « Aucune caisse ouverte… » ; **1 caisse → tuile lecture seule**
  (nom — dépôt, plus de `<select>`) ; ≥ 2 → `<select>` inchangé. Sous-titre « Sélectionnez » → « Vérifiez ».

`tsc --noEmit` = 0.

---

### Finance — vue caissier « Caisse & Sessions » alignée mobile (20/06/2026)

Le mobile a une UX caissier dédiée (carte « session active » + ouvrir/fermer sa propre session, caisse
auto-résolue). Le web Finance était orienté gestion (KPIs globaux + table + sélection manuelle de caisse).
Ajout côté web (`finance.ts`/`finance.html`, `finance.service.ts`) :
- **Carte « session active »** en tête de l'onglet Sessions (gradient vert), miroir mobile : KPIs
  **Solde ouverture / Entrées / Sorties / Solde calculé** (`total_entrees`/`total_sorties`/`solde_fermeture_theorique`
  ajoutés à l'interface `CashSession` — déjà renvoyés par `SessionCaisseListSerializer`). Pour le **caissier**,
  bouton **« Fermer la session »** sur la carte ; carte « Aucune session active » + **« Ouvrir une session »** sinon.
- **Caisse auto-résolue** pour le caissier à l'ouverture (depuis `currentUser().depot_id` → caisse du dépôt), comme
  le mobile — plus de sélection manuelle (conservée pour admin/superviseur). KPIs globaux **masqués pour le caissier**.
- **Clôture** : **écart calculé en direct** (solde réel − solde calculé) + **motif obligatoire si écart ≠ 0**
  (règle anti-fraude, validée aussi backend). `activeSession`/`isCaissier`/`soldeCalcule`/`closeEcart` = computeds.

- **Isolation caissier** : un caissier ne voit/ferme que **ses propres** sessions. `displayedSessions` (computed)
  filtre `s.caissier === currentUser().id` pour le rôle caissier (table + carte active). Le backend l'imposait déjà
  (`SessionCaisseViewSet.get_queryset` → `filter(caissier=user)` ; `fermer` → `PermissionDenied` si pas la sienne) ;
  ce filtre client ajoute la défense en profondeur et **corrige l'artefact de simulation** (le token admin renvoyait
  toutes les sessions de l'entreprise, donc un caissier simulé voyait/fermait des sessions d'autres caissiers).

`tsc --noEmit` = 0 · `ng build` dev = succès (0 erreur / 0 warning Finance).

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

**Simulation de rôle** : **l'admin** (et lui seul — aligné sur `mobile_fac`, cf. CDC : le superadmin gère la plateforme SaaS, pas les données internes d'une entreprise) peut simuler n'importe quel utilisateur **actif de son entreprise** (soi-même exclu) via `AuthService.simulateUser()`. Gating UI : `canSimulate()` dans `authenticated-topbar` teste le **vrai** user connecté (`realUser ?? currentUser`). Simulation 100 % côté client : aucun nouveau JWT, le token de l'admin reste le seul utilisé pour les appels API — c'est une prévisualisation d'UI rôle-gated, pas une bascule de privilèges. `isSimulating` et `simulatedAs` sont des signals computed ; `clearAuth()` réinitialise `realUser` (reset de la simulation à toute déconnexion, y compris via 401 interceptor).

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
| ~~**2FA**~~ | ✅ Implémenté (17/06) — voir section 2FA ci-dessous |
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
