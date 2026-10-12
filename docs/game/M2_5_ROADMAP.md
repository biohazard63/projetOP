# M2.5 — finalisation du moteur de combat

**État : implémentation partielle en cours de validation finale.** Le moteur M1/M1.5/M2 reste unique. Les tests de mots-clés sont synthétiques et ne certifient aucune carte du catalogue.

## Base auditée

- Branche : `maintenance/catalog-rebuild`. Le workspace contient des changements locaux préexistants non suivis (sources M0–M2, données, documents et images); ils sont conservés. Le moteur n'est pas commité.
- Baseline de référence : 242 tests PASS selon M2; la suite relancée pendant cette mission sera enregistrée séparément.
- Combat : `cardgame/src/game/core/combat.ts` possède un flux `BLOCKER → COUNTER → DAMAGE`, des commandes Blocker/Counter Character et dégâts; `DECLARE_ATTACK` repose l'attaquant puis ouvre directement Blocker. Aucune étape Attack/On Block n'est persistée.
- Dispatcher : `core/game.ts` garantit validation, version, replay des commandes, clone transactionnel et projections, mais `capturePlayedEffects` ne capture que `CARD_PLAYED`.
- Effets : `effects/runtime.ts` possède le scheduler sérialisable M1.5D et les opérations validées, mais le DSL actuel limite les timings à `MAIN`, `ON_PLAY`, `ON_KO`, `ON_CHARACTER_KO`; ses opérations ne décrivent pas les Counter Events, Trigger ou dégâts Life. Les définitions d'effets de combat sont donc refusées tant que le contrat et le runtime n'ont pas été étendus.
- Données : `CardReview` ne modélise que `giveRestedDon`, `blocker` ou des liens déclaratifs vers des programmes de laboratoire. Les mots-clés ne sont pas une propriété canonique structurée. `block` est le numéro de bloc, jamais Blocker.
- Modifications protégées : aucune collection, booster, coin, Prisma/base, scraper, catalogue maître, deck utilisateur ou interface `/game` ne sera modifié.

## Règles officielles vérifiées

Source : [Comprehensive Rules Bandai v1.2.1, mise à jour 28 août 2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), version concordante avec `ruleset.rulesVersion`.

| Règle | Base réglementaire | Conséquence moteur |
|---|---|---|
| Attack Step | 7-1-1 | Déclarer et reposer, puis traiter les capacités de déclaration/attaque avant Block; si attaquant ou cible a changé de zone en fin d'étape, terminer la bataille. |
| Block Step | 7-1-2, 10-1-4 | Un seul Blocker; il se repose et remplace la cible; On Block s'active à la suite de l'activation. |
| Counter Step | 7-1-3, 8-3, 10-2-4 | Le défenseur peut activer Counter Character et Events Counter payés puis défaussés, dans l'ordre de son choix et autant que possible; si attaquant/cible quitte sa zone, aller à End of Battle. |
| Damage / Double Attack | 7-1-4, 10-1-2 | Le nombre de dégâts est fixé à Damage; chaque point traite une carte Life, Trigger selon sa fenêtre, et ne gagne pas à soi seul si le nombre de Life est inférieur aux dégâts. |
| Banish | 10-1-3 | Une Life touchée est mise au Trash sans Trigger au lieu d'être ajoutée à la main. |
| Trigger | 10-1-5, 8-6-2 | Lors d'un dégât, le défenseur peut révéler la Life et activer Trigger; durant sa résolution cette carte n'est dans aucune zone, puis va au Trash sauf instruction contraire. Refus : ajout face cachée à la main. |
| Rush | 10-1-1, 10-1-6 | Rush permet d'attaquer au tour où le Character est joué; Rush: Character permet uniquement les Characters adverses. |
| Unblockable | 10-1-7 | Empêche l'activation de Blocker contre l'attaque concernée. |
| Automatiques/cascades | 8-1, 8-6 | Employer le scheduler M1.5D et ses règles actif/non actif, cascades et fenêtres, sans ordre technique de substitution. |
| Défaite | 1-2-1 à 1-2-2, 9-2 | Vie à zéro seule n'est pas défaite; un Leader touché à zéro Life déclenche la défaite au prochain Rule Processing. Deck vide aussi. |

FAQ générale officielle consultée : [Q&A Rules](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf), notamment déplacement attaquant/cible et Counter Step, et Double Attack dont les dégâts restent fixés même si le Character quitte le terrain après le premier dégât. Les FAQ propres aux cartes seront ajoutées aux preuves au moment de leur sélection.

## Matrice lots → modifications

