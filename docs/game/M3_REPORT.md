# M3 — Rapport de clôture

Date : 12 octobre 2026. Branche `maintenance/catalog-rebuild`, workspace non commité. Verdict : **COMPLETE** pour le périmètre M3-1 à M3-5 décrit dans `M3_ROADMAP.md` et dans la mission du 12 octobre 2026. Aucune carte n'a reçu `PLAYABLE_VERIFIED` : la clôture de M3 porte sur le moteur, les profils, le deck de référence et la partie complète, pas sur une certification de cartes.

## Résultats vérifiés

| Contrôle | Résultat | Preuve |
|---|---|---|
| `npm test` | **314/314 PASS**, 0 todo, 0 skip | `evidence/m3/m3-final-tests.log` |
| `npm run typecheck` | **PASS**, 0 erreur | `evidence/m3/m3-final-typecheck.log` |
| `npm run lint` | **0 erreur**, 99 avertissements (inchangés) | `evidence/m3/m3-final-lint.log` |
| Build de production isolé (copie sans `.env`, `.next`, `node_modules` ; `npm ci` puis `npm run build`) | **PASS** | `evidence/m3/m3-isolated-build.log` |
| Partie complète de référence (graine 52) | Victoire d'alice (ST04-001) au tour 17, `LEADER_DAMAGED_AT_ZERO_LIFE`, 327 commandes, 13 reprises JSON, 0 fuite | `evidence/m3/full-game-trace.json` (deux générations identiques, SHA-1 `08131cca…`) |
| Preuves historiques réécrites par `npm test` | Contenu identique avant/après (hachage de `docs/game/evidence/`) | — |

## Sources réglementaires

Sauf mention contraire, vérifiées directement sur en.onepiece-cardgame.com le 12 octobre 2026. Extraits conservés dans `evidence/m3/bandai-sources-2026-10-12.json`.

- Comprehensive Rules **1.2.1** (dernière mise à jour : 28/08/2026) :
  - §1-2 et §9-1/§9-2 : défaite (0 Life et Leader touché, deck vide), appliquée immédiatement au traitement des règles ;
  - §3-10-2 : une carte qui quitte la Life est celle du dessus ;
  - §4-8 : « up to X » signifie de 0 à X ;
  - §4-10-2 : une clause après « Then » se résout même si la précédente n'a pas pu l'être ;
  - §5-1-2 : construction de deck ;
  - §6-5-6-1 : aucune bataille au premier tour d'un joueur ;
  - §10-2-10-1 : DON!! −X choisit X DON!! dans les zones Leader, Personnages et coût.
- FAQ ST-01/ST-04 :
  - ST03-017 : l'Event défaussé ne compte pas dans la main ;
  - ST04-001 : sans Life adverse, l'effet est activable mais rien ne se passe ;
  - ST04-016 : seule la réponse est lisible (« You can activate the card, but nothing will happen »), le texte de la question n'a pas pu être extrait.
- Errata du 26/09/2022 :
  - ST03-017 et ST04-016 : « Up to 1 » ;
  - ST04-001 : « Trash up to 1 of your opponent's cards from the top of their Life cards » (révision de règle du 30/09/2022).
- Liste des cartes interdites et restreintes relue : aucune carte des decks M3 n'y figure ; les numéros listés correspondent aux restrictions du ruleset M0.
- FAQ OP-01, OP-02 et OP-04 : aucune entrée individuelle ni erratum pour les cartes sans effet du deck violet.

## M3-1 — Counter déclaratifs : terminé

- **Traçabilité des paiements.** Le coût imprimé d'un Counter déclaratif est désormais enregistré `PAID` ou `INTERRUPTED` dans `effects.payments`, avec `resolutionId = battleId` et les opérations confirmées.
  - La sémantique est inchangée : arrêt au premier DON refusé, aucun rollback, carte gardée en main, aucun effet, aucun événement public.
  - La voie Counter legacy n'est pas modifiée.
- **Révision M3 distincte.** OP06-017 et ST04-016 ont désormais `m3-2026-10-12` (`definitionId` `…@m3-2026-10-12`) avec le statut `DATA_VALID_EFFECT_PENDING`.
  - Les programmes clonés du registre officiel sont repointés vers ces révisions.
  - Les définitions `official-2026-10-11` et leur statut historique restent intacts.
