# Traces de résolution M1.5C

Preuve JSON générée par le test « resolution trace records proposed KO… » : [resolution-trace.json](evidence/m1_5c/resolution-trace.json). Données de partie fictive uniquement, sorties réelles de applyCommand. Régénérer depuis cardgame :

```bash
M15C_REPORT_TRACES=1 node --import tsx --test tests/game-m1-5c.test.ts
```

## Shanks OP06-007 → LittleOars EB01-008

1. Bob joue Shanks depuis sa main, paie dix DON actifs par PLAY_CARD. Le noyau confirme CARD_PLAYED.
2. Le même dispatcher capture l'unique ON_PLAY associé à cette présence. Les autres commandes sont bloquées tant qu'un choix attend.
3. Bob choisit LittleOars parmi les Personnages de puissance actuelle <=10000. koCharacter crée une opération KO PROPOSED. Aucun CARD_KO n'existe encore.
4. L'unique remplacement SELF_KO_BY_EFFECT de la victime est admissible : usage non consommé et carte Événement/Lieu payable dans la main d'Alice.
5. La continuation JSON conserve l'opération proposée. Le choix privé n'expose ses cartes qu'à Alice. Bob/spectateur voient uniquement l'attente.
6. Après sauvegarde/relecture, Alice choisit son Lieu. Ce Lieu passe réellement de main à trash ; le KO initial devient REPLACED, TRASH_HAND devient CONFIRMED.
7. Journaux : HAND_CARD_TRASHED, KO_REPLACED, ABILITY_COMPLETED. Aucun CARD_KO ; LittleOars reste en characters ; toujours 122 instances.
8. Rejeu exact de commande : replayed=true, aucune seconde défausse. Nouvelle clé sur ancien choix/version : refus explicite sans mutation.

Si Alice choisit zéro ou ne dispose d'aucun paiement, le KO est CONFIRMED, la victime va à trash, ses DON reviennent épuisés en cost, CARD_KO est produit. L'usage du remplacement n'est consommé que s'il remplace réellement.

La trace interne des opérations n'est pas projetée. La carte défaussée devient publique une fois à trash ; les autres cartes de main ne le deviennent pas. Une opération PROPOSED ne peut figurer dans le journal des opérations traitées ; restauration d'une continuation avec usage déjà consommé refusée.

## Luffy/Nami/Brook

Activation MAIN ou événement CARD_PLAYED → identité de source/zone/usage → choix 0..N DON cost épuisés → si non vide, choix d'un destinataire unique → propositions DON → restrictions/remplacements admissibles → commits DON_MOVED → résolution terminée.

Luffy/Nami consomment leur usage dès l'activation autorisée, même si zéro est choisi. Chaque instance et génération a sa clé propre. Brook ne peut être activé manuellement. Le choix de deux DON n'autorise pas deux destinataires.

## Sunny/Zoro

Sunny valide source et payabilité → REST_SOURCE → choix zéro/un propre Straw Hat Crew → addPower crée un modificateur de présence +1000 THIS_TURN → consultation par evaluateCharacteristics.

Zoro + DON + Sunny : imprimée/base 5000 ; bonus continu +1000 si DON x1 ; bonus DON +1000 propre tour ; temporaire Sunny +1000 ; courant 8000 dans le test. Passage de tour : bonus DON propre tour et temporaire disparaissent, bonus continu demeure jusqu'à retour des DON à Recharge. Aucun cache contradictoire de puissance.

## Limites du journal

DON et KO distinguent formellement propositions/résultats/événements. REST_SOURCE et addPower émettent des événements après mutation mais n'ont pas encore un ProposedOperation unifié avec le pipeline de remplacement. Aucune priorité générale ou pile LIFO n'est inventée. ON_KO et ordonnancement simultané/cascade ne sont pas exécutables dans cette révision.

## M1.5D — traces réellement générées et rejouées

Reproduction depuis `cardgame/` : `node --import tsx scripts/game/trace-m1-5d.ts`. Sortie finale : [final-traces.log](evidence/m1_5d/final-traces.log), 34/34 tests PASS. Chaque trace contient état initial de fixture, commandes, état attendu, opérations et historique ; la reprise par `restoreGame` et `applyCommand` est comparée à l'état final.

- [Simultanés puis cascade](evidence/m1_5d/traces/simultaneous-before-cascade.json) : choix du contrôleur, lot initial terminé avant les nouvelles automatiques.
- [KO confirmé](evidence/m1_5d/traces/ko-confirmed.json) : Shanks → déplacement réel en défausse → capture ON_KO.
- [Cascade/reprise JSON](evidence/m1_5d/traces/ko-cascade-recovery.json) : Caribou et capacités ultérieures, sans duplication.
- [KO empêché](evidence/m1_5d/traces/ko-prevented.json) : Sabo accepté, aucun faux KO ni ON_KO.
- [Future série](evidence/m1_5d/traces/future-set.json) : définition de fixture enregistrée, ordonnanceur existant, sauvegarde/reprise.

Ces fichiers sont des traces autoritaires de tests, contenant des informations privées de fixtures. Ils ne représentent pas les journaux publics envoyés aux joueurs. Les traces antérieures documentent leur jalon historique, et ne constituent pas la couverture M1.5D.
