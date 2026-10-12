# M1.5C — prototype vertical — 11 octobre 2026

## Verdict : PARTIAL

Le noyau existant exécute des capacités réelles des quatre familles, avec définitions déclaratives, choix privés JSON, reprise idempotente, évaluateur central et interaction OP06/EB01. Les contrôles techniques passent. M1.5C n'est pas déclaré entièrement PASS : l'ordonnancement général des automatiques simultanés/cascades et l'unification de toutes les opérations/coûts dans le pipeline de remplacement ne sont pas livrés. Aucun M2 commencé.

**Résultats finaux : 42/42 tests ciblés ; 200/200 globaux (158 historiques +42 nouveaux) ; zéro FAIL/skip. TypeScript PASS. ESLint PASS, zéro erreur et 99 avertissements préexistants. ESLint noyau/tests : zéro erreur/avertissement. Build isolé PASS.**

## Audit et cartographie avant intégration

Documents M1.5A/B et spécifications architecture, matrice, résolution, DSL, cas limites, futures extensions, pipeline de compilation, certification et plan lus ; noyau, tests, cartes relues et JSON ST01/OP17/OP12/EB01/OP06 examinés. Le contenu réel de M1.5B avait des programmes synthétiques MAIN, deux primitives DON, des continuations SELECT/ORDER et un remplacement DON ; aucune source de carte physique ni effet réel activé. M1.5 possédait déjà les phases/pose/attachement et la projection.

| Module réel | Point d'intégration retenu |
|---|---|
| cards/adapter.ts + types.ts | Conserver définitions canoniques/révisions/printings ; ajouter EffectSpec déclaratif sans toucher aux références en base |
| cards/reviewedCards.ts | Inchangé ; nouvelles révisions dans un bundle laboratoire distinct |
| core/game.ts | Même createGame/applyCommand/restoreGame ; admission de programmes liés à définitions ; capture après événements de pose confirmés |
| core/turns.ts | Conserver boucle/validation ; déléguer coûts et puissance au même évaluateur |
| effects/contracts.ts | Étendre schémas stricts/versions existants, pas un deuxième GameState ou Command |
| effects/runtime.ts | Même interpréteur/continuation ; sources physiques, DON attachés, modificateurs, KO/remplacement suspendu |
| effects/characteristics.ts | Point d'entrée pur unique ; pas de puissance courante dupliquée dans GameState |

Pas de changement de mécanisme économique, règles de boosters, catalogue maître ou stockage utilisateur. Le bundle n'est branché sur aucune interface.

## Fichiers créés et modifiés

Modifiés :
- cardgame/src/game/cards/types.ts
- cardgame/src/game/core/game.ts
- cardgame/src/game/core/turns.ts
- cardgame/src/game/core/index.ts
- cardgame/src/game/effects/contracts.ts
- cardgame/src/game/effects/runtime.ts

Créés :
- cardgame/src/game/cards/effectPrototype.ts
- cardgame/src/game/effects/characteristics.ts
- cardgame/tests/game-m1-5c.test.ts
- docs/game/M1_5C_REPORT.md
- docs/game/EFFECT_RUNTIME_COVERAGE.md
- docs/game/EFFECT_RESOLUTION_TRACES.md
- docs/game/EFFECT_CARD_VALIDATION.md
- docs/game/evidence/m1_5c/ : journaux, empreintes, trace JSON et chemin du build isolé.

Spécifications actualisées par ajouts ciblés : EFFECT_ENGINE_ARCHITECTURE.md, EFFECT_DSL_SPEC.md, EFFECT_RESOLUTION_SPEC.md et FUTURE_SET_COMPATIBILITY.md. Les documents des jalons précédents restent des rapports historiques.

Branche existante maintenance/catalog-rebuild conservée. package.json et de nombreux fichiers étaient déjà modifiés/non suivis avant cette mission ; aucun reset, nettoyage, commit, push ou déploiement effectué. La comparaison SHA256 [preservation.json](evidence/m1_5c/preservation.json) ne détecte que les six modifications de source listées, aucune suppression parmi les fichiers inventoriés. Scripts, Prisma, JSON, catalogue, sources UI/collection/boosters/coins inchangés.

## Cartes et couverture réelle

