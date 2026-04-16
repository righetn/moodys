# Audit codebase — front, sécurité DB & traitement des données

Audit statique du dépôt (lecture du code, pas d’exécution de tests de pénétration). Ce document liste constats et **actions recommandées**.

## Correctifs déjà appliqués (suivi)

Les points suivants ont été traités dans le code : **GET** optionnellement protégé par `DASHBOARD_READ_TOKEN`, en-têtes `Cache-Control` sur l’API, erreurs 400/500 atténuées en prod, limite `Content-Length` sur le PUT, logs serveur sans détail Zod en prod, suppression du **DROP automatique** de `score` au runtime, schéma Zod renforcé (URL, scores, tailles, cohérence score/scoreFilter, max clients), pas de fallback `data.json` en prod sans DB, KPIs dérivés dans le provider, export CSV avec échappement uniforme, clés React stables pour les appels, `aria-sort` sur les colonnes triables. Restent notamment : auth utilisateur sur la page, rate limiting distribué, retrait complet du DDL runtime, tests automatisés.

---

## 1. Synthèse des risques

| Zone | Gravité perçue | Résumé |
|------|----------------|--------|
| `GET /api/dashboard` sans auth | **Élevée** | Exposition publique des données clients (PII, liens HubSpot, synthèses d’appels). |
| `PUT /api/dashboard` (token partagé) | **Moyenne** | Secret long‑vécu, pas de rate limiting, pas d’audit ; risque de fuite / abus d’écriture. |
| DDL & migration au runtime | **Moyenne** | `CREATE TABLE` / détection legacy + `DROP TABLE` sur le chemin des requêtes applicatives. |
| Validation Zod | **Basse–moyenne** | Champs sensibles peu contraints (URLs, scores hors 1–3, tailles non bornées). |
| Front (dashboard) | **Basse** | Données sensibles dans le bundle client ; export CSV partiellement robuste ; pas d’auth UI. |

---

## 2. Front — bonnes pratiques & UX

### 2.1 Données sensibles côté client

- **`DashboardProvider`** reçoit la liste complète des `clients` et la place dans un **Context React** consommé par un composant `"use client"` (`SentimentDashboard`).
- **Conséquence** : tout le payload (noms, segments, problèmes, résumés d’appels, URLs HubSpot) est **sérialisé vers le navigateur** avec la page (RSC → client). C’est cohérent pour un dashboard interne, mais ce n’est **pas** adapté à une exposition Internet sans contrôle d’accès.

**Étapes d’amélioration**

1. Documenter explicitement que le dashboard est **données complètes côté client**.
2. Si exposition publique : ajouter **auth** (session, SSO, middleware Next.js) et/ou **filtrer** les champs renvoyés au client selon le rôle.
3. Envisager **pagination / chargement partiel** si le volume augmente (perf + surface d’exposition).

### 2.2 Contexte React

- Un seul gros contexte mélange **données serveur** (`clients`, `kpis`) et **état UI** (filtres, recherche). Les `setSearch` / `setScoreFilter` ne sont pas dans le tableau de dépendances du `useMemo` du `value` — aujourd’hui les setters sont stables, donc pas de bug évident, mais la surface de re-render est large.

**Étapes d’amélioration**

1. Scinder en **deux contextes** (données vs filtres UI) ou utiliser un store léger si la complexité augmente.
2. Passer `kpis` en **dérivé mémoïsé** de `clients` dans le provider pour éviter toute désynchronisation si la logique évolue.

### 2.3 Accessibilité & sémantique

- Tri sur en-têtes via `<button>` dans `<TableHead>` : correct pour le clavier ; vérifier **ordre de tabulation**, **aria-sort** sur les colonnes triables, et libellés pour lecteurs d’écran.
- Les **Select** Radix : vérifier association label / contrôle si exigence a11y stricte.

**Étapes d’amélioration**

1. Passer un audit **axe-core** ou équivalent sur la page tableau.
2. Ajouter `aria-sort` et textes visibles pour l’état de tri.

### 2.4 Export CSV

- Seuls `problems` et `features` sont entourés de guillemets ; **`displayName`, `segment`, etc.** ne le sont pas → une virgule ou un saut de ligne dans un nom peut **casser le CSV**.
- Pas d’échappement RFC 4180 systématique pour toutes les colonnes.

**Étapes d’amélioration**

