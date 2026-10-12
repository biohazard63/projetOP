# M2 — conception et feuille de route du combat

**État : audit et plan approuvés, implémentation M2 en cours.** L'approbation utilisateur a été reçue le 2026-10-11. Le noyau contient désormais un premier sous-ensemble de combat décrit dans les rapports M2A–M2D ; il reste partiel.

## Résumé de l'audit

- Branche active : `maintenance/catalog-rebuild`. Le dépôt est déjà très modifié : `cardgame/package.json` est modifié et les sources M0/M1/M1.5, les tests, scripts, rapports et données de cartes sont présents comme fichiers non suivis. Ces éléments préexistent à M2 et doivent être préservés. Aucun `main`, push ou déploiement.
- Socle : Next.js/TypeScript, tests Node avec `tsx`, Zod déjà utilisé par le noyau. M2 n'ajoute ni interface ni dépendance.
- Référence de test exécutée avant M2 : `npm test` — **234/234 PASS**, journal [m2-baseline-tests.log](evidence/m2/m2-baseline-tests.log).
- Données locales : **59** fichiers `cards-*.json`, **4 318** lignes brutes, **4 074** identifiants d'impression bruts, **2 667** numéros canoniques, **730** textes Trigger non vides, **2 479** valeurs Counter numériques positives et **238** mentions textuelles Blocker. Ces comptes incluent des réimpressions, fichiers anglais et agrégats en double ; ils ne représentent pas autant de cartes validées.
- M0 indique un premier laboratoire de 14 définitions et 33 impressions. M1/M1.5 ont un état sérialisable et une boucle de tour en mode `BASIC_TURNS`; 234 tests couvrent les préparations, les tours et le moteur d'effets M1.5D. Le gameplay de combat est absent.
- `GameState` utilise des zones physiques `life`, `hand`, `characters`, `trash`, etc. Il n'a pas de contexte de combat. `Phase` ne contient que les étapes de tour. Les commandes sont validées par `applyCommand`, les actions par `getLegalActions`, les états privés par `projectState` et le JSON par `restoreGame`/`assertGameInvariants`.
- `CardDefinition` possède `counter` et le texte/revue de capacité, mais aucune liste canonique générale de mots-clés ; `block` correspond à l'index de bloc et **ne doit pas être interprété comme Blocker**. Les capacités relues sont restreintes au bundle de laboratoire et aux statuts M0/M1.5 ; les textes extraits ne sont pas des programmes fiables.
- L'évaluateur de puissance et le pipeline d'opérations existent. Le pipeline M1.5D reste partiel : coûts DON reposés, repos de source et séquences bornées couverts ; coûts alternatifs, défausse/déplacement comme coûts, et KO/remplacements multiples restent refusés. Les Counter Events demandent un retour DON sélectionné depuis plusieurs zones, à ajouter de façon explicite et testée.
- `processDefeat` ne gère actuellement que le deck vide. M2 doit ajouter la défaite provoquée par des dégâts au Leader à 0 Vie ; atteindre 0 Vie seul n'est pas une défaite.
- Les API `/game`, la collection, les boosters, les coins, Prisma, la base, le scraper, le catalogue maître et les decks utilisateurs restent hors périmètre.

## Règles officielles contrôlées

Source normative consultée : [Comprehensive Rules Bandai, version 1.2.1, mise à jour du 28 août 2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=). La version concorde avec le ruleset local `1.2.1`.

