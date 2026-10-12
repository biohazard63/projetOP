# Couverture exécutable M1.5C — 11 octobre 2026

Ce tableau décrit le code exécuté, pas une certification du jeu complet. Bundle laboratoire explicite `prototypeCards()` + `PROTOTYPE_REGISTRY`, moteur existant `applyCommand`, scope BASIC_TURNS, automaticPlayReady=false. Aucun branchement sur /game ou decks persistés.

| Carte | Famille | Capacité couverte | Tests | Certification globale |
|---|---|---|---|---|
| ST01-001 Monkey D. Luffy | Activée | Une fois par tour ; zéro/un DON épuisé de cost vers Leader/Personnage propre | PASS : fenêtres, source, zéro, cible, reprise/rejeu | DATA_VALID_EFFECT_PENDING |
| ST01-007 Nami | Activée | Même primitive ; elle peut se cibler ; usage par présence | PASS : auto-ciblage, deux Nami, limites, erreurs | DATA_VALID_EFFECT_PENDING |
| ST01-011 Brook | Déclenchée | En jouant ; zéro/deux DON épuisés vers un seul destinataire | PASS : CARD_PLAYED confirmé, 0/1/2 DON, activation manuelle refusée | DATA_VALID_EFFECT_PENDING |
| ST01-013 Roronoa Zoro | Continue | DON x1 : +1000, même au tour adverse | PASS : seuil DON, propre/adverse, Recharge, cumul Sunny/DON, projection | DATA_VALID_EFFECT_PENDING |
| ST01-017 Thousand Sunny | Activée/temporaire | Épuiser la source ; zéro/un Leader/Personnage Straw Hat Crew reçoit +1000 pendant ce tour | PASS : paiement, type, mauvais choix, expiration tour | DATA_VALID_EFFECT_PENDING |
| EB01-008 LittleOars Jr. | Remplacement | Une fois par tour, défausser un Événement/Lieu de main au lieu de son KO par effet | PASS : accepter/refuser, absence de paiement, privé, reprise/rejeu, usage | DATA_VALID_EFFECT_PENDING |
| OP06-007 Shanks | Déclenchée | En jouant : KO zéro/un Personnage adverse de puissance actuelle <=10000 | PASS : zéro, KO réel, remplacement, évaluateur central | DATA_VALID_EFFECT_PENDING |

Toutes les clauses d'effet imprimées de ces sept références sont représentées dans le bundle retenu. Leur jouabilité complète n'est PAS certifiée : combat, Counter, ordonnancement général et restrictions de tournoi manquent. Les traductions explicatives du bundle sont non officielles à vérifier, originales conservées.

## Primitives et contrats

DSL/registre/primitives 1.1.0, engine m1.5c-1. Les anciennes définitions DSL1.0.0 et sauvegardes M1/M1.5B conservent leur chemin et passent les 158 tests historiques.

| Chemin | Exécutable | Portée |
|---|---|---|
| giveRestedDon / moveDon | PASS | Primitives M1.5B et restrictions/remplacements synthétiques conservés |
| attachRestedDon | PASS | Présences sélectionnées, cost épuisé, destinataire unique own field, journal DON_MOVED |
| addPower | PASS | Bonus indépendant THIS_TURN sur Leader/Personnage, pas SET_BASE_POWER |
| koCharacter | PASS | Une cible adverse, KO par effet ; remplacement unique SELF_KO_BY_EFFECT |
| REST_SOURCE | PASS | Coût d'activation de Stage actif, payé avant choix |
| SELECT | PASS | Choix JSON successifs ; zéro/plusieurs DON ; privé du défenseur pour remplacement |
| MAIN / ON_PLAY / WHEN_ATTACKING / ON_BLOCK | PARTIAL | Source physique/révision/zone ; ON_PLAY, ATTACK_DECLARED et BLOCKER_ACTIVATED confirmés capturés; définitions synthétiques sérialisables testées. |
| Évaluateur | PASS | Imprimée/base/courante distinctes ; base=imprimée sur ce périmètre ; coût et puissance additifs |
| Simultanés / cascades / ON_KO | NOT_TESTED pour exécution | Admission ou transition explicitement refusée ; tests de refus PASS |
| Plusieurs remplacements admissibles | NOT_TESTED pour résolution | REPLACEMENT_ORDER_NOT_IMPLEMENTED ; refus atomique testé |
| Coûts alternatifs, Life/recherche, modification de base, durées prochain tour | NOT_TESTED | Hors DSL active ; aucune approximation |

Le noyau ne contient aucun numéro de carte ou série dans ses branches métier. Les seuls identifiants de cartes sont dans le bundle déclaratif et les tests. Le cas fictif TEST-FUTURE-SET charge une nouvelle carte, la joue, attribue réellement un DON par un programme enregistré, sérialise et compare deux exécutions déterministes.

## Complément M1.5D

Capacités de laboratoire exécutées : Caribou OP01-007 (ON_KO, puissance actuelle), Usopp OP04-003 (ON_KO, puissance de base), Sabo OP05-001 (remplacement, une victime) ; interaction avec Shanks OP06-007 existant. Le catalogue maître et les révisions M0 sont inchangés. Ces cartes ne sont pas `PLAYABLE_VERIFIED` : combat et jeu complet restent hors couverture.

Le repos de source, les coûts DON explicites des actions de base, les modificateurs temporaires et les déplacements modernes disposent de confirmations communes. Les paiements composés couvrent repos de source et DON ; défausse, retour comme coût et coûts alternatifs ne sont pas exécutés ici. Plusieurs remplacements et KO groupés sont explicitement refusés.
