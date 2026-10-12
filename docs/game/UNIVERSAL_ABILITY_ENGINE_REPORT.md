# Universal Ability Engine — bilan d’implémentation

## CURRENT STATE — complément de passation du 2026-10-12

Ce rapport décrit le moteur au 2026-10-11 et reste un historique. Depuis, M3 a ajouté des profils déclaratifs de Counter Event et une définition de recherche OP01-016, avec 4/4 tests ciblés PASS; TypeScript et ESLint (0 erreur, 99 avertissements) passent au 2026-10-12. La suite complète après ces modifications, le build isolé après M3 et `git diff --check` après M3 sont **NOT TESTED**. Le verdict courant demeure **PARTIAL**. Aucune carte n’a été nouvellement certifiée. `ST04-016` reste `DATA_VALID_EFFECT_PENDING`, aucun deck violet légal n’a été testé et aucune partie complète n’est démontrée. Voir `docs/handoff/` pour la passation actuelle.

Date : 11 octobre 2026  
Branche : `maintenance/catalog-rebuild`  
Verdict : **PARTIAL — couverture élargie, pas un moteur universel**

## Résultat de cette reprise

Le DSL versionné 1.3.0 couvre maintenant un sous-ensemble exécutable de `[Main]` et `[Activate: Main]`, ainsi que les primitives déclaratives de recherche dans le dessus du deck, révélation, mélange déterministe et déplacement de carte entre zones autorisées. Les capacités Main des Events OP06-017 et OP06-018 passent par le pipeline d'effets existant. La recherche peut s'enchaîner, suspendre des choix privés, survivre à une restauration JSON et reprendre sans recalculer le résultat.

La primitive de recherche sans candidat a été testée à la frontière du runtime. Le jeu normal applique séparément la défaite lorsque le deck est vide au point de traitement des règles; aucune commande légale n'est simulée après une défaite. Le mélange utilise le PRNG sérialisé existant. Les règles de deck vide et les capacités des Events restent liées au ruleset 1.2.1 et aux définitions revues, pas à une interprétation du texte brut.

## Couverture fonctionnelle et certifications

| Famille | État | Preuve / limites |
|---|---|---|
| `[Main]` Event | PASS sur OP06-017 et OP06-018 | Coût imprimé, passage au Trash, choix et reprise JSON. OP06-017 ne donne le bonus que si le paiement Life facultatif est choisi; OP06-018 autorise deux cibles différentes selon sa FAQ. |
| `[Activate: Main]` | PASS sur définition déclarative `TEST-FUTURE-SET` | Joueur actif, fenêtre Main, paiement `REST_SOURCE`, puissance temporaire, Once Per Turn et refus hors fenêtre. Ce test synthétique ne certifie aucune carte réelle. |
| Recherche / choix | PASS sur OP06-013 et définition future | Recherche limitée aux premières cartes du deck; sélection facultative, ordre du reste, recherches consécutives, restauration JSON. Ce n'est pas une recherche générique dans toute zone. |
| Révélation | PASS sur les cartes sélectionnées | Événement de révélation créé et confidentialité avant révélation testée. Les identifiants des options privées ne sont pas exposés à l'adversaire. |
| Mélange | PASS sur DSL 1.3.0 | Mélange déterministe via l'état PRNG de la partie. L'opération ne prétend pas gérer d'autres générateurs/versionnements que ceux admis par le runtime. |
| Déplacement | PASS sur destinations admises | `moveCard` passe par la confirmation du pipeline; l'audience privée est exigée pour certaines destinations cachées. Ce n'est pas une primitive générale de mise en jeu ni une substitution aux règles spéciales de Life, coûts ou jeu depuis une zone. |
| Trigger / combat | PASS sur le sous-ensemble antérieur | OP06-013 et OP06-018; acceptation/refus, choix privés, dommages suspendus, restauration. Les mots-clés et fenêtres de combat restent partiels. |
| Counter Event | Partiel | OP06-017 est couvert. ST04-016 Blast Breath garde `DATA_VALID_EFFECT_PENDING`, faute de validation avec deck violet légal. La compilation des Counter Events n'est pas générique. |

Cartes officielles marquées `PLAYABLE_VERIFIED` dans ce laboratoire :