- **Tests.** OP06-017 avec et sans Life, ST01-014 (Counter et vrai Trigger de Life), ST03-017 (condition vraie, fausse et 0 cible) et ST04-016 (DON!! −1 accepté, refusé et invalide), plus :
  - réponses répétées, reprise JSON, projections ;
  - atomicité (8 tests) ;
  - identifiants et révisions.
- **DON!! −1 sous interdiction.** Sur la voie déclarative, une interdiction `MOVE_DON` refuse le DON!! −1 avant tout paiement (`COUNTER_EVENT_DON_MINUS_UNAVAILABLE`), de façon cohérente avec le coût `DON_MINUS`.

## M3-2 — Recherches : terminé, aucun défaut moteur

Tests avec OP01-016 Nami et OP06-013, joués via `PLAY_CARD` dans un deck rouge légal :
- zéro candidat ;
- exclusion de toute carte nommée Nami (ST01-007 comprise) ;
- choix de 0 carte et refus d'un choix au-delà du maximum ;
- deux recherches successives ;
- deck plus court que 5 cartes ;
- dernière carte prise, donc défaite `EMPTY_DECK` immédiate ;
- ordre du reste sous le deck ;
- confidentialité ;
- reprise JSON aux deux étapes et rejeu idempotent ;
- aucune consommation du PRNG par une recherche « bottom in any order » ;
- mélange imposé par la règle (mulligan) déterministe.

## M3-3 — Deck violet légal : terminé

- **Données.** `cards/m3PurpleDeck.ts` : 14 cartes relues sur Bandai.
  - Leader ST04-001 Kaido (Life 5, vérifiée).
  - 11 Personnages sans effet : ST04-007, ST04-009, ST04-012, ST04-013, OP01-092, OP01-103, OP01-107, OP01-110, OP02-077, OP02-080, OP04-062.
  - ST04-011 Black Maria ([Blocker]) et ST04-016 (profil M3).
- **Deck.** 1 Leader + 50 cartes violettes, au plus 4 exemplaires (OP01-092 ×2). Validé en mode `playable` par `rulesets/m3.ts` (`m3-reviewed-subset-2026-10-12`, non compétitif).
- **Capacité de Kaido rendue exécutable.** Trois ajouts au moteur :
  - un coût `DON_MINUS`, réservé à `ACTIVATE_MAIN` en 1.3.0, avec sélection explicite des DON!! via `START_EFFECT.donMinusIds` ;
  - un sélecteur `OPPONENT_TOP_LIFE` ;
  - une primitive `trashLife` qui émet `LIFE_TRASHED` et `CARD_TRASHED` (ce n'est pas un dégât, et aucun Trigger ne s'ouvre).
- **Tests.**
  - adaptation et validation du deck, variantes refusées ;
  - partie démarrée par commandes publiques ;
  - Blast Breath tiré naturellement et joué dans ce deck légal (rendre le DON!! qui a payé : CR §10-2-10-1) ;
  - Kaido : paiement, choix 0 ou 1, [Once Per Turn], DON!! donnés inclus, refus en dessous de 7 DON!! et sous `MOVE_DON`.

## M3-4 — Interséries : terminé

Partie violet (ST-04, OP-01, OP-02, OP-04) contre rouge (ST-01, OP-01, OP-06, P). À chaque commande : reprise JSON vérifiée et projections contrôlées.
- **Shuraiya + Guard Point.** OP06-009 bloque Kaido, copie On Block la puissance du Leader adverse (7000), puis Guard Point le sauve.
- **Trigger différé.** Le Trigger d'OP06-013 lance une recherche privée qui suspend les dégâts de Life jusqu'à son résolution.
- **Défausse de Life.** Kaido défausse une Life porteuse de [Trigger] sans ouvrir de fenêtre de Trigger.
- **Restriction.** `MOVE_DON` rend Blast Breath sans effet sans bloquer son activation.
- **ST01-001 exécutable.** La capacité du Leader rouge est exécutable, et un registre 1.3.0 sans son programme est refusé.