Sept références : **ST01-001 Luffy, ST01-007 Nami, ST01-011 Brook, ST01-013 Zoro, ST01-017 Thousand Sunny, EB01-008 LittleOars Jr., OP06-007 Shanks**. Clauses, caractéristiques, FAQ/errata et arbitrages détaillés dans [EFFECT_CARD_VALIDATION.md](EFFECT_CARD_VALIDATION.md), couverture dans [EFFECT_RUNTIME_COVERAGE.md](EFFECT_RUNTIME_COVERAGE.md).

Les candidates OP17 restent non activées faute de vérification officielle suffisante dans cette session ; Shirahoshi OP12-102 demande la Vie face visible et un traitement explicite de puissance « - ». Le sous-ensemble vérifiable retenu les remplace sans inventer leurs effets.

Toutes les clauses imprimées des sept références sont représentées et testées dans le parcours retenu ; zéro carte nouvellement certifiée PLAYABLE_VERIFIED. Statut global proposé DATA_VALID_EFFECT_PENDING, automaticPlayReady=false : combat, Counter et ordonnancement universel absents. Ceci n'autorise pas toutes les cartes ou tous les decks de l'application dans le simulateur.

## Pipeline effectivement implémenté

START_EFFECT : validation du même dispatcher → fenêtre MAIN, acteur/source/zone/génération, condition, coût disponible, usage → paiement REST_SOURCE si applicable → continuation et choix → opérations DON/addPower/KO → événements → fin ou suspension.

PLAY_CARD : coût réel et pose du noyau → CARD_PLAYED confirmé → capture de l'unique capacité ON_PLAY de cette présence → même interpréteur et choix. Aucun déclenchement à partir d'une proposition non appliquée, aucune activation manuelle de ON_PLAY.

KO : proposition privée PROPOSED → unique remplacement admissible ou aucun → choix facultatif du propriétaire → KO confirmé ou KO remplacé + défausse confirmée → événements réels. L'opération remplacée ne produit jamais CARD_KO. Plusieurs remplacements applicables donnent un refus explicite, pas une priorité inventée.

Limite : REST_SOURCE et addPower n'ont pas encore un ProposedOperation commun aux déplacements DON/KO. Les opérations coûteuses multi-étapes et l'interruption réglementaire de paiement ne sont pas couvertes. Les refus techniques restent atomiques dans la copie de applyCommand ; ne pas transformer ce rollback technique en règle de paiement officiel universelle (règles 8-3).

## Évaluateur et durées

Imprimée/base/courante distinctes ; base=imprimée dans ce sous-ensemble, valeurs null préservées. Additions continues indépendantes de zone/seuil DON et modificateurs temporaires de présence THIS_TURN, plus bonus réglementaire DON propre tour. Recalcul pur à chaque lecture ; getLegalActions, paiement, ciblage Shanks et projection utilisent le même évaluateur.

Les changements de zone invalident les modificateurs de l'ancienne génération. Les durées THIS_TURN cessent lorsque la transition END change le tour ; le noyau n'expose pas de fenêtre de combat/effet fin-de-tour permettant de généraliser cet ordre. Puissance de base modifiée, couches dépendantes, cycles, durées du prochain tour et reductions de coût dans la main restent hors couverture et ne sont pas admis silencieusement.

## Choix, confidentialité et reprise

Continuation JSON avec pc/bindings et interception de KO ; identités physiques et générations ; acteur autorisé, tokens opaques, version attendue. Après choix public du destinataire ou privé du défenseur, sauvegarde/relecture puis reprise à la bonne instruction. Les commandes normales ne contournent pas la suspension.

Rejeu exact dédupliqué par M1 ; autre clé périmée ou mauvais choix refusé sans double DON/défausse. Source de capacité et usage keyed par instance + présence + tour. LittleOars consomme sa protection uniquement après remplacement accepté.

projectState expose les choix privés à leur acteur uniquement, pas aux adversaires/spectateurs ; cardOperations/interception/usage/registre/continuation restent privés. Les événements publics ne concernent que cartes déjà publiques ou effectivement révélées par défausse. Les erreurs ne détaillent pas la main privée. Les snapshots sont des données autoritaires : validation d'invariants n'est pas une signature permettant d'accepter un état client.

## Compatibilité future

Version DSL/registre/primitives 1.1.0 et engine m1.5c-1 ; sauvegardes M1.5B DSL1.0.0 conservées et testées. Pas de migration silencieuse d'une partie. Déclarations et versions copiées dans l'état, primitives inconnues/incompatibles refusées.