1. Utiliser une lib CSV (`papaparse`, `csv-stringify`) ou une fonction d’échappement **uniforme** sur toutes les colonnes.
2. Ou exporter **JSON** pour les usages outils.

### 2.5 Clés React dans les listes

- Détail des appels : `key={\`${call.title}-${call.date}\`}` — collision possible si deux appels identiques.

**Étapes d’amélioration**

1. Introduire un **id stable** par appel (côté données) ou utiliser l’index seulement en dernier recours.

### 2.6 Performance

- Filtrage / tri en mémoire sur la liste complète : OK pour ~centaines de lignes ; prévoir **virtualisation** du tableau (ex. `@tanstack/react-virtual`) si milliers de lignes.

---

## 3. Sécurité — API & authentification

### 3.1 `GET /api/dashboard` ouvert

- Aucun contrôle d’accès : **n’importe qui** avec l’URL peut récupérer `{ clients, kpis }`.

**Étapes d’amélioration**

1. **Protéger** la route (même auth que la page, cookie de session, ou clé API en lecture pour usages machine‑to‑machine).
2. Ou **désactiver** le GET en prod si seul le rendu serveur de la page est nécessaire.
3. Ajouter des en-têtes de **cache** / politique explicite si pertinent (`Cache-Control: private, no-store` pour données sensibles).

### 3.2 `PUT /api/dashboard` — modèle de secret

- Auth par **`DASHBOARD_UPDATE_TOKEN`** (Bearer ou header custom) : correct pour un script, fragile pour une prod multi‑acteurs.
- Pas de **rotation**, pas de **journalisation** des écritures, pas de **limite de débit** (brute force sur le token ou payloads énormes).

**Étapes d’amélioration**

1. Préférer **OAuth2 / session** ou **signed JWT** à courte durée pour les humains ; token long seulement pour CI avec rotation.
2. Ajouter **rate limiting** (middleware, edge config, ou reverse proxy).
3. Limiter la **taille du body** (middleware `bodyParser` / config route).
4. Logger côté serveur **`batchId`**, horodatage, et identité de l’appelant (sans secrets).

### 3.3 Fuite d’information dans les erreurs

- `PUT` renvoie **`treeifyError(parsed.error)`** en 400 : utile en dev, peut révéler la **structure interne** des payloads en prod.

**Étapes d’amélioration**

1. En production, renvoyer un message générique et logger le détail côté serveur uniquement.

### 3.4 `PUT` — erreurs 500

- Le message d’erreur DB peut remonter au client (`e.message`) : risque de **fuite d’infos** (stack, détail SQL).

**Étapes d’amélioration**

1. Mapper les erreurs à des **codes** stables côté client ; détail uniquement dans les logs serveur.

### 3.5 CORS & surface HTTP

- Pas de configuration explicite visible : par défaut Next.js. Vérifier qu’aucun domaine non autorisé n’appelle le PUT depuis le navigateur si le token est un jour stocké côté client (à éviter).

**Étapes d’amélioration**

1. Interdire explicitement l’usage du token dans du JS client ; documenter **appels serveur‑à‑serveur uniquement** pour le PUT.

---

## 4. Sécurité — accès base de données

### 4.1 DDL sur le chemin des requêtes

- **`ensureSchema`** exécute `CREATE TABLE IF NOT EXISTS` à **chaque** lecture/écriture.
- **`migrateLegacyScoreTableIfNeeded`** peut exécuter **`DROP TABLE public.score CASCADE`** si la table existe sans colonne `batch_id`.

**Risques**

- Latence et verrous indésirables en charge.
- En cas de **faux positif** de détection ou de déploiement concurrent, risque de **perte de données**.
- Le rôle applicatif a besoin de **privilèges DDL** élargis (moins principe du moindre privilège).

**Étapes d’amélioration**

1. Retirer le DDL du **runtime** : migrations dédiées (**Drizzle / Prisma / Flyway / SQL versionné**) exécutées en CI ou manuellement.
2. Réserver `DROP`/migration à des **scripts one‑shot** documentés, avec sauvegarde.
3. Utiliser un rôle DB **lecture seule** pour l’app si possible, et un rôle **migration** séparé.

### 4.2 Connexion

- `DATABASE_URL` / `POSTGRES_URL` : jamais exposé au client si non préfixé `NEXT_PUBLIC_` — **OK** tel quel.
- Vérifier que **`.env`** est bien dans **`.gitignore`** (déjà une bonne pratique habituelle).

**Étapes d’amélioration**

