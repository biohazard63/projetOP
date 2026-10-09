# Corrections réalisées

1. Branche de maintenance isolée ; modifications locales conservées.
2. Dépendances compatibles actualisées, Next/React sécurisés, Prisma 6 conservé ; verrou reproductible, postinstall Prisma, scripts typecheck/test/test:functional.
3. Configuration Next consolidée, lint ESLint direct, types de phases et composants corrigés ; aucun bypass des contrôles.
4. Autorisation des decks et du deck actif ; validation partagée contre les cartes réelles ; quantités entières et limites de charge.
5. Captcha fermé si configuré et invalide, contrôle Google email_verified strict, rattachement automatique désactivé, OAuth accessToken retiré de la réponse session, erreurs de login uniformisées, debug Auth désactivé.
6. Validation d'inscription par types et tailles, email trim/lowercase, limite bcrypt en octets, provisioning différé via Next after plutôt que setTimeout.
7. Collection : 401 sans session, pas de logs de session ni d'erreur interne dans la réponse, quantités restituées, cartes à quantité positive. Provisioning starter ne remplace plus une quantité existante.
8. PWA : remplacement du plugin obsolète par un worker de purge sans cache privé ; API no-store.
9. Jeu : route start reliée à initialize, UUID de partie, dernières versions ordonnées, quantités de deck développées en instances uniques ; persistance de toutes les propriétés sérialisables et des flags ; propriété vérifiée lors de l'upsert ; block authentifié et basé sur la base. Effets indisponibles retournent 501. Personnages actifs, Rush requis pour attaquer immédiatement, capacité du terrain et tour contrôlés.
10. Tailwind charge sa configuration existante, viewport Next déplacé dans l'export approprié et zoom mobile autorisé.
11. Migrations sorties du gitignore, 13 scripts cassés retirés, guide Mac et preuves ajoutés.

Tests ajoutés : validation de decks (dont données falsifiées et arts alternatifs), sécurité captcha/mot de passe/rate-limit, jeu et scenarios HTTP/Chrome. Aucun import destructif, reset, restore, push ou déploiement.

## Fichiers de maintenance