TEST-FUTURE-SET ajoute OP99-999, une carte entièrement fictive de fixture utilisant le programme générique d'attachement. Test : nouvelle définition/printing/deck laboratoire → pose avec paiement → capacité enregistrée → attachement réel → sauvegarde/relecture → deux résultats identiques. Le noyau ne connaît pas cette série. Pas de prétention réglementaire ou d'ajout au catalogue utilisateur.

## Vérifications réellement exécutées

Depuis cardgame :

```bash
M15C_REPORT_TRACES=1 node --import tsx --test tests/game-m1-5c.test.ts
npm test
npx tsc --noEmit
npx eslint src/game tests/game-m1-5c.test.ts
npm run lint
```

Build : npm run build depuis la copie indiquée par [build-directory.txt](evidence/m1_5c/build-directory.txt), sources/configs copiés, node_modules/public en liens locaux, cache de compilation précédent copié, sans fichier .env. Serveur local et .next du dépôt non touchés. Pas d'import ou connexion DB déclenchés. Le build a terminé avec compilation, typage, génération statique et liste des routes.

| Vérification | Résultat | Preuve |
|---|---|---|
| Tests ciblés | PASS — 42/42 | [unit.log](evidence/m1_5c/unit.log) |
| Suite complète | PASS — 200/200, dont 158 historiques, 0 échec/skip | [tests.log](evidence/m1_5c/tests.log) |
| TypeScript | PASS — sortie 0 | [typecheck.log](evidence/m1_5c/typecheck.log) |
| ESLint noyau et tests | PASS — sortie 0, aucune erreur/avertissement | [core-lint.log](evidence/m1_5c/core-lint.log) |
| ESLint application | PASS — 0 erreur, 99 avertissements antérieurs | [lint.log](evidence/m1_5c/lint.log) |
| Build production isolé | PASS — sortie 0 | [build.log](evidence/m1_5c/build.log) |
| Préservation fichiers métier | PASS — aucune suppression/changement hors noyau listé | [preservation.json](evidence/m1_5c/preservation.json) |
| Exécution cascades/ordres multiples | NOT_TESTED — runtime non implémenté ; refus testés | Tests explicites de rejet |
| ON_KO après KO empêché | NOT_TESTED pour capacité ON_KO ; absence de faux CARD_KO PASS | Trace et tests LittleOars ; timing ON_KO refusé |
| Coûts alternatifs, fenêtres Counter, tournoi complet | NOT_TESTED | Hors DSL/périmètre |
| UI/appareils et serveur autoritaire | NOT_TESTED | Aucune modification UI/réseau dans cette mission |

Le premier test d'interaction Hajrudin échouait car la fixture proposait sa pose avec seulement trois DON alors que son coût est cinq. Fixture avancée au tour approprié sans modifier le coût ni le moteur. Le test de nouvelle carte fictive a aussi nécessité une correction de la structure CardPrinting (pas de champ number). Résultats finaux ci-dessus après corrections.

## Risques et suite recommandée

1. Compléter la file sérialisable de déclenchements et l'ordre réglementaire 8-6 : batch initial avant cascades, choix du joueur parmi ses capacités, capture de source/LKI et tests inter-séries. Refus actuel de simultanés ne doit pas devenir une règle de partie.
2. Unifier REST_SOURCE/addPower/KO/DON avec les propositions, interdictions et remplacements ; couvrir interruption de paiement et événements causalement liés avant certification globale.
3. Ajouter une vraie capacité ON_KO vérifiée, tester son absence après remplacement et son apparition après KO confirmé. Aucun callback artificiel ne remplace cette preuve.
4. Préparer M2 : combat/attaques/Blocker/Counter/dégâts/Vie/Trigger et fenêtres de traitement, avec tests et projections ; ne l'intégrer qu'après validation et stabilisation des points 1–3.
5. Ajouter coûts alternatifs, modes de puissance de base et durées avancées seulement avec règles/FAQ et primitives versionnées. Ne pas activer Marco/Newgate/Shirahoshi partiellement.

Le prototype est utile et testé ; le moteur d'effets n'est ni complet ni un simulateur jouable complet. Arrêt après ce rapport, sans M2, push, déploiement ou données utilisateur.