- **OP06-009 Shuraiya** : Blocker, When Attacking, On Block et limite d'utilisation, avec scénario de combat.
- **OP06-013 Monkey D. Luffy** : On Play et Trigger; recherche FILM, sélection, révélation, ordre, confidentialité et reprise.
- **OP06-017 Meteor-Strike of Love** : Main et Counter, coûts imprimé et Life facultatif, choix/résolution et refus du coût facultatif.
- **OP06-018 Gum-Gum King Kong Gatling** : Main et Trigger, sélection par puissance actuelle et K.O.; choix de cibles distinctes conforme à la FAQ.

Cette certification est limitée aux profils définis dans le laboratoire et au ruleset indiqué. Elle ne certifie pas automatiquement les autres variantes, formats ou interactions non testées. **ST04-016 demeure non certifiée.**

## Sources réglementaires consultées

- [Liste officielle de cartes OP06](https://en.onepiece-cardgame.com/cardlist/?series=569106) et [FAQ OP06](https://en.onepiece-cardgame.com/pdf/qa_op06.pdf?20240419=). La FAQ indique notamment que l'effet Main de OP06-018 peut attribuer ses deux bonus à des Characters différents; elle précise aussi pour OP06-009 que sa puissance de base est déterminée au moment de l'activation.
- [Comprehensive Rules Bandai, version 1.2.1 référencée par le dépôt](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=), notamment fenêtres Main/Event, coûts, Trigger et traitement de la défaite par deck vide.
- Sources ST-04 référencées dans `officialAbilities.ts`; elles n'élargissent pas la certification au-delà du profil testé.

## Vérifications exécutées

- `node --import tsx --test --test-name-pattern='future Event composes' tests/game-m2a.test.ts` — **1/1 PASS** après ajustement du cas deck vide.
- `npm test` — **265/265 PASS**, dont les **259 tests de référence** conservés.
- `npm run typecheck` — **PASS** après correction de deux gardes de source/timing et des gardes discriminantes des actions de test.
- `npm run lint` — **PASS**, zéro erreur et 99 avertissements existants.
- `npm run build` — **PASS** dans `/private/tmp/universal-ability-build.eA0vpK/cardgame`. Le premier essai isolé a échoué par absence d'accès réseau à `fonts.googleapis.com`; après autorisation réseau, le build a compilé et généré les 41 pages. Aucun build n'a utilisé le `.next` du workspace.
- `git diff --check` — **PASS** pour les fichiers suivis; les nouveaux fichiers de travail sont principalement non suivis dans cet état préexistant du workspace.

## Fichiers touchés par cette reprise

- `cardgame/src/game/cards/officialAbilities.ts`
- `cardgame/src/game/effects/contracts.ts`
- `cardgame/src/game/effects/runtime.ts`
- `cardgame/src/game/core/game.ts`
- `cardgame/src/game/core/types.ts`
- `cardgame/src/game/core/invariants.ts`
- `cardgame/src/game/core/combat.ts`
- `cardgame/tests/game-m2a.test.ts`
- `docs/game/ABILITY_COVERAGE_MATRIX.md`
- `docs/game/ABILITY_REGISTRY.md`
- `docs/game/UNIVERSAL_ABILITY_ENGINE_REPORT.md`
- `docs/game/UNIVERSAL_ABILITY_ENGINE_CHECKPOINT.md`
- Trace JSON : `docs/game/evidence/universal-ability/future-event-search-reveal-move-shuffle.json`

Ces fichiers faisaient partie d'un workspace déjà largement non suivi/modifié. Aucun changement n'a été fait dans la collection, les boosters, les coins, Prisma, la base, le scraper ou l'interface. Aucun commit, push ou déploiement n'a été réalisé.

## Limites et suites recommandées

1. Garder le compilateur de Counter Event en attente : plusieurs profils officiels et leurs coûts doivent être vérifiés avant généralisation.
2. Exécuter ST04-016 dans un deck violet légal avant toute certification.
3. Ajouter les recherches dans d'autres zones et destinations seulement après spécification des règles de remplacement, événements et visibilité correspondants.
4. Augmenter les tests interséries avec des cartes officiellement relues; ne pas compter les définitions synthétiques comme des cartes jouables.
5. Conserver `UNSUPPORTED_MECHANIC` et les refus runtime pour toute primitive absente.