- `cardgame/.gitignore`
- `cardgame/README.md`
- `cardgame/next.config.js`
- `cardgame/next.config.mjs`
- `cardgame/package-lock.json`
- `cardgame/package.json`
- `cardgame/public/sw.js`
- `cardgame/src/app/api/auth/register/route.ts`
- `cardgame/src/app/api/booster/add-to-collection/route.ts`
- `cardgame/src/app/api/booster/open/route.ts`
- `cardgame/src/app/api/collection/add-cards/route.ts`
- `cardgame/src/app/api/collection/route.ts`
- `cardgame/src/app/api/decks/[deckId]/route.ts`
- `cardgame/src/app/api/decks/active/route.ts`
- `cardgame/src/app/api/decks/route.ts`
- `cardgame/src/app/api/game/attack/route.ts`
- `cardgame/src/app/api/game/block/route.ts`
- `cardgame/src/app/api/game/execute-effect/route.ts`
- `cardgame/src/app/api/game/initialize/route.ts`
- `cardgame/src/app/api/game/start/route.ts`
- `cardgame/src/app/api/user/collection/route.ts`
- `cardgame/src/app/booster-opening/layout.tsx`
- `cardgame/src/app/collection/layout.tsx`
- `cardgame/src/app/collection/page.tsx`
- `cardgame/src/app/deck-builder/layout.tsx`
- `cardgame/src/app/decks/layout.tsx`
- `cardgame/src/app/globals.css`
- `cardgame/src/app/layout.tsx`
- `cardgame/src/components/GameBoard.tsx`
- `cardgame/src/components/PWAInstallPrompt.tsx`
- `cardgame/src/components/game/CardEffectsPanel.tsx`
- `cardgame/src/components/game/GameBoard.tsx`
- `cardgame/src/components/game/GameSetup.tsx`
- `cardgame/src/components/game/StrategyAnalyzer.tsx`
- `cardgame/src/lib/auth.config.ts`
- `cardgame/src/lib/captcha.ts`
- `cardgame/src/lib/game/cardEffectsService.ts`
- `cardgame/src/lib/game/cardStateService.ts`
- `cardgame/src/lib/game/gamePersistenceService.ts`
- `cardgame/src/lib/game/gameSimulationService.ts`
- `cardgame/src/lib/game/manualGameService.ts`
- `cardgame/src/lib/game/strategyService.ts`
- `cardgame/src/lib/game/testDonService.ts`
- `cardgame/src/lib/security.ts`
- `cardgame/src/lib/starterDeckUtils.ts`
- `cardgame/src/types/game.ts`
- `cardgame/.env.example`
- `cardgame/prisma/migrations/20250413132207_add_set_to_cards/migration.sql`
- `cardgame/prisma/migrations/20250413133815_add_code_field/migration.sql`
- `cardgame/prisma/migrations/20250413153757_add_deck_card_model/migration.sql`
- `cardgame/prisma/migrations/20250413205413_add_user_points/migration.sql`
- `cardgame/prisma/migrations/20250427094104_add_game_state/migration.sql`
- `cardgame/prisma/migrations/20250427105028_update_schema/migration.sql`
- `cardgame/prisma/migrations/20250427112811_make_deck_userid_nullable/migration.sql`
- `cardgame/prisma/migrations/20250428113705_add_card_special_fields/migration.sql`
- `cardgame/prisma/migrations/20250428170807_add_booster_opening_cards/migration.sql`
- `cardgame/prisma/migrations/20250429091219_add_booster_rules/migration.sql`
- `cardgame/prisma/migrations/20250429102215_add_set_rules/migration.sql`
- `cardgame/prisma/migrations/20250503104438_add_oauth_support/migration.sql`
- `cardgame/prisma/migrations/20250505090703_add_game_logs_relation/migration.sql`
- `cardgame/prisma/migrations/20250904163118_add_game_state_fields/migration.sql`
- `cardgame/prisma/migrations/20250905073432_add_don_field/migration.sql`
- `cardgame/prisma/migrations/20250905081215_fix_used_don_deck_type/migration.sql`
- `cardgame/prisma/migrations/migration_lock.toml`
- `cardgame/src/app/game/layout.tsx`
- `cardgame/src/lib/cardColors.ts`
- `cardgame/src/lib/deckValidation.ts`
- `cardgame/tests/functional.mjs`
- `cardgame/tests/recovery.test.ts`
- `cardgame/tests/seed-recovery.ts`
- `docs/maintenance/AUDIT.md`
- `docs/maintenance/DEPENDENCIES.md`
- `docs/maintenance/FIXES.md`
- `docs/maintenance/FUNCTIONAL_TESTS.md`
- `docs/maintenance/RECOVERY_GUIDE.md`
- `docs/maintenance/REMAINING_ISSUES.md`
- `docs/maintenance/evidence/SOURCE_INVENTORY.md`
- `docs/maintenance/evidence/build.log`
- `docs/maintenance/evidence/functional-results.json`
- `docs/maintenance/evidence/lint.log`
- `docs/maintenance/evidence/migration-drift.sql`
- `docs/maintenance/evidence/migrations.log`
- `docs/maintenance/evidence/mobile.png`
- `docs/maintenance/evidence/npm-audit-final.json`
- `docs/maintenance/evidence/npm-audit-initial.json`
- `docs/maintenance/evidence/npm-outdated-initial.json`
- `docs/maintenance/evidence/prisma-generate.log`
- `docs/maintenance/evidence/prisma-validate.log`
- `docs/maintenance/evidence/typecheck.log`
- `docs/maintenance/evidence/unit-tests.log`

Les trois fichiers du plateau préexistants sont conservés dans un commit local séparé (9a31dcf) ; les corrections propres à la maintenance suivent.

## Commits locaux

b14c932 test: cover recovery validation API and browser scenarios
1592663 fix: secure auth deck ownership private collection and PWA cache
8eb34e8 fix: restore solo game initialization types and persistence
d014a34 build: restore compatible dependencies and reproducible Prisma setup
9a31dcf chore: preserve existing local game board changes before recovery
