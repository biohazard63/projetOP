# Administration

L’accueil `/admin` présente les joueurs, ouvertures, parties, signalements à traiter, l’activité des 14 derniers jours (jours de Paris), les derniers comptes et ouvertures, les données manquantes du catalogue et les repères économiques. Bouton Actualiser pour recharger les chiffres.

Sections : joueurs et fiches (Berrys, collection, decks, progression), cartes, extensions et règles explicites de boosters, économie, historiques d’ouvertures, parties et journal des actions. Les compositions intégrées restent en lecture seule. Une correction de catalogue ne certifie aucune carte du moteur.

L’accès utilise la session et l’allowlist `REPORT_ADMIN_EMAILS`. Chaque nouvelle modification exige un motif, un aperçu avant/après et une confirmation. Le serveur vérifie les droits, les bornes, la concurrence et l’idempotence ; écritures et journal sont atomiques. Les états autoritaires de parties ne sont jamais retournés au client.

## Activation locale

La migration `cardgame/prisma/migrations/20261018180000_admin_workspace/migration.sql` crée `AdminSetting` et `AdminAuditLog`. Elle a été **appliquée le 18 octobre 2026 sur autorisation explicite**, uniquement sur `localhost:5432/cardgame`, après sauvegarde PostgreSQL vérifiée. Pour une autre base : obtenir l’autorisation explicite, vérifier que la connexion vise `localhost:5432/cardgame`, sauvegarder la base, appliquer uniquement cette migration et régénérer Prisma/redémarrer le serveur local. Ne pas utiliser Neon ni lancer une commande appliquant toutes les migrations en attente sans les vérifier.

Avant activation, la consultation fonctionne et l’économie conserve les paramètres existants ; les nouvelles opérations d’écriture ne peuvent pas aboutir sans leur journal. Les signalements utilisent leur migration distincte déjà appliquée localement.

## Vérifications

Tests unitaires ciblés : `tests/admin-contracts.test.ts`, `tests/admin-workspace.test.ts`, `tests/reports*.test.ts`, suites économie/boosters pertinentes. `npm run typecheck` et ESLint ciblé. `node tests/admin-reports.browser.mjs` utilise un serveur isolé, une session synthétique, des API simulées et une base volontairement inaccessible : vue d’ensemble desktop/mobile, compteurs, graphique, recherche, traitement des signalements et refus non-admin. Il ne valide pas des écritures réelles en base.

Contrôle après activation locale : migration enregistrée, tables accessibles, `adminOverview()` réussi avec `writesReady: true` et 14 jours d’activité. Aucun solde, carte ni réglage économique modifié pour ces vérifications.
