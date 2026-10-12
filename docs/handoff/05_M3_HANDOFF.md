# 05 — Reprise prioritaire M3

> **Clôture du 12 octobre 2026 : M3-1 à M3-5 sont terminés.** Ce document décrit la reprise du matin et reste conservé comme historique. Pour l'état final, les décisions prises (traçabilité `PAID`/`INTERRUPTED`, révisions `m3-2026-10-12`, coût `DON_MINUS`, deck violet ST04-001), les sources Bandai et les limites restantes, voir `docs/game/M3_REPORT.md` et `04_CURRENT_STATUS.md`.

## But et plan déclaré

Le plan M3 (`docs/game/M3_ROADMAP.md`) vise des Counter Events déclaratifs, la généralisation prudente de recherche/déplacements, la validation de ST04-016 dans un deck violet légal, des scénarios réels interséries et enfin une partie complète entre deux decks dont les cartes ont des effets pris en charge. Les dépendances et changements runtime ci-dessous sont observés dans le code; le plan n’est pas une preuve d’achèvement.

## Changements locaux M3 repérés

- `cardgame/src/game/cards/m3Abilities.ts` : profils déclaratifs OP06-017 et ST04-016 Counter; profils Guard Point ST01-014 Counter/Trigger; Love-Love Mellow ST03-017 Counter; On Play de OP01-016 Nami; registre M3.
- `cardgame/src/game/cards/types.ts` : ajout du discriminant `CounterEventSpec.DECLARATIVE`.
- `cardgame/src/game/cards/adapter.ts` : contrôle du lien `abilityId` pour un Counter déclaratif.
- `cardgame/src/game/effects/contracts.ts` : timing Counter, paiement facultatif RETURN_ONE_DON, conditions d’opération, filtres de recherche, sélection multiple plafonnée, restrictions de destinations de move.
- `cardgame/src/game/effects/runtime.ts` : activation déclarative Counter, coût imprimé via DON reposés, deux choix de paiement facultatif, continuation et étapes DSL; search/filter/reveal/order.
- `cardgame/src/game/core/combat.ts` : dispatch des Counter déclaratifs vers le runtime existant, en conservant les anciennes branches.
- `cardgame/tests/game-m3.test.ts` : quatre tests ciblés listés dans `04_CURRENT_STATUS.md`.
- `docs/game/M3_ROADMAP.md`, `docs/game/evidence/m3/baseline-tests.log`.

Tous ces éléments sont dans le workspace non commité. Ils ne sont pas encore validés par une suite complète/build après M3.

## Tâches restantes et critères

### M3-1 — Auditer et durcir le dispatch Counter générique (P1)

- **Problème :** sous-ensemble M3, coexistence avec les branches legacy. `ST03-017` n’a pas de test; l’état d’activation et les options de paiement sont encodés en quelques variantes, pas une prise en charge générique complète. Vérifier idempotence, paiement non partiel et comportement si continuation échoue.
- **Fichiers :** `core/combat.ts`, `effects/runtime.ts`, `effects/contracts.ts`, `cards/m3Abilities.ts`, `cards/adapter.ts`, tests M2.5/M3.
- **Comportement attendu :** commande toujours validée par `applyCommand`; coût disponible avant paiement; coût interrompu séparé d’erreur technique; carte Event et bonus uniquement selon le résultat réglementaire vérifié; erreurs sans fuite.
- **Dépendances :** textes/FAQ officiels des cartes et règle Counter Events/version des règles.
- **Tests :** Guard Point, Love-Love Mellow (condition vraie/fausse), OP06-017 coût Life facultatif, Blast Breath DON!!−1 facultatif, coût insuffisant, restauration avant/après coût, réponse répétée, événements et projection adversaire.
- **Critère :** profils ne sont pas déclarés universels; tous les cas couverts et refus explicites; full suite + typecheck/lint.

### M3-2 — Recherche réglementaire et zones (P1)

