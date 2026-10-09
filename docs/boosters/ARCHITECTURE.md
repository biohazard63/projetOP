# Architecture des boosters

Branche : `feature/boosters-complete`. Périmètre limité aux boosters, aux points d'attribution associés et à leurs tests.

## Chemin unique

`POST /api/booster/open`, `/api/booster/generate` et `/api/booster` délèguent tous à `src/lib/boosters/http.ts` puis `service.ts`. Les pages historiques deviennent des points d'entrée vers `BoosterExperience.tsx`. Les scripts `testBoosters.ts` et `simulateDrops.ts` utilisent aussi `generator.ts`, dans une transaction de lecture seule, sans création d'ouverture ni crédit.

1. Session NextAuth avec `user.id`, contrôle d'origine, lecture du corps limitée à 4096 octets, validation Zod stricte.
2. Seuls `setCode` et `idempotencyKey` UUID sont acceptés. Cartes, utilisateur, slots et taux envoyés par le client sont refusés.
3. Transaction Prisma PostgreSQL READ COMMITTED, verrou `pg_advisory_xact_lock(hashtextextended('booster:'+userId,0))` valable jusqu'au commit/rollback. Tous les processus utilisent le même verrou par utilisateur.
4. Rechercher le reçu unique `(userId,idempotencyKey)` **avant** tout nouveau tirage. Rejeu : résultat archivé identique, aucune attribution. Même clé pour une autre extension : 409. Une extension exacte différente ne peut pas profiter d'un alias normalisé.
5. Vérifier l'utilisateur, l'extension exacte/alias non ambigu, les règles et tous les pools. Le parcours existant est une simulation gratuite authentifiée. Aucun achat, solde, paiement ou stock n'est ajouté.
6. Un descripteur `Booster` stable par extension, ID `simulation:` + SHA256(code), prix 0. Un prix non nul sur ce descripteur bloque l'ouverture. Les anciens boosters ne sont ni supprimés ni convertis. Leurs poids ne sont pas fusionnés arbitrairement avec ceux de la simulation.
7. Générer avec `node:crypto.randomInt`, enregistrer positions, instant de crédit et snapshots (version du générateur, règles, poids BoosterCard éventuels, résultat complet), puis incrémenter `UserCard.quantity` via upsert, en ordre stable de cardId.
8. Tout est commité ensemble. Échec : aucun reçu ni crédit partiel. Conflits Prisma P2034/P2002 : au plus trois essais. La clé unique reste une seconde protection, indépendante de l'interface.

201 pour création, 200 pour rejeu. Erreurs explicites 400/401/403/404/409/422 ; erreurs internes génériques 500 sans détails de base ou secrets. Une réponse perdue doit être rejouée avec la **même clé**.

## Collection et compatibilité

Les POST `booster/add-to-collection`, `collection/add-cards`, `user/collection` acceptent uniquement `openingId`. Ils consultent un reçu appartenant à l'utilisateur et confirment le crédit déjà effectué. **Aucune mutation** et aucun tableau de cardIds accepté. Le GET collection et ses quantités restent disponibles. Les clients/scripts externes utilisant l'ancien contrat doivent migrer.

Le calcul `quantityBefore` tient compte de la collection avant ouverture et des répétitions antérieures dans le même pack. `isNew` est vrai seulement pour la première occurrence d'une carte absente ; les autres sont des doublons. Le snapshot conserve cet état historique même si la collection évolue.

## Historique privé

- GET `/api/booster/history?cursor=...` : 20 résumés, tri `openedAt desc,id desc`, curseur vérifié comme appartenant à l'utilisateur.
- GET `/api/booster/openings/[openingId]` : recherche avec id **et userId**, 404 indistinguable pour un reçu inexistant/étranger.
- Ouvertures anciennes : métadonnées lisibles, `legacy=true`, crédit et doublons inconnus. Aucune attribution rétroactive.
- Relations vers Booster et Card passées de Cascade à Restrict pour conserver les références de l'historique. Les snapshots protègent aussi contre les éditions de cartes.

## Interface et interruption

L'intention `{setCode,idempotencyKey,openingId?,revealed}` est conservée dans sessionStorage sous une clé propre à l'utilisateur. Un verrou React bloque les doubles clics. La requête serveur finit avant l'animation. Un rafraîchissement lit le reçu par GET ; une intention dont la réponse est inconnue rejoue le POST avec la même clé. Les erreurs réseau/500 ne permettent pas de changer de clé et de créer un second crédit involontaire. Une requête effectivement rejetée 400/422 peut être abandonnée pour choisir une autre extension. Timeout réseau : 25 secondes ; il ne signifie jamais « transaction annulée ».

Révélation suivante/tout révéler, rares et variantes mises en valeur, doublons, confirmation immédiate, détails et favoris, son optionnel. Images révélées seulement au fur et à mesure ; image locale de secours. Aucun canvas, confetti, préchargement de toutes les images ou mutation déclenchée par une animation.

Animation du pack 900 ms, apparition de carte 240 ms. `prefers-reduced-motion` est vérifié au retour serveur et écouté durant la session ; CSS désactive les animations locales. Si le stockage navigateur est indisponible, l'historique serveur reste la source de récupération. Le son ne doit pas faire échouer une ouverture en cas de blocage de localStorage.

## Migration et isolation