| Sujet | Sections | Conséquence pour le moteur |
|---|---|---|
| Pas de bataille au premier tour de chaque joueur | 6-5-6-1 | Toute attaque est refusée tant que le compteur de tours du joueur actif vaut 1. |
| Attaque | 7-1-1 | Le Leader ou un Character actif est reposé ; la cible est le Leader adverse ou un Character adverse reposé. L'Attack Step déclenche les effets liés à l'attaque. |
| Blocker | 7-1-2, 10-1-4 | Le défenseur peut activer au plus un Blocker pendant ce combat ; il doit être un autre Character actif, qui se repose et devient la cible. Les effets On Block s'activent après. |
| Counter | 7-1-3, 10-2-4, 8-3 | Le défenseur peut jouer des Characters Counter depuis sa main autant de fois qu'il le souhaite et dans l'ordre de son choix ; chaque carte est défaussée. Les Events Counter sont payés puis défaussés et résolus. |
| Fin prématurée d'une fenêtre | 7-1-1-4, 7-1-2-3, 7-1-3-1-3 | Si l'attaquant ou la cible quitte sa zone avant la fin de l'étape, le combat va directement à End of Battle, sans étape suivante. |
| Résultat contre un Character | 7-1-4-1-2, 10-2-1 | À puissance attaquante supérieure ou égale, la cible est KO ; sous égalité stricte contraire, rien n'est KO. Un remplacement qui empêche le KO ne produit aucun événement KO. |
| Résultat contre Leader et Life | 7-1-4-1 | À puissance attaquante supérieure ou égale, une blessure est traitée : prendre le Life supérieur en main, sauf Banish/Trigger ; Double Attack répète le traitement pour les dégâts fixés. |
| Trigger | 10-1-5, 8-6-2-1 | Le joueur touché peut révéler le Life obtenu et activer son Trigger au lieu de l'ajouter à sa main ; son traitement suspend temporairement le traitement des dégâts. Le joueur peut aussi le refuser et garder la carte face cachée. |
| Défaite | 1-2-1, 9-1, 9-2 | La Vie à zéro ne suffit pas ; la défaite est déterminée au traitement réglementaire après dégâts subis avec zéro Life. Un deck vide entraîne aussi défaite. Toutes les défaites simultanées sont prises en compte. |
| Puissance et expiration | 7-1-4, 7-1-5 | La puissance se consulte à Damage Step via l'évaluateur ; les bonus « pendant ce combat » expirent à End of Battle après ses déclenchements. |
| Ordre des effets | 8-6-1 à 8-6-3 | L'ordre actif/non actif, les cascades et les choix sont ceux du moteur M1.5D, sans pile LIFO étrangère. |

FAQ de référence à vérifier à nouveau pendant l'implémentation des scénarios : [FAQ règles générales](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf?20250228=), [FAQ ST-01 à ST-04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=), FAQ/errata propres à chaque carte retenue. Les rulings utiles déjà présents : un Blocker utilisé reste la cible même si un Counter modifie sa puissance ; les Characters peuvent recevoir Counter même lorsqu'ils ne sont pas la cible attaquée ; un Trigger n'est pas disponible lorsqu'un Life bouge par un effet autre que la blessure de combat.

## Architecture retenue

Une seule partie sérialisée et un seul point d'entrée : `createGame`, `applyCommand`, `getLegalActions`, `projectState`. Ajouter un `BattleState | null` versionné au `GameState`, conservant `phase: MAIN` pendant les étapes de combat ; aucune nouvelle machine d'état publique et aucun second moteur. Un module interne `core/combat.ts` ne fait que valider/transiter les commandes de combat, en appelant `processOperation`, `evaluateCharacteristics` et le scheduler M1.5D. Les fenêtres en attente, les cartes de choix et l'ordonnancement sont persistés comme données JSON ; aucune closure/callback dans une sauvegarde.

`BattleState` fige l'identité de la bataille, les présences/générations de l'attaquant et la cible, le contrôleur, l'étape, le compteur des Blockers, les bonus de cette bataille et le traitement de dégâts restant. Les Cards/Leaders restent dans les zones ordinaires, sauf un sous-état `resolving` explicitement modélisé pour le Trigger qui, selon la règle 10-1-5-3, n'est momentanément dans aucune zone. Les cartes présentes en Life ou main ne sont jamais révélées dans une projection adverse sans instruction réglementaire.

Les mots-clés et programmes seront admis par métadonnées `CardReview` versionnées et révisées, jamais par recherche dans les textes. La représentation de `block` (numéro de bloc) reste intacte. Un effet requis mais absent/inconnu empêche la définition d'être certifiée jouable ; il n'est jamais ignoré.

## Choix de conception

1. **Recommandé — BattleState intégré et module de transition interne.** Faible impact sur les API ; responsabilités du combat séparées du runtime des effets ; chaque étape demeure traitée par `applyCommand` et les mécanismes M1.5D. C'est l'architecture retenue.
2. **Tout ajouter dans `core/game.ts` et `effects/runtime.ts`.** Pas de nouveau module, mais augmente le couplage et rend les transitions de combat/effets difficiles à relire. Rejeté.
3. **Créer un moteur de combat ou une API parallèle.** Simplifie le prototype mais duplique l'état, la sérialisation et les règles. Rejeté par les contraintes.

