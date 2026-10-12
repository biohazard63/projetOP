# M1.5D — rapport d'implémentation

Date : 11 octobre 2026. Verdict : **PARTIAL**. Les trois axes prioritaires disposent d'une implémentation et de preuves exécutables ; le pipeline reste limité aux coûts et remplacements décrits ci-dessous. Aucun moteur complet ni carte entièrement certifiée jouable n'est revendiqué. M2 n'est pas commencé.

## Résultats réels

| Vérification | Résultat | Preuve |
|---|---|---|
| Tests ciblés M1.5D | PASS — 34/34 | [final-targeted.log](evidence/m1_5d/final-targeted.log) |
| `npm test` | PASS — 234/234 ; 200 historiques + 34 nouveaux, zéro échec/ignoré | [final-tests.log](evidence/m1_5d/final-tests.log) |
| `npx tsc --noEmit` | PASS — sortie 0 | [final-typecheck.log](evidence/m1_5d/final-typecheck.log) |
| `npm run lint` | PASS — sortie 0, zéro erreur, 99 avertissements préexistants | [final-lint.log](evidence/m1_5d/final-lint.log) |
| `npm run build`, copie isolée | PASS — sortie 0 | [final-build.log](evidence/m1_5d/final-build.log) |
| Génération/relecture des traces | PASS — 34 tests, états rejoués comparés | [final-traces.log](evidence/m1_5d/final-traces.log) |
| Combat, Counter, Blocker, dégâts de Vie, Trigger | NOT_TESTED — hors jalon | Aucune couverture revendiquée |
| Coûts alternatifs/défausse/déplacement, KO groupés, remplacements concurrents | NOT_TESTED pour résolution ; refus explicites testés | Couverture restreinte, voir limites |

Commandes exécutées depuis `cardgame/` : `node --import tsx --test tests/game-m1-5d.test.ts`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `node --import tsx scripts/game/trace-m1-5d.ts`. Build dans `/private/var/folders/rm/zx_lwlr15zv7zlrkq6phxp4c0000gn/T/mugiwara-m15c-build-s18qcvee`, sans environnement applicatif de production. Les empreintes des sources du noyau ont été comparées avant compilation : [final-source-hashes.json](evidence/m1_5d/final-source-hashes.json). Le serveur local n'a pas été arrêté.

## Architecture réellement implémentée

Le runtime existant reste l'unique moteur, accessible par `applyCommand`. DSL `1.2.0`, moteur `m1.5d-1` ; registres et sauvegardes 1.0/1.1 restent épinglés à leur comportement antérieur.

L'ordonnanceur conserve des lots, captures de sources/générations, historiques et choix d'ordre en JSON. Le joueur actif résout ses capacités en attente avant le non-actif ; plusieurs capacités de même contrôleur donnent un choix, et les capacités issues d'une résolution attendent la fin du lot initial. La reprise conserve les identités et refuse les causes, acteurs, choix ou versions falsifiés. Une source ordinaire devenue invalide est invalidée ; ON_KO utilise la présence capturée sur le terrain puis la présence attendue en défausse. Les limites une fois par tour sont vérifiées à l'activation, y compris en cascade.

Le module d'opérations offre une validation/confirmation commune pour repos, déplacements DON!!, attachement, déplacements de cartes, puissance temporaire et KO sur le périmètre moderne. Les remplacements restent sélectionnés par le runtime avant confirmation. Les journaux autoritaires et files ne sont pas exposés à l'adversaire.

Les coûts couverts sont `NONE`, `REST_SOURCE`, `REST_DON` et séquences plates de ces coûts. La validation initiale distingue `INITIAL_UNPAYABLE`, `PAID` et `INTERRUPTED`. Une interruption réglementaire conserve les opérations déjà payées et n'exécute pas le corps ; une erreur technique rejette la commande sans état partiel. La révélation publique préalable d'une carte jouée utilise un instantané de définition/illustration, jamais l'identifiant de sa présence cachée en main.

## Cartes et conformité

| Carte | Capacité réellement exécutée | Statut |
|---|---|---|
| OP01-007 Caribou | ON_KO : zéro/un Personnage adverse de puissance actuelle ≤ 4000 | DATA_VALID_EFFECT_PENDING |
| OP04-003 Usopp | ON_KO : zéro/un Personnage adverse de puissance de base ≤ 5000 | DATA_VALID_EFFECT_PENDING |
| OP05-001 Sabo | Remplacement facultatif du KO d'une victime admissible, réduction de puissance et usage par tour | DATA_VALID_EFFECT_PENDING |
| OP06-007 Shanks | ON_PLAY existant : KO zéro/un Personnage adverse ≤ 10000, interactions interséries | DATA_VALID_EFFECT_PENDING |

ST01-001, ST01-007, ST01-011, ST01-013, ST01-017, EB01-008 et OP06-007 restent les définitions historiques du laboratoire M1.5C. Le nombre de cartes `PLAYABLE_VERIFIED` demeure **zéro**. Les fixtures établissent des états intermédiaires valides avec les instances déjà créées ; elles ne constituent pas des parcours de combat implémentés.

