# M1.5D — conception proposée après audit

Date : 11 octobre 2026. Statut : proposition à relire, non implémentée.

## Résultat attendu et périmètre

Lever les trois blocages M1.5C dans le moteur existant : ordonnancement des capacités automatiques, pipeline commun des coûts et opérations, capacités ON_KO réelles. Conserver les API publiques, les instances physiques, les projections privées et les sauvegardes versionnées. Aucun changement de base, catalogue maître, collection, boosters, coins, decks utilisateurs ou interface. Aucun combat et aucune certification globale de carte jouable.

## Cartographie constatée

| Module | Réalité du code | Intervention proposée |
|---|---|---|
| `cardgame/src/game/core/game.ts` | Point d'entrée `applyCommand`, copie de travail, validation, conservation et projection | Appeler le même pipeline puis stabiliser la file avant de rendre la main |
| `core/types.ts` | État JSON, commandes existantes et runtime optionnel | Étendre les unions existantes, sans deuxième état de partie |
| `core/turns.ts` | Paiements et déplacements de base encore directs | Raccorder les changements concernés aux opérations communes |
| `effects/contracts.ts` | DSL 1.0/1.1, continuations, choix de cartes, opérations DON!! et journal KO distinct | Ajouter les contrats versionnés d'opération, paiement, déclenchement et choix d'ordre |
| `effects/runtime.ts` | Interpréteur existant, remplacement KO facultatif, reprise JSON | Garder l'interpréteur ; extraire les fonctions communes d'opération et d'ordonnancement |
| `effects/characteristics.ts` | Évaluateur pur imprimé/base/actuel, conditions et durées | Réutiliser pour les sélecteurs de puissance actuelle et de base |
| `cards/effectPrototype.ts` | Sept cartes de laboratoire, aucune pleinement certifiée | Ajouter les définitions relues nécessaires dans ce laboratoire |

Refus actuels à conserver jusqu'aux tests de remplacement : `capturePlayedEffects` rejette plusieurs capacités éligibles et les déclenchements pendant un choix ; la DSL rejette ON_KO ; les lots de plusieurs victimes KO et plusieurs remplacements ne sont pas couverts. `begin` repose directement la source ; `addPower` écrit directement les modificateurs. Un KO confirmé déplace la victime puis produit son événement, sans capture ON_KO sur le terrain.

## Approches examinées

1. **Évolution intégrée recommandée** : deux modules ciblés `effects/operations.ts` et `effects/scheduler.ts`, utilisés par le runtime et `applyCommand`. Les définitions restent déclaratives, les continuations existantes restent le mécanisme de suspension.
2. Machine virtuelle générale de toutes les capacités : beaucoup plus de contrats et de migrations ; hors besoin de ce jalon.
3. Gestion spéciale par carte ou callbacks : incompatible avec la sérialisation et les futures séries ; écartée.

## Ordonnanceur

L'état contient des lots de déclenchements, leurs causes confirmées, le joueur actif au moment pertinent et un déclenchement en résolution. Chaque enregistrement porte un identifiant stable, une définition versionnée, un contrôleur, une source physique avec génération et les informations figées réglementairement nécessaires. Les états sont `PENDING`, `RESOLVING`, `RESOLVED`, `INVALIDATED`.

Les capacités du lot initial précèdent celles produites pendant leurs résolutions. Au sein du lot, respecter la procédure active/non-active ; lorsque le choix d'ordre appartient à un joueur, suspendre avec un choix d'identifiants de capacités. Un ordre technique de présentation ne décide jamais de l'ordre de résolution. Le cas A et B déjà en attente, A produisant C, doit conserver B avant C. Aucun empilement LIFO.

Une capacité automatique ordinaire dont la source change de zone avant activation est distinguée d'une capacité déjà activée. Pour ON_KO, préparer les informations sur le terrain après décision des remplacements, lors du KO réellement confirmé, et résoudre en défausse. Ne pas capturer ON_KO à partir de la simple proposition. Ne pas autoriser globalement une source périmée : la continuité repose sur la capture vérifiable associée à l'événement confirmé.

Les choix d'ordre étendent la union `PendingChoice`, sans déguiser une capacité en carte. Ils utilisent `ANSWER_CHOICE`, l'autorisation du contrôleur, les identifiants de résolution et la continuation JSON. Une réponse répétée ou périmée ne rejoue aucune opération. Le runtime interne et les options privées restent absents de la projection adverse.

## Pipeline commun

Opérations discriminées minimales : repos, déplacement DON!!, attachement DON!!, modificateur temporaire de puissance, KO, déplacement de carte. Chaque proposition porte commande, résolution, source, contrôleur, intention `COST | EFFECT | RULE`, génération attendue et remplacements déjà examinés. Chaque confirmation porte les changements réels et un événement correspondant ; une prévention ne produit pas de faux succès.

Un seul point de validation et de confirmation applique les restrictions, les remplacements couverts et les invariants. Le journal interne conserve propositions, décisions et confirmations ; la projection publique n'affiche que les données autorisées. Les effets et paiements utilisent les mêmes opérations, mais conservent leurs règles distinctes.

Les coûts composés sont d'abord intégralement vérifiés. Initialement impossibles : aucun paiement. Initialement possibles mais interrompus réglementairement : conserver les paiements autorisés réellement accomplis, ne pas exécuter le corps de la capacité et respecter la consommation de limitation applicable. Cette interruption est un résultat réglementaire persistant, pas une exception technique déclenchant un rollback global. Les erreurs de commande invalides restent atomiques selon le contrat existant.