Migration additive : `20261009120000_secure_booster_openings`. Colonnes nullable pour les anciens reçus, index unique et index d'historique, contraintes restrictives. Aucun reset/DML de collection. Les 17 migrations ont été appliquées seulement à la nouvelle base `op_boosters_test` (PostgreSQL 16, port 55432). La base configurée dans .env a été inventoriée en READ ONLY et **n'est pas migrée**.

Avant utilisation sur une base existante, vérifier son historique Prisma, disposer d'une sauvegarde et examiner la migration. Une base anciennement créée via db push exige une procédure de baseline adaptée ; ne pas lancer migrate deploy aveuglément. Les contraintes Restrict peuvent volontairement bloquer des scripts de suppression du catalogue.

## Démarrer localement

Depuis `cardgame/`, renseigner dans le shell `DATABASE_URL` vers une base locale vérifiée et `AUTH_SECRET` avec un secret de session local. Pour les tests, utiliser exclusivement op_boosters_test sur 127.0.0.1:55432 ; laisser .env intact. Configurer `AUTH_URL` et `NEXTAUTH_URL` sur http://localhost:3007 pour le serveur de test, et désactiver CAPTCHA_PROVIDER uniquement dans cet environnement de test.

```sh
npm ci
npx prisma validate
npx prisma generate
# Base isolée vide ou déjà gérée par les migrations :
npx prisma migrate deploy
# Seulement op_boosters_test, cartes synthétiques :
npx tsx tests/seed-boosters.ts
npm run dev -- --port 3007
```

Puis se connecter et visiter `/booster-opening`. Pour une vérification du build : `npm run build`, puis `npm run start -- --port 3007`. Les cookies de session de production sont Secure ; le parcours authentifié de production nécessite un accès HTTPS approprié. Le smoke HTTP de production n'a vérifié que les routes publiques et le refus des routes privées. Les scénarios authentifiés complets ont été effectués sur le serveur de développement local.

Pour une base existante non migrée : suivre la préparation/baseline décrite ci-dessus plutôt que les commandes destinées à la base isolée. Aucun script automatique ne remplace cet examen.

## Fichiers modifiés et ajoutés

Liste de cette branche comparée à maintenance/one-piece-tcg-recovery ; aucune modification des modules de jeu :

- `cardgame/package.json`
- `cardgame/prisma/migrations/20261009120000_secure_booster_openings/migration.sql`
- `cardgame/prisma/schema.prisma`
- `cardgame/scripts/initBoosters.ts`
- `cardgame/scripts/simulateDrops.ts`
- `cardgame/scripts/testBoosters.ts`
- `cardgame/src/app/api/booster/add-to-collection/route.ts`
- `cardgame/src/app/api/booster/generate/route.ts`
- `cardgame/src/app/api/booster/history/route.ts`
- `cardgame/src/app/api/booster/open/route.ts`
- `cardgame/src/app/api/booster/openings/[openingId]/route.ts`
- `cardgame/src/app/api/booster/route.ts`
- `cardgame/src/app/api/booster/rules/route.ts`
- `cardgame/src/app/api/collection/add-cards/route.ts`
- `cardgame/src/app/api/sets/[code]/rules/route.ts`
- `cardgame/src/app/api/user/collection/route.ts`
- `cardgame/src/components/booster-opening/BoosterExperience.module.css`
- `cardgame/src/components/booster-opening/BoosterExperience.tsx`
- `cardgame/src/components/booster-opening/BoosterOpeningPage.tsx`
- `cardgame/src/components/booster-opening/BoosterOpeningPageOptimized.tsx`
- `cardgame/src/components/booster/BoosterPack.tsx`
- `cardgame/src/hooks/useAudio.ts`
- `cardgame/src/hooks/useBooster.ts`
- `cardgame/src/lib/boosters/generator.ts`
- `cardgame/src/lib/boosters/http.ts`
- `cardgame/src/lib/boosters/rules.ts`
- `cardgame/src/lib/boosters/service.ts`
- `cardgame/src/lib/boosters/types.ts`
- `cardgame/tests/audit-booster-data.ts`
- `cardgame/tests/boosters.browser.mjs`
- `cardgame/tests/boosters.integration.ts`
- `cardgame/tests/boosters.test.ts`
- `cardgame/tests/functional.mjs`
- `cardgame/tests/seed-boosters.ts`
- `cardgame/tests/seed-recovery.ts`
- `docs/boosters/ARCHITECTURE.md`
- `docs/boosters/AUDIT.md`
- `docs/boosters/REMAINING_ISSUES.md`
- `docs/boosters/RULES.md`
- `docs/boosters/TESTS.md`
- `docs/boosters/catalog-availability.json`
- `docs/boosters/database-inventory.json`
- `docs/boosters/evidence/browser-results.json`
- `docs/boosters/evidence/build.txt`
- `docs/boosters/evidence/desktop.png`
- `docs/boosters/evidence/install-summary.txt`
- `docs/boosters/evidence/integration-tests.txt`
- `docs/boosters/evidence/lint-summary.txt`
- `docs/boosters/evidence/mobile.png`
- `docs/boosters/evidence/prisma-validate.txt`
- `docs/boosters/evidence/production-smoke.json`
- `docs/boosters/evidence/simulation.txt`
- `docs/boosters/evidence/typecheck.txt`
- `docs/boosters/evidence/unit-tests.txt`