Références vérifiées : [règles complètes Bandai v1.2.1, 28 août 2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), §§8-6-1, 8-6-1-1 et 8-6-3 (automatiques, ordre/cascade), §§8-3-1-1, 8-3-1-3, 8-3-1-3-1 et 8-3-1-7 (coûts), §10-2-13-5 (usage interrompu), §10-2-17 (ON_KO), §8-1-3-1-3 (source), §8-1-3-4 (remplacement). [FAQ OP10](https://en.onepiece-cardgame.com/pdf/qa_op10.pdf?20250228=) : choix d'ordre et effets initiaux avant nouvelle capacité. [FAQ OP04](https://en.onepiece-cardgame.com/pdf/qa_op04.pdf?20240405=) : puissance de base d'Usopp. [FAQ OP05](https://en.onepiece-cardgame.com/pdf/qa_op05.pdf?20240405=) : puissance actuelle de Sabo, refus ne consommant pas son usage, victimes multiples traitées ensemble dans le jeu officiel. [Errata Bandai](https://en.onepiece-cardgame.com/rules/errata_card/) : Caribou, 17 février 2023, sélection « jusqu'à un ». Aucun comportement de pile d'un autre TCG n'a été importé.

## Tests et traces

Les 34 tests couvrent versions, primitives inconnues, choix d'ordre, contrôleurs des deux joueurs, cascades, reprise JSON, idempotence, confidentialité, paiements initiaux impossibles/interrompus, Caribou/Usopp réels, KO empêché par Sabo, refus/acceptation/usage de Sabo, puissance de base distincte de la courante, changement de présence, invalidation d'une source et extension fictive. Les interactions réelles utilisent Shanks OP06 avec Caribou OP01, Usopp OP04 et Sabo OP05.

Traces autoritaires reproductibles : [KO confirmé](evidence/m1_5d/traces/ko-confirmed.json), [cascade et reprise](evidence/m1_5d/traces/ko-cascade-recovery.json), [KO empêché](evidence/m1_5d/traces/ko-prevented.json), [simultanés avant cascade](evidence/m1_5d/traces/simultaneous-before-cascade.json), [future série](evidence/m1_5d/traces/future-set.json). Ce sont des données de test complètes, à ne pas transmettre comme projection publique. L'extension fictive n'est pas une certification réglementaire.

La revue indépendante a identifié trois défauts corrigés avec tests RED puis GREEN : rollback erroné d'un paiement de carte interrompu, usage automatique répété en cascade, acceptation de causes/files falsifiées à la restauration. Deux tests supplémentaires ont nécessité la correction de leurs fixtures (DON!! nécessaires au paiement de Shanks et réponse au choix d'ordre encore suspendu), sans contournement du runtime.

## Limites justifiant PARTIAL

- KO groupés et plusieurs remplacements applicables refusés (`KO_BATCH_NOT_IMPLEMENTED`, `REPLACEMENT_ORDER_NOT_IMPLEMENTED`). Sabo ne couvre qu'une victime ; sa FAQ multivictime n'est pas implémentée.
- Coûts alternatifs décrits mais non exécutés ; coûts de défausse/déplacement et ON_KO avec coût restent non pris en charge. Aucun paiement remplacé complexe n'est revendiqué.
- Les coûts DON!! des actions de base utilisent les identifiants explicitement choisis ; `REST_DON` du laboratoire sélectionne les premiers DON!! admissibles. Ce dernier n'est pas une couverture générale des décisions de paiement.
- Le remplacement LittleOars historique et certains retours DON!! réglementaires conservent des chemins de mutation spécifiques avec journalisation. Le noyau n'est pas encore intégralement unifié pour toutes les mutations/paiements.
- Le journal commun contient résultat, contrôleur, résolution et sujet, mais pas une chaîne exhaustive Command → proposition → remplacement → événement pour chaque opération historique.
- Une source invalide en attente peut encore apparaître dans le choix d'ordre avant invalidation lors de l'activation ; aucun effet invalide n'est exécuté.
- Cycles techniques : refus explicite, sans victoire fabriquée. Aucun traitement général des boucles réglementaires ou effets continus circulaires.

## Fichiers concernés

Noyau modifié : `cardgame/src/game/core/{game,invariants,turns,types}.ts`, `cardgame/src/game/effects/{contracts,runtime}.ts`.

Créés : `cardgame/src/game/effects/{scheduler,operations}.ts`, `cardgame/src/game/cards/effectScheduling.ts`, `cardgame/tests/game-m1-5d.test.ts`, `cardgame/scripts/game/trace-m1-5d.ts`.

Documents : ce rapport, plan/ledger, compléments EFFECT_ENGINE_ARCHITECTURE, EFFECT_RESOLUTION_SPEC, EFFECT_DSL_SPEC, EFFECT_RUNTIME_COVERAGE, EFFECT_RESOLUTION_TRACES, EFFECT_CARD_VALIDATION, FUTURE_SET_COMPATIBILITY, EFFECT_IMPLEMENTATION_PLAN et preuves sous `evidence/m1_5d/`. Les rapports historiques sont conservés. Aucune dépendance ajoutée ; les modifications préexistantes sont préservées.

## Suite recommandée

Fermer les limites du pipeline et des décisions de paiement avant de généraliser la certification. Vérifier/tester séparément remplacements multivictimes et paiements remplacés, puis préparer M2 (combat) avec tests réglementaires et invariants. Aucune exécution M2, migration, modification de données, push ou déploiement pendant cette mission.