## Cartes de test candidates

Candidates locales et officielles, à revérifier avec carte/FAQ avant activation : ST01-006 Tony Tony.Chopper (Blocker) ; ST01-003 Karoo (Counter Character 1000, sans autre effet) ; ST04-016 Blast Breath (Counter Event, DON!! −1, bonus +4000) ; ST07-007 Charlotte Brûlée (Blocker et Trigger « jouer cette carte ») ; ST01-004 Sanji (Rush conditionnel via DON!! x2) ; OP01-007 Caribou / OP04-003 Usopp / OP05-001 Sabo et OP06-007 Shanks (ON_KO, remplacement, cascade déjà au laboratoire M1.5D). Les profils ST07-007 et ST04-016 ne deviennent pas certifiés avant vérification française/errata/FAQ et implémentation de toutes leurs capacités imprimées.

Les tests couvrent des scénarios réels seulement pour les capacités qui ont des définitions officielles relues. Les fixtures synthétiques couvrent l'ordonnancement/future série, sans être déclarées comme preuves sur une vraie carte. Ni bannissements de tournoi à jour ni tout le catalogue de 2 667 numéros ne sont implicitement certifiés par M2.

## Découpage

- **M2A** : versionnement/restore ; états et commandes d'attaque ; légalité d'attaquant/cible, permissions, Rush/Rush:Character retenus ; repos confirmé ; fenêtres automatiques de déclaration ; comparaison via l'évaluateur ; KO en combat via opérations, remplacements et ON_KO existants.
- **M2B** : Blocker (un maximum, repos, redirection, On Block), Counter Characters répétables, Counter Events avec paiement DON!! −X, coûts alternatifs nécessaires aux cartes retenues, buffs de bataille et choix/reprise privés.
- **M2C** : dégâts Life et règles de visibilité, Banish/Double Attack retenus, résolution entre frappes, Trigger facultatifs et `resolving` hors-zone, traitement de victoire/défaite, deck vide et simultanéités.
- **M2D** : traversée complète, événements/cascades, remplacements/ON_KO, sérialisation à chaque fenêtre, intégration d'une future série fictive, traces de combats réels et validation technique.

Après chaque jalon : tests ciblés, **toute suite complète (234 historiques plus tests M2 déjà ajoutés)**, TypeScript et ESLint ; pas de passage au jalon suivant avant correction ou documentation d'un cas bloquant. En fin de M2 : build dans une copie isolée, vérification des projections, versions/sauvegardes, traces reproductibles et rapports.

## Critère d'arrêt honnête

Le verdict ne peut être `PASS` que si chaque parcours M2 annoncé est implémenté, vérifié par règles officielles, possède des tests et passe toutes les validations. Les coûts alternatifs, effets de combat complexes, remplacements multiples et cartes dont les règles/FAQ manquent restent refusés et donnent `PARTIAL` si le reste avance. Le statut `PLAYABLE_VERIFIED` est attribué seulement si toutes les capacités et restrictions requises de la carte sont exécutables ; les cartes du laboratoire restent non certifiées tant que toutes leurs capacités ne le sont pas.



## Avancement après approbation

- **M2A PARTIAL** : attaque contre Leader/Character, comparaison de puissance, KO, sauvegarde et pont ON_KO M1.5D. Effets On Attack/Rush/restrictions non couverts.
- **M2B PARTIAL** : fenêtres Blocker et Counter Character. Counter Events et coûts DON!! non couverts.
- **M2C PARTIAL** : Life simple, confidentialité et perte après dommage à Life 0. Trigger, Banish, Double Attack et dégâts multiples non couverts.
- **M2D PARTIAL** : scénario synthétique d'intégration KO/ON_KO et reprise JSON ; aucune partie complète fondée sur plusieurs capacités réelles n'est certifiée.
- Vérifications après implémentation : 242/242 tests, TypeScript PASS, ESLint 0 erreur/99 avertissements, build isolé PASS. Détails : [M2_FINAL_REPORT.md](M2_FINAL_REPORT.md).