Contrats prévus : coût DON!!, repos, défausse, déplacement, séquence et alternative. N'exécuter que les formes réglementairement vérifiées. Les alternatives non couvertes sont refusées explicitement. Aucun choix automatique de priorité entre remplacements. Les cas non encore traités restent refusés.

## Cartes réelles proposées

| Carte | Fonction | Vérification et limite |
|---|---|---|
| OP01-007 Caribou | ON_KO, KO facultatif d'un personnage adverse de puissance actuelle ≤ 4000 | Catalogue officiel et erratum du 17 février 2023 : sélection de zéro à une carte |
| OP04-003 Usopp | ON_KO, KO facultatif de puissance de base ≤ 5000 | Catalogue et FAQ OP04 ; consulter l'évaluateur de base, pas la puissance actuelle |
| OP05-001 Sabo | Remplacement d'un KO par −1000 pour le tour, sous conditions DON!!, tour adverse, puissance et limitation | Catalogue et FAQ OP05 ; commencer par une victime, sans annoncer la couverture des KO groupés |
| OP06-007 Shanks, existante | Produit un KO et démarre les interactions entre séries | Réutiliser la définition relue du laboratoire |

Scénarios réels : Shanks provoque un KO de Caribou ; Caribou provoque un second KO de Caribou et sa cascade. Shanks cible Usopp sous Sabo : remplacement accepté, aucun événement KO ni ON_KO ; remplacement refusé, ON_KO Usopp puis KO de Caribou. Les fixtures synthétiques complètent les cas simultanés et l'extension `TEST-FUTURE-SET`, sans être présentées comme cartes officielles.

Ces définitions prouvent les familles retenues ; elles ne rendent pas le combat, les restrictions de tournoi ou le jeu complet disponibles. Conserver la certification restrictive du laboratoire.

## Références réglementaires et réserves

Sources consultées : [règles complètes v1.2.1](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [FAQ OP10](https://en.onepiece-cardgame.com/pdf/qa_op10.pdf?20250228=), [FAQ OP04](https://en.onepiece-cardgame.com/pdf/qa_op04.pdf?20240405=), [FAQ OP05](https://en.onepiece-cardgame.com/pdf/qa_op05.pdf?20240405=), [errata](https://en.onepiece-cardgame.com/rules/errata_card/), catalogues officiels [OP01](https://en.onepiece-cardgame.com/cardlist/?series=569101), [OP04](https://en.onepiece-cardgame.com/cardlist/?series=569104), [OP05](https://en.onepiece-cardgame.com/cardlist/?series=569105).

| Sujet | Référence | Conséquence pour la conception |
|---|---|---|
| Lots et cascades | 8-6-1, 8-6-1-1, 8-6-3 ; FAQ OP10-042 | Préserver les capacités déjà en attente avant les nouvelles |
| Paiement | 8-3-1-1, 8-3-1-3, 8-3-1-3-1, 8-3-1-7 | Distinguer impossibilité initiale et interruption |
| ON_KO | 10-2-17 | Vérifier sur le terrain, résoudre en défausse |
| Sortie sans KO | 10-2-1-3 | Ne pas fabriquer de déclenchement ON_KO |
| Source et remplacement | 8-1-3-1-3, 8-1-3-4 | Captures bornées et prévention des réapplications |

À préciser avant le test réglementaire générique : portée exacte du libre choix d'ordre entre capacités d'un même contrôleur, au-delà des exemples vérifiés ; interactions de plusieurs remplacements facultatifs ; coûts interrompus par plusieurs conséquences simultanées. Ne pas transformer une absence de traitement en ordre arbitraire. Un cas non vérifiable reste explicitement hors couverture, avec verdict PARTIAL si nécessaire.

## Versions et sauvegardes

Les tests historiques vérifient certains refus de DSL 1.1. Prévoir une nouvelle version explicite, proposée `1.2.0` avec moteur `m1.5d-1`, sans réinterpréter silencieusement les anciennes sauvegardes. Même moteur, mêmes API, compatibilité par validation/version et adaptateurs localisés. Les parties épinglent leurs définitions et règles. Une primitive inconnue ou une incompatibilité doit être rejetée avant mutation.

## Vérification requise lors de l'implémentation

Conserver les 200 tests historiques. Ajouter tests d'ordre active/non-active, choix de contrôleur, lots et cascades, générations, choix et reprise JSON, coûts simples/composés/interrompus, événements réels, ON_KO confirmé/prévenu/en cascade, interactions réelles entre séries, confidentialité, réponses répétées, versions anciennes et extension fictive. Vérifier conservation des instances et même résultat avant/après reprise.

Exécuter tests ciblés, suite complète, TypeScript, ESLint et build isolé. Publier des traces générées par les tests, pas des exemples présentés comme preuves d'exécution. Un garde-fou technique contre une boucle doit signaler une résolution bloquée ; il ne décide pas d'un vainqueur.

## État de cette livraison

Audit et vérifications de référence terminés. Implémentation M1.5D non commencée ; aucun nouveau comportement annoncé fonctionnel. Cette proposition doit être relue avant le plan d'implémentation détaillé.
