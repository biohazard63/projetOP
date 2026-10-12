# 01 — Vue d’ensemble du projet

Audit de passation : 12 octobre 2026. Les faits ci-dessous viennent du dépôt local; les anciennes affirmations de jalons sont séparées de l’état courant dans `04_CURRENT_STATUS.md`.

## Vision

Mugiwara TCG sert à collectionner les cartes du One Piece Card Game, ouvrir des boosters, gérer des decks et consulter son activité. Un simulateur réglementaire est développé en parallèle. La cible est un moteur déterministe côté serveur, réutilisable par l’interface web responsive, avec une seule base de code pour les écrans existants et de futures expériences navigateur.

## Fonctionnalités applicatives observées

Les pages locales incluent accueil, boosters, détail d’extension, collection, deck builder, decks, historique, progression, profil et `/game`. Les API couvrent notamment authentification, boosters, cartes, collection, decks et jeu. Leur présence dans le code ne signifie pas que chacune a été testée pendant cette passation.

Les fonctionnalités métier existantes et les données utilisateur sont hors du périmètre de la reprise moteur, sauf demande explicite. Les decks sauvegardés et les collections sont gérés par l’application/Prisma et ne doivent pas être recréés par le moteur de laboratoire.

## Organisation

- `cardgame/src/app/` : pages Next.js App Router et routes API.
- `cardgame/src/components/` : interfaces partagées, notamment boosters et cartes.
- `cardgame/src/lib/` : services applicatifs et intégration Prisma/auth.
- `cardgame/prisma/` : schéma et migrations.
- `cardgame/carteJson/`, `cardgame/data/onepiece/` : catalogues et artefacts de données.
- `cardgame/src/game/` : moteur TypeScript sans dépendance React/Prisma.
- `cardgame/tests/` : tests Node intégrant `tsx`.
- `docs/game/` : spécifications, rapports de jalons, matrices, traces.
- `docs/handoff/` : présente passation pour Claude Code.

## Dépendances conceptuelles

Le moteur utilise ses propres `CardDefinition`, `CardPrinting`, `Ruleset` et `CardInstance`. Il n’importe pas directement les lignes Prisma de collection ou les decks persistés. `catalogAdapter.ts` et `adapter.ts` font le lien depuis des structures de catalogue; leur adéquation à une future intégration de parties réelles doit être revue avant branchement.

## Objectifs de jouabilité

Une carte présente dans le catalogue n’est pas automatiquement autorisée par un ruleset, traduite officiellement, comprise par la DSL ou certifiée jouable. Pour déclarer une carte jouable, texte, conditions, coûts, restrictions, fenêtres et interactions nécessaires doivent être vérifiés et couverts. Les cartes non prises en charge ne doivent pas être considérées comme sans effet.

## Limites actuelles

M3 demeure PARTIAL. Le moteur a des parcours d’ouverture de partie, tour et combat partiellement implémentés et un sous-ensemble de capacités. Il n’existe pas de preuve actuelle de deux decks compétitifs complètement légaux jouant une partie intégrale en ignorant zéro capacité. La page `/game` existante repose sur d’anciens services et n’est pas branchée au noyau pur.
