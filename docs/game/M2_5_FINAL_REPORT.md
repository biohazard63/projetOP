# M2.5 — rapport final

**Verdict global : PARTIAL.** M2.5 ne satisfait pas ses critères de réussite complets. La suite Universal Ability Engine a depuis raccordé les timings déclaratifs `WHEN_ATTACKING` et `ON_BLOCK` au scheduler existant; le reste des capacités automatiques de combat, Trigger et scénarios de capacités interséries demeure incomplet. Aucune carte réelle n'est certifiée `PLAYABLE_VERIFIED`.

## Réalisé

- `CardReview.combatKeywords` : union TypeScript explicite et validation de l'allowlist dans `adaptCard`.
- Rush et Rush: Character : attaque au tour où un Character est joué; Rush: Character ne cible pas le Leader. `getLegalActions` expose maintenant aussi `targetIdsByAttacker`, car les tableaux agrégés seuls pouvaient suggérer une combinaison attaquant/cible interdite.
- Unblockable : aucune action Blocker n'est proposée et une commande forgée est refusée.
- Double Attack : deux résolutions de dommage Life lorsque l'attaque réussit contre un Leader.
- Banish : Life touchée envoyée au Trash face visible; aucun Trigger n'est tenté.
- Une Life de dommage ordinaire portant un texte Trigger bloque `RESOLVE_BATTLE` avec `TRIGGER_RESOLUTION_NOT_IMPLEMENTED`; la commande transactionnelle ne modifie pas l'état.
- `PLAY_COUNTER_EVENT` est relié à la fenêtre Counter et à la validation des définitions `counterEvent`. Blast Breath (ST04-016) paie son coût imprimé par l'opération REST, traite DON!! −1 comme facultatif selon la FAQ officielle, applique +4000 pour la bataille si choisi, puis déplace l'Event au Trash.
- Les tests distinguent un coût initialement impossible (rejet sans mutation), un paiement réglementairement interrompu (opérations confirmées conservées, Event non activé) et une erreur technique (clone de commande non commité).
- Correction du test qui exigeait une étape Attack persistante sans effet suspendu.

Les nouveaux mots-clés sont testés dans des fixtures synthétiques. Aucun texte de carte n'est interprété au runtime. Les références des règles sont les Comprehensive Rules v1.2.1, §§7-1-1, 7-1-4, 10-1-1 à 10-1-3, 10-1-6, 10-1-7; les points Trigger sont §§8-6-2 et 10-1-5. Références officielles : [règles complètes](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [FAQ générale](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf), [Card List OP-01](https://en.onepiece-cardgame.com/cardlist/?series=569101), [Card List ST-04](https://en.onepiece-cardgame.com/cardlist/?series=569004).

## État des lots

| Lot | État | Preuve / limite |
|---|---|---|
| A — capacités automatiques de combat | PARTIAL | `WHEN_ATTACKING` et `ON_BLOCK` déclaratifs sont liés au scheduler depuis la suite Universal Ability Engine; autres timings et cartes officielles complètes manquent. Traces synthétiques dans `docs/game/evidence/universal-ability/`. |
| B — Counter Events | PARTIAL | Blast Breath (ST04-016) uniquement : paiement imprimé, DON!! −1 facultatif, +4000 bataille et déplacement au Trash testés; coûts alternatifs et autres effets Event absents. |
| C — Trigger / Life | PARTIAL (refus explicite) | Refus transactionnel testé; choix, révélation, résolution et reprise Trigger absents. |
| D — mots-clés | PARTIAL | Rush, Rush: Character, Unblockable, Double Attack, Banish testés synthétiquement; règles conditionnelles et interactions réelles non certifiées. |
| E — interruptions | PARTIAL | KO simple/scheduler antérieurs restent en place; combat interrompu, cibles déplacées par capacités et remplacements concurrents incomplets. |
| F — interséries | NOT_TESTED | Pas de scénario d'interaction de capacités réelles entre extensions. La compatibilité fictive antérieure M1.5B/C n'est pas une preuve M2.5. |

## Vérifications réellement exécutées

- Baseline observée : 242 tests historiques réussis.
- Après modifications : `npm test` — **248/248 PASS** (le test Counter Event inclut aussi l'interruption après paiement partiel).
- `npm run typecheck` — **PASS**.
- `npm run lint` — **PASS**, zéro erreur et 99 avertissements préexistants.
- Build de production final dans une copie isolée — **PASS**; Next.js a compilé et généré 41 pages statiques. La première tentative sandboxée a échoué sur DNS `fonts.googleapis.com`. Deux commandes intermédiaires ont utilisé par erreur le `.next` du dossier source, la seconde a été interrompue par moi; le build final a été relancé dans la copie temporaire. L'inspection des processus locaux n'a pas été autorisée par le sandbox; aucun autre processus n'a été arrêté.
- `git diff --check` — **PASS**.
- Le build isolé a été rejoué après l'ajout Counter Event; copie de travail : `/private/tmp/m2_5-build.XIlTLS/cardgame`. Le build a compilé et généré 41 pages statiques. Deux commandes antérieures ont touché le `.next` source par erreur, comme indiqué ci-dessus.
- Résultats : `docs/game/evidence/m2_5/final-tests.log`, `final-typecheck.log`, `final-lint.log`, `isolated-build-success.log` (build isolé final) et `isolated-build.log` (première tentative sandbox bloquée par DNS).

## Fichiers modifiés/créés par M2.5

- Code : `cardgame/src/game/cards/types.ts`, `cardgame/src/game/cards/adapter.ts`, `cardgame/src/game/core/types.ts`, `cardgame/src/game/core/combat.ts`.
- Tests : `cardgame/tests/game-m2a.test.ts`.
- Documentation : `docs/game/M2_5_ROADMAP.md` et les six rapports de lots.
- Preuves : `docs/game/evidence/m2_5/`.

Les autres changements déjà présents sur `maintenance/catalog-rebuild` ont été conservés. Aucun commit, push, déploiement, changement de base ou d'interface n'a été effectué.

## Limites à lever pour clore M2.5

1. Brancher les fenêtres `When Attacking`, `On Block` et `When Attacked` à l'ordonnanceur sérialisable.
2. Étendre les Counter Events aux définitions déclaratives génériques, aux coûts alternatifs et aux effets complets sans double paiement.
3. Modéliser le dommage Life comme résolution suspendable, Trigger privé, acceptation/refus, continuation JSON et retour au combat.
4. Faire passer les opérations de dégâts/KO et leurs remplacements par des événements confirmés unifiés.
5. Ajouter les tests interséries avec définitions officielles intégralement vérifiées; ne certifier que les cartes dont tous les textes et capacités sont exécutables.
6. Ajouter des scénarios interséries vérifiés et rejouer la suite, le typage, le lint et le build isolé.

Les rapports par lot donnent le détail et les références. M3 n'est pas commencé.
