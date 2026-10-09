# Audit de récupération — 9 octobre 2026

Branche : `maintenance/one-piece-tcg-recovery`, créée depuis la branche locale `game`, et non depuis `main`, pour conserver le contexte de travail. Aucun push, déploiement ou changement de base existante.

Environnement constaté : macOS 26.5.2, Apple Silicon, Node 22.22.2, npm 10.9.7, Git 2.45.2. Docker installé puis démarré avec autorisation. Les changements préexistants concernent GameBoard, PlayerField et le nouveau OpponentField ; `.DS_Store` reste hors commits. Aucun AGENTS.md trouvé.

La configuration DATABASE_URL vise un PostgreSQL local ; son rôle métier et ses données ne sont pas établis. Elle n'a reçu aucune écriture de maintenance. Variables présentes contrôlées sans valeurs : DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, TCG_API_KEY, GOOGLE_CLIENT_ID/SECRET, GITHUB_ID/SECRET, EMAIL_SERVER_HOST/PORT/USER/PASSWORD/FROM. Présence ne signifie pas validité. EMAIL_SERVER utilisé par le code n'est pas configuré ; les liens magiques ne sont donc pas actifs dans la configuration observée.

## Diagnostic par couche

- Next.js : configurations .js/.mjs concurrentes, ancien `next lint`, génération Prisma absente du cycle reproductible. La police Inter nécessite un téléchargement au premier build. Configuration consolidée ; build réussi.
- TypeScript : schéma strict conservé. La première exécution sans client Prisma généré produit 96 lignes d'erreurs ; après génération restent des incohérences de phases, types et propriétés du plateau. Corrigées sans ignorer TypeScript.
- ESLint : 15 erreurs initiales dans src, plus de nombreux avertissements. Erreurs corrigées ; les avertissements sur imports inutilisés et dépendances de hooks restent documentés dans les preuves. Ils n'ont pas été désactivés.
- Tailwind 4 : configuration TypeScript historique non chargée par globals.css. Ajout de @config pour appliquer les couleurs, plugins et animations existants ; PostCSS utilise le plugin v4.
- Auth : JWT avec adaptateur Prisma. Captcha contournable par jeton absent ; rattachement Google dangereux ; jeton OAuth exposé dans la session navigateur ; validation d'inscription insuffisante et normalisation email incohérente. Corrections et tests de credentials. OAuth réel et SMTP non validés.
- API : failles de propriété GET/PUT/DELETE des decks, cookie de deck actif insuffisamment contrôlé, confiance accordée aux types de cartes fournis par le client, route block non authentifiée, réponses privées mises en cache par PWA. Corrigés. La validation générale de tous les corps JSON reste perfectible.
- Cartes/sets : plusieurs scripts et formats de données coexistent ; imports pouvant modifier le catalogue global. Pas de synchronisation réelle ou traduction payante déclenchée. Endpoints publics testés sur 14 cartes fictives. Le cache catalogue en mémoire de 24 h peut servir des données anciennes après import.
- Collection : ajout transactionnel existant, quantités perdues dans certains endpoints, logs de session et erreur interne retournée au client. Corrigés. Aucun parcours de retrait de cartes identifié dans l'interface ; aucune nouvelle fonctionnalité de retrait ajoutée.
- Deck builder : CRUD testé ; validation serveur basée sur les cartes persistées, leader unique, 50 cartes, couleurs et maximum 4 par code incluant variantes. Pas de contrôle complet de banlist, restrictions spécifiques ni disponibilité en collection.
- Boosters : trois générateurs différents, règles de slots codées en dur, fallback et God Pack. Ouverture et ajout testés, set vide rejeté. Les taux ne sont pas une preuve de probabilités commerciales officielles ; règles SetRules/dropRate non systématiquement utilisées. L'ajout peut être rejoué avec des identifiants arbitraires valides : aucun inventaire payant sécurisé ne peut être affirmé.
- Jeu : simulateur solo. Aucun serveur Socket.IO ni import effectif du client n'est présent. /game/start était vide. Partie globale manual_game et quantités ignorées corrigées. Persistance restaurait isFirstTurn=false et perdait des propriétés : corrigé. Limite du terrain et mal d'invocation renforcés. L'état client du plateau et l'état serveur restent partiellement divergents. Les effets contiennent des fonctions incompatibles avec JSON : endpoint explicitement 501.
- PWA : next-pwa/Workbox anciens avec dépendances vulnérables ; ancien worker cache les API privées et pages. Retrait du plugin, worker de récupération qui purge les caches sans stocker de données privées, conservation du manifest et de l'installation. Aucun mode hors ligne annoncé comme validé.
- Vercel : config racine utilise .next et vercel-build alors que package.json est dans cardgame. Le Root Directory doit être cardgame dans un éventuel projet Vercel ; configuration distante non inspectée. Aucun déploiement effectué.
- Prisma : relations et contraintes composites UserCard/FavoriteCard/DeckCard/BoosterCard présentes. Card.code non unique (variantes), champs de phases/couleurs libres et quantités non contraintes au niveau SQL ; plusieurs FK sans index dédié. Migrations locales ignorées par Git initialement. Les 16 migrations s'appliquent sur une base neuve et ne produisent aucun drift : exclusion Git retirée, historique conservé.
- Scripts : 13 alias npm/seed pointaient vers des fichiers absents ; retirés. import:sets:reset, deleteAllCards et rebuildStarterDecks suppriment des données : inspectés sans exécution. Aucun backup/restore fonctionnel disponible aux anciens chemins.

L'inventaire des sources et scripts est joint. Les preuves de fonctionnement sont limitées aux scénarios exécutés ; le README ne constitue pas une validation.

## Tableau final

| Module | État initial | Corrections | État final | Preuves |
|---|---|---|---|---|
| Installation | génération manuelle, alias cassés | verrou, postinstall, scripts | PASS | npm ci final, Prisma generate |
| Compilation | types/lint/config et accès police bloquants | types et config consolidés | PASS | typecheck.log, lint.log, build.log |
| Sécurité | 56 alertes dont 5 critiques, IDOR/captcha/cache | correctifs auth/API/PWA et deps | FAIL : 12 alertes élevées restent | npm-audit-final.json, tests |
| Authentification | validation/captcha/session perfectibles | normalisation, contrôles, redirections | PASS credentials ; externes BLOCKED | functional-results.json |
| Collection | quantités/logs/filtres incohérents | quantités, sécurité, couleurs normalisées | PASS ajout/recherche/filtres ; retrait BLOCKED | tests API/Chrome |
| Cartes et sets | scripts nombreux, cache long | dépendances/install réparés, test fixture | PASS lecture fixture ; sync NOT_TESTED | tests publics |
| Deck builder | IDOR, types client fiables à tort | propriété, validation persistée | PASS CRUD/règles de base | unit-tests.log, functional-results.json |
| Boosters | plusieurs générateurs, replay possible | set vide/entrées invalides rejetés | PASS simulation/ajout ; intégrité FAIL | functional-results.json, revue |
| Jeu en ligne | serveur absent, solo défectueux | UUID, quantités, persistance/règles solo | BLOCKED multijoueur ; PASS solo limité | tests, absence serveur |
| API | permissions/route vide/état client | ownership/auth/block/start/501 | PASS scénarios couverts ; exhaustivité NOT_TESTED | functional-results.json |
| Base de données | migrations ignorées | historique conservé et contrôlé | PASS schéma neuf ; ancienne base NOT_TESTED | migrations.log, migration-drift.sql |
| Interface | config Tailwind/viewport, filtres | configuration/zoom/couleurs | PASS desktop/mobile fixture | Chrome, mobile.png |