1. Sur Vercel, utiliser des **secrets** par environnement ; pas de chaîne en clair dans les logs de build.

### 4.3 Transactions & volumétrie `PUT`

- Un `PUT` avec **très grand** nombre de clients construit une **transaction** avec de nombreuses requêtes : risque de **timeout**, limite Neon, mémoire.

**Étapes d’amélioration**

1. Plafonner `clients.length` côté validation Zod (`.max(N)`).
2. Pour gros imports : **COPY**, batching, ou job asynchrone (queue).

---

## 5. Traitement & validation des données

### 5.1 Schéma Zod actuel

- **`hubspotUrl`**: `z.string()` — pas de contrainte **URL** (`z.url()` / `z.string().url()` selon version Zod).
- **`score`**: `z.number().nullable()` — n’impose pas **1, 2, 3** uniquement ; incohérent avec les KPIs et la logique métier.
- **Longueurs** : pas de `.max()` sur textes (risque DoS mémoire / stockage JSONB énorme dans `problems`, `calls`, etc.).
- **`calls`**: pas de `.max()` sur le nombre d’éléments.

**Étapes d’amélioration**

1. Remplacer / compléter par `z.string().url()` (ou liste blanche de domaine `hubspot.com` si pertinent).
2. `score`: `z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable()` ou `z.number().int().min(1).max(3).nullable()`.
3. Ajouter des **limites** (`detailTitle.max(500)`, `problems.max(50)`, etc.) alignées métier.
4. Valider **`trend` / `scoreFilter`** cohérents avec `score` (superRefine).

### 5.2 Cohérence `score` vs `scoreFilter`

- Aucune règle transverse (ex. `score === null` ⇒ `scoreFilter === "na"`).

**Étapes d’amélioration**

1. `superRefine` sur `dashboardClientSchema` pour imposer les invariants.

### 5.3 `GET` sans DB

- Fallback **`data.json`** embarqué dans le build : les données fichier sont **publiques** dans l’artefact déployé.

**Étapes d’amélioration**

1. Ne pas inclure de données réelles sensibles dans le repo ; ou désactiver le fallback en prod (`NODE_ENV === 'production'` + exiger DB).

### 5.4 `appendDashboardClients` — unicité lot

- `batch_created_at` identique pour tout le lot : **OK** pour identifier le dernier lot avec `ORDER BY batch_created_at DESC, batch_id DESC`.

**Étapes d’amélioration**

1. Optionnel : table **`batch`** (id, created_at, source, user) pour traçabilité et métadonnées d’import.

---

## 6. Fiabilité & observabilité

1. **Tests** : ajouter tests unitaires sur `parseClientsJson`, `computeKpisFromClients`, et tests d’intégration sur la route API (mock DB).
2. **Monitoring** : métriques sur durée des requêtes Neon, taux d’erreur PUT, taille des payloads.
3. **Idempotence** : documenter si un même `PUT` peut être rejoué (nouveau `batchId` à chaque fois → pas idempotent ; peut être voulu).

---

## 7. Checklist priorisée (ordre suggéré)

1. **[Sécurité]** Protéger ou retirer **`GET /api/dashboard`** en production.
2. **[Sécurité]** Réduire les infos dans les **réponses d’erreur** (400/500).
3. **[Sécurité / Opérations]** Sortir le **DDL** du chemin applicatif ; migrations explicites.
4. **[Données]** Renforcer le **schéma Zod** (URL HubSpot, scores 1–3, tailles max).
5. **[Front]** Corriger l’**export CSV** (échappement toutes colonnes).
6. **[Front / Auth]** Ajouter **authentification** au dashboard si exposition réseau non restreinte.
7. **[API]** **Rate limit** + limite taille body sur `PUT`.
8. **[Front]** Clés React **stables** pour les appels ; virtualisation si volumétrie forte.

---

## 8. Fichiers principaux référencés

- `app/api/dashboard/route.ts` — GET/PUT, erreurs, validation.
- `lib/db/dashboard.ts` — Neon, `ensureSchema`, migration legacy, lectures/écritures.
- `lib/dashboard-update-auth.ts` — comparaison de token.
- `lib/schemas/dashboard.ts` — Zod.
- `components/sentiment/dashboard-context.tsx`, `sentiment-dashboard.tsx` — état client, export CSV.
- `app/page.tsx` — chargement serveur des clients.

---

*Document généré pour suivi d’amélioration continue ; à réviser après changements d’architecture ou de menaces.*
