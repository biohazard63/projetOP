# 04 — État courant (source opérationnelle)

> **Mise à jour M5 — 12 octobre 2026.** `/play` est une expérience de jeu complète : plateau redessiné, animations pilotées par les événements, gestes tactiles, bots Facile/Normal/Difficile, tutoriel, statistiques. Voir `docs/game/M5_REPORT.md`. Branche `feature/tcg-m5`, rien n'est commité.
> - `npm test` : 346/346. Typecheck PASS. Lint : 0 erreur (99 avertissements antérieurs). Build isolé PASS. Intégration PostgreSQL isolée : 4/4. Navigateur (Chrome headless, émulation téléphone/tablette/desktop) : **11/11** ; ni Safari ni appareil physique.
> - 331 définitions reconnues, 116 révisions certifiées (23 M4 + 93 M5). Tournoi : 240 parties, 0 repli.
> - Correctif moteur CR §1-2-3 : l'abandon pendant un choix de capacité suspendu est accepté (`effects/runtime.ts`, `pendingVersion`).
> - Migration additive `20261012180000_engine_bot_level` testée sur base temporaire uniquement, **non appliquée** ailleurs.
> - Nouvelles parties : format permanent `MUGIWARA_FREE` (aucune liste officielle, aucune fenêtre ; règles CR §5-1-2 et cartes implémentées seulement). Il n'y a jamais eu d'expiration calendaire : l'ancienne alerte « decks refusés dès le 13/10 » était erronée.

> **Mise à jour M4 — 12 octobre 2026.** Une première partie jouable contre un bot existe sur `/play` (mobile d'abord), servie par le moteur pur côté serveur. Voir `docs/game/M4_REPORT.md`.
> - `npm test` : 332/332. Typecheck PASS. Lint : 0 erreur (99 avertissements). Build isolé PASS.
> - Intégration PostgreSQL isolée : 3/3. Test navigateur mobile (Chrome headless, tactile, 390 × 844) : **10/10** ; parties complètes terminées en défaite humaine, abandon vérifié, aucune victoire humaine observée dans le navigateur (`docs/game/evidence/m4/browser/`).
> - Migration additive `20261012120000_engine_games` testée sur une base temporaire uniquement, **non appliquée** en développement ni en production.
> - 23 révisions certifiées (`src/game/cards/certification.ts`) ; P-015 bloquée pour conflit de données.
> - Le travail M4 n'est pas commité. L'état M3 ci-dessous reste exact pour le moteur.

Dernière vérification locale : **12 octobre 2026, clôture M3**. Branche `maintenance/catalog-rebuild`, rien n'est commité. Verdict moteur : **M3 COMPLETE** (voir `docs/game/M3_REPORT.md`). Aucune carte `PLAYABLE_VERIFIED` n'a été ajoutée.

## Vérifications actuelles

| Vérification | Résultat réellement observé | Journal |
|---|---|---|
| `npm test` | **PASS 314/314**, 0 todo, 0 skip | `docs/game/evidence/m3/m3-final-tests.log` |
| `npm run typecheck` | **PASS** | `m3-final-typecheck.log` |
| `npm run lint` | **0 erreur**, 99 avertissements (déjà présents avant M3) | `m3-final-lint.log` |
| Build de production isolé | **PASS** (`npm ci` puis `npm run build` dans une copie sans `.env`, `.next`, `node_modules`) | `m3-isolated-build.log` |
| Partie complète | **PASS** : graine 52, violet ST04-001 contre rouge ST01-001, victoire d'alice au tour 17, 327 commandes, 13 reprises JSON, 0 fuite ; rejeu du journal identique | `full-game-trace.json` |
| Preuves historiques | `npm test` réécrit 17 JSON dans `evidence/{m2,m2_5,universal-ability}` ; leur contenu a été vérifié identique par hachage à chaque exécution | — |

## Implémentation observée

- Ruleset runtime : `1.2.1` (CR 1.2.1 du 28/08/2026, vérifiées sur Bandai). DSL registre `1.3.0`. Rulesets : `m0-reviewed-subset-2026-10-10` et `m3-reviewed-subset-2026-10-12` (non compétitif, restrictions relues le 12/10/2026).
- **Paiement des Counter déclaratifs.** Le coût imprimé est tracé `PAID` ou `INTERRUPTED` dans `effects.payments` (`resolutionId = battleId`), sans rollback. Une interdiction `MOVE_DON` refuse le DON!! −1.
- **Révision M3.** OP06-017 et ST04-016 ont une révision `m3-2026-10-12` distincte (`DATA_VALID_EFFECT_PENDING`). Les définitions `official-2026-10-11` restent inchangées.
- **Nouvelles briques du DSL :**
  - coût `DON_MINUS` (`ACTIVATE_MAIN`, sélection explicite `START_EFFECT.donMinusIds`) ;
  - sélecteur `OPPONENT_TOP_LIFE` ;
  - primitive `trashLife` (événements `LIFE_TRASHED` et `CARD_TRASHED`).
- **Deck violet de référence.** `cards/m3PurpleDeck.ts` (Leader ST04-001 Kaido + 50 cartes violettes vérifiées). Deck rouge interséries défini dans `scripts/game/m3-full-game.ts`.
- **ST01-001 et ST01-007 exécutables.** `cards/m0Programs.ts` fournit leur programme, inclus dans le registre officiel. Avec un registre 1.3.0, `createGame` refuse désormais un profil `giveRestedDon` sans programme exécutable.
- **Confidentialité.** Une option de choix qui désigne une carte de Life, ou une carte de la main ou du deck adverses, n'expose plus que son jeton.

## Couverture et certification

- M3-1 à M3-5 sont terminés et testés : 49 tests dans sept fichiers `cardgame/tests/game-m3*.test.ts`.
- Aucune nouvelle carte certifiée. Le statut historique `PLAYABLE_VERIFIED` des cartes OP06 du laboratoire « universal-ability » ne couvre pas leurs révisions M3.
- Les decks de M3 respectent la construction CR §5-1-2 et la liste des restrictions. Ce n'est pas une certification du format Standard.

## Limites connues

Voir `M3_REPORT.md`, section « Limites restantes » :
- voie Counter legacy non alignée (choix délibéré) ;
- parties sans registre d'effets (M0/M1) où `giveRestedDon` reste sans exécuteur ;
- invariant de face visible exemptant seulement les DON!! ;
- question FAQ ST04-016 illisible (seule la réponse est confirmée) ;
- ruleset M3 à revérifier après le 12/10/2026.

## État Git

Le dépôt reste sale. Tout `cardgame/src/game/`, les tests `game-*`, `scripts/game/` et `docs/game/` sont non suivis ; `cardgame/package.json` est modifié. Aucun commit, push, déploiement ni opération Prisma n'a été effectué. Voir `08_GIT_AND_WORKSPACE.md`.