## M3-5 — Partie complète : terminé

- **Pilote.** `scripts/game/m3-full-game.ts` est une politique déterministe qui ne lit que sa propre projection et les données publiques de bataille. Il n'émet que des commandes moteur et ne modifie jamais l'état.
- **Mécaniques couvertes par la partie de référence :**
  - choix du premier joueur, mulligan avec remélange, phases, pioche, DON!!, jeu de cartes, don de DON!! ;
  - ST01-001 et ST01-007, recherches OP01-016 et OP06-013, OP06-018 en Main, Kaido ;
  - attaques, blocage, Counters Personnage, ST04-016, ST01-014 et OP06-017 avec paiement de Life ;
  - Triggers, K.O., dégâts de Life, défausse de Life, victoire.
- **Tests (`game-m3-5`).**
  - decks légaux ;
  - victoire réglementaire ;
  - couverture des 34 mécaniques ;
  - 0 fuite ;
  - rejeu intégral du journal de commandes donnant un état identique ;
  - idempotence de chaque commande ;
  - 6 autres graines terminées sans fuite.
- **Robustesse.** Un balayage hors suite de 160 graines a donné 160 parties terminées, 0 erreur et 0 fuite.

## Défauts réels corrigés pendant M3

1. **Capacités ST01-001 et ST01-007 silencieusement ignorées.** Dans toute partie 1.3.0, elles n'étaient proposées nulle part, y compris dans les tests historiques « universal engine ».
   - Ajout de `cards/m0Programs.ts`, inclus dans le registre officiel et donc dans M3.
   - `createGame` refuse désormais un profil `giveRestedDon` sans programme exécutable avec un registre 1.3.0.
   - Un registre de test M2.5 a reçu ces programmes.
2. **`PRIVATE_INSTANCE_IN_PUBLIC_EVENT`** rejetait un état légal : un DON!! donné puis rendu par DON!! −X. Les DON!!, interchangeables et rangés dans une zone ouverte, sont désormais exemptés.
3. **`battle.pendingLifeTrigger = undefined`** rendait un état restauré depuis JSON différent de l'original. La clé est maintenant supprimée.
4. **Fuite potentielle d'identifiant.** Les options de choix portant sur une carte de Life (pour tous les joueurs), ou sur la main ou le deck adverses, n'exposent plus que leur jeton, dans les actions légales comme dans les projections.
5. **`tests/game-m3-atomicity.test.ts`** était défectueux (P0). Il a été réécrit ; l'original est archivé dans `evidence/m3/archive/`.

## Limites restantes, non bloquantes pour M3

- **Certification.** Aucune carte n'est `PLAYABLE_VERIFIED`. Le deck et la partie prouvent l'exécution, mais pas la certification FAQ exhaustive de chaque interaction.
- **Ruleset.** `m3-reviewed-subset-2026-10-12` est un sous-ensemble revu, non compétitif : ce n'est pas une certification du format Standard. Sa fenêtre de restrictions expire après le 12/10/2026 et doit être revérifiée.
- **Voie Counter legacy** (`DON_MINUS_POWER` / `OPTIONAL_LIFE_POWER`) : pas de trace `payments`, et pas de contrôle `MOVE_DON` sur le DON!! −1. C'est un choix délibéré.
- **Parties sans registre d'effets** (scopes M0/M1 `BASIC_TURNS`) : le profil `giveRestedDon` de ST01-001 et ST01-007 y reste sans exécuteur. C'est une limite antérieure à M3, documentée mais non corrigée pour ne pas modifier les jalons historiques.
- **Invariant de face visible.** Seuls les DON!! sont exemptés. Une future carte qui renverrait en main un Personnage cité par un événement public demandera une révision de cet invariant.
- **Restriction `MOVE_DON`.** C'est une restriction propre au moteur, qui modélise un effet de carte. Son interprétation pour les coûts DON!! −X n'est pas une règle Bandai générale.
- **FAQ ST04-016.** Le texte de la question n'a pas pu être extrait : seule la réponse est confirmée.
- **Pilote de partie.** Il illustre l'exécution des règles, pas une stratégie : la graine 52 a été choisie par balayage pour sa couverture.