- **Problème :** filtres du dessus du deck plus expressifs, mais aucune preuve de recherche globale, de sélection zéro lorsque aucun candidat, ni mouvement universel. Ne pas étendre move vers Life/field à la légère.
- **Fichiers :** `effects/contracts.ts`, `effects/runtime.ts`, `effects/operations.ts`, `cards/m3Abilities.ts`, tests `game-m2a`, `game-m3`.
- **Comportement attendu :** recherche conserve l’ordre/visibilité conforme au texte; mélange consomme le RNG sérialisé; destinations réglementaires spécialisées restent dans leurs primitives dédiées.
- **Dépendances :** FAQ et règles de recherche propres aux cartes retenues.
- **Tests :** recherches successives, deck avec moins de N cartes, aucun candidat, choix facultatif, ordre du reste, mélange déterministe, deck vide et condition de défaite à son vrai point, sauvegarde/reprise, adversaire ne voit aucune option.
- **Critère :** pas de data leak ni de faux candidat; refus explicite pour primitives inconnues/zones non prises en charge.

### M3-3 — Blast Breath dans deck violet légal (P1)

- **Problème :** ST04-016 demeure `DATA_VALID_EFFECT_PENDING`; test de Counter seul ne suffit pas.
- **Fichiers :** `cards/officialAbilities.ts`, `cards/m3Abilities.ts`, `rulesets/decks.ts`, tests d’intégration, `M3` reports/evidence.
- **Comportement attendu :** vérifier coût imprimé, option DON!!−1, +4000 jusqu’à la fin de bataille, fenêtre de Counter et déclaration/paiement conforme.
- **Dépendances :** profil réel Leader violet, 50 cartes dont capacités obligatoires couvertes, ruleset daté et liste de restrictions à jour; source Bandai/FAQ.
- **Tests :** deck composition et mode playable (selon statut moteur), coût imprimé, DON!!−1 choisi/refusé, cible légale, interruption/reprise, résultat de combat.
- **Critère :** ne certifier qu’après couverture de toutes capacités/restrictions; sinon maintenir pending.

### M3-4 — Scénarios interséries officiels (P2)

- **Problème :** nouveaux tests OP01/ST01 se limitent à search/Counter; pas le parcours combiné planifié.
- **Fichiers :** `officialAbilities.ts`, `m3Abilities.ts`, scheduler/runtime/combat, tests et traces JSON.
- **Comportement attendu :** seules cartes et FAQ effectivement contrôlées; capacités automatiques par scheduler existant; pas de branche numéro dans le noyau.
- **Tests :** au moins un scénario combinant séries différentes, transitions confirmées, événements, choix, sérialisation, restore identique.
- **Critère :** trace reproductible, erreurs explicites, tests de refus et source réglementaire attachée à chaque définition.

### M3-5 — Partie complète (P3)

- **Problème :** aucun scénario complet entre deux decks légaux avec couverture d’effets suffisante.
- **Fichiers :** ruleset/deck validator, profiles card DSL, core tests, traces.
- **Comportement attendu :** pas de carte jouée si sa capacité obligatoire serait ignorée; règles de combat/perte appliquées au bon moment.
- **Dépendances :** lots précédents et validation de construction de deck.
- **Tests :** setup, mulligan, phases, coûts/DON, jeu de cartes, attaques, Blocker/Counter, Life/Trigger, fin, deux decks légaux, checkpoint JSON à plusieurs fenêtres.
- **Critère :** partie gagnante reproductible, chaque carte du deck certifiée/capacités couvertes; sinon report partial explicite.

## Points réglementaires à confirmer

Ne pas inférer depuis le code M3 que le paiement Event est universel. Vérifier l’ordre du coût imprimé vs coût additionnel/optionnel et la destination après résolution pour chaque carte. Vérifier règles exactes de DON!!−1 et de Life facultative contre Comprehensive Rules/FAQ applicables. Maintenir coûts déjà payés si une procédure réglementaire l’exige; transaction technique n’est pas une règle de rollback.

## Premier geste recommandé

Lire `M3_ROADMAP.md`, les sections Counter Event correspondantes de `EFFECT_*`, inspecter la validation de coûts de `runtime.ts` et le dispatch de `combat.ts`, puis exécuter les 4 tests ciblés M3 et les tests combat ciblés avant le full suite. Ne certifier rien pendant cet audit de reprise.