| Lot | Modules | Approche de validation | Refus explicite avant couverture |
|---|---|---|---|
| A — automatiques combat | `core/combat.ts`, `effects/contracts.ts`, `effects/runtime.ts`, `cards/types.ts`, `core/types.ts` | Timing d'attaque/On Block déclaratif, capture après événement confirmé, scheduler avec sérialisation et contrôle de source | Capacité inconnue/texte seul et ordre d'un cas non attesté |
| B — Counter Events | `core/combat.ts`, `cards/types.ts`, `cards/adapter.ts`, runtime opérations | Action `PLAY_COUNTER_EVENT`; sous-ensemble Blast Breath avec paiement imprimé, DON!! −1 facultatif, +4000 de bataille, Event au Trash; impossibilité initiale, interruption et erreur technique distinguées | Autres effets Counter Event, coûts alternatifs/génériques compilés et fenêtres multi-réponses suspendues |
| C — Trigger | `BattleState`, `core/combat.ts`, projection/invariants, contracts/runtime | Sous-état Life en résolution hors zone, choix privé, carte visible seulement au propriétaire avant révélation, continuation JSON | Trigger libre non compilé, effet avec primitive inconnue |
| D — mots-clés | `CardReview`/définitions labo, évaluation des mots-clés au point de combat | Rush/Rush: Character, Double Attack, Banish déclarés comme métadonnées versionnées; blessures fixées avant Trigger | Mots-clés absents des métadonnées ou combinaisons non vérifiées |
| E — interruptions | `BattleState`, transitions combat/opérations | Contrôle des présences en fin de chaque fenêtre; sortie attaquant/cible mène à End of Battle; annulations uniquement si événement confirmé et règle connue | Remplacements concurrents/KO multiples tant que la procédure n'est pas définie |
| F — interséries | laboratoire de cartes dans `cards/`, fixtures `TEST-FUTURE-SET`, tests et traces | Au moins deux familles réelles sélectionnées à partir de la Card List/FAQ officielles; aucune branche série dans le moteur | Toute candidate dont une capacité obligatoire est incomplète reste non certifiée |

## Résultat réellement implémenté dans cette session

- Métadonnées versionnées `CardReview.combatKeywords` et validation de l'allowlist dans l'adaptateur.
- Rush et Rush: Character autorisent l'attaque le tour d'entrée, tout en conservant la restriction du premier tour et les autres vérifications. Rush: Character ne peut viser qu'un Character.
- Unblockable retire Blocker des actions légales et la commande Blocker est rejetée si elle est forgée.
- Double Attack traite deux dommages Life lors d'une réussite contre Leader; Banish envoie la Life au Trash et ne déclenche pas Trigger.
- Une attaque sans Banish dont une Life concernée contient du texte Trigger est refusée avec `TRIGGER_RESOLUTION_NOT_IMPLEMENTED`; l'état est atomiquement inchangé.
- Les tests M2.5 restent des fixtures synthétiques : aucune carte nouvelle n'est certifiée `PLAYABLE_VERIFIED`.
- L'étape d'attaque n'est pas persistée vide. Après l'événement ATTACK_DECLARED, si aucun effet ne suspend le traitement, le combat entre dans BLOCKER; cette décision respecte le déroulement d'Attack Step §7-1-1 sans inventer une pause d'interface.
- Aucun événement `WHEN_ATTACKING`/`ON_BLOCK` ni Trigger n'est exécuté par le moteur à ce stade.
- Le Counter Event ST04-016 Blast Breath est couvert sur son sous-ensemble vérifié; les autres Counter Events ne sont pas certifiés.

## Mise à jour de reprise

- `PLAY_COUNTER_EVENT` prend en charge Blast Breath (ST04-016) : paiement imprimé d'un DON!!, DON!! −1 facultatif, cible alliée et +4000 durant la bataille, puis mise au Trash.
- Le test démontre le refus sans mutation d'un coût initialement impossible. Il démontre aussi une interruption après un paiement confirmé : ce paiement reste acquis, le DON!! suivant est empêché et l'Event reste en main sans effet.
- Validation après reprise : 248/248 tests, TypeScript PASS, ESLint 0 erreur / 99 avertissements préexistants, build isolé PASS et `git diff --check` PASS.
- M2.5 demeure PARTIAL : les capacités automatiques de combat, Trigger, les interactions interséries et les autres familles Counter Event restent manquants.

## Plan d'exécution

1. Baseline vérifiée : 242 tests; l'attente d'une étape Attack persistante a été retirée comme non fondée.
2. Introduire le contexte de combat versionné avec étapes d'automatiques, Counter Event, résolution Life et End of Battle, en restaurant les anciennes sauvegardes sans nouveau champ.
3. Brancher les événements ATTACK_DECLARED/BLOCKER_ACTIVATED et événements confirmés de combat vers M1.5D; ajouter définitions et tests réelles après vérification officielle.
4. Ajouter Counter Event générique, paiement DON!! standard puis DON!! −X; différencier impossibilité initiale, interruption réglementaire et erreur technique atomique.
5. Ajouter Trigger facultatif et privé avec continuation JSON/reprise; couvrir plusieurs dommages et la séquence d'un Double Attack.
6. Permissions et résolution limitée de Rush/Rush: Character, Double Attack, Banish et Unblockable via métadonnées déclaratives; refuser les Triggers non résolus.
7. Ajouter interruptions de combat et refus explicites pour KO multiples/remplacements simultanés ambigus.
8. Construire des fixtures exécutables multi-séries et `TEST-FUTURE-SET`, puis matrice des capacités certifiables.
9. Exécuter après chaque lot tests ciblés + suite complète + TypeScript + ESLint; à la fin build isolé, sécurité des projections, sérialisation, `git diff --check`.

## Critère de verdict

`PASS` n'est autorisé que si les comportements A–F demandés sont réellement exécutables et testés. Une étape non conforme ou seulement représentée par une fixture donne `PARTIAL`. Une règle bloquante ne justifie pas l'abandon des autres lots indépendants. Aucun statut `PLAYABLE_VERIFIED` n'est ajouté sans toutes les capacités obligatoires d'une carte.

## Références à conserver

- Règles officielles : https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf
- Q&A officielle : https://en.onepiece-cardgame.com/pdf/qa_rules.pdf
- Règles en vigueur ici : `rulesVersion: 1.2.1`.
