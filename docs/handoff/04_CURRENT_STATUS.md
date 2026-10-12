# 04 — État courant (source opérationnelle)

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
