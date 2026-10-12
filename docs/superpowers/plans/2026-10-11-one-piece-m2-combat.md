# One Piece TCG M2 — implementation plan

> Plan d'exécution natif, jalon par jalon, dans la session autorisée. Chaque sous-jalon possède sa propre validation. Les commits ne toucheront que des fichiers explicitement listés si le statut Git permet de les isoler ; les fichiers non suivis/modifiés avant M2 ne seront jamais inclus par défaut.

**Goal:** Implémenter dans le noyau existant les étapes d'attaque, Blocker, Counter, dégâts Life, Trigger et fin de partie, sans dépendance UI/DB ni second moteur.

**Architecture:** Le `GameState` versionné reçoit un contexte JSON `battle` optionnel. `core/combat.ts` orchestre des transitions invoquées uniquement par `applyCommand` ; le runtime M1.5D garde les effets, opérations, remplacements, choix, événements et projections. Toutes les caractéristiques passent par `evaluateCharacteristics`.

**Tech Stack:** TypeScript strict, Zod existant, Node test runner avec `tsx`. Aucune nouvelle dépendance.

**Spec:** `docs/game/M2_COMBAT_ROADMAP.md`.

## Contraintes globales

- Ruleset de référence : Bandai Comprehensive Rules 1.2.1 (28 août 2026), règles/FAQ et errata officiels vérifiés.
- API `createGame`, `applyCommand`, `getLegalActions`, `projectState`, ordonnancement M1.5D et évaluateur sont conservés.
- Aucun événement d'une proposition annulée ; aucune carte ou aucun DON créé/perdu/dupliqué.
- État persisté en JSON seulement ; continuations sans fonctions ni closures.
- Aucune capacité déduite du texte brut et aucune branche noyau spécifique à un numéro/série.
- Aucun changement de collection, boosters, coins, Prisma/DB, scraper, catalogue maître, decks ou `/game`.
- Pas de push, déploiement ni migration ; build isolé ; serveur local préservé.
- 234 tests actuels sont la base mesurée ; les tests historiques ne sont ni supprimés ni affaiblis.

## Fichiers et interfaces prévus

- Modifier `cardgame/src/game/core/types.ts` : types `BattleState`, `BattleStep`, `CombatCommand`, `battle` nullable, événements de combat et raison de défaite par dégâts.
- Créer `cardgame/src/game/core/combat.ts` : légalité et transitions de l'étape courante ; fonctions internes `combatActions(state, actorId): LegalAction[]`, `applyCombatCommand(state, command): void`, `finishBattle(state): void`.
- Modifier `core/game.ts`, `core/turns.ts`, `core/invariants.ts`, `core/index.ts` : dispatch atomique, actions légales, traitement réglementaire, validation/sérialisation et exports de types.
- Modifier `effects/contracts.ts`, `effects/runtime.ts`, `effects/operations.ts`, `effects/scheduler.ts`, `effects/characteristics.ts` : fenêtres de combat et Trigger versionnées, cohabitant avec le runtime M1.5D.
- Modifier `cards/types.ts`, `cards/adapter.ts` et bundles de tests déclaratifs : métadonnées vérifiées des capacités/mots-clés sans altérer les cartes/IDs maîtres.
- Ajouter tests ciblés `tests/game-m2a.test.ts` à `game-m2d.test.ts` et traces `scripts/game/trace-m2.ts`; créer les rapports M2A/B/C/D/FINAL et preuves `docs/game/evidence/m2/`.

## Review Focus

1. La partie sauvegardée pendant une fenêtre reprend sans payer/rejouer une action — tests de restauration pour chaque étape et chaque choix.
2. Une cible change de zone après déclaration, Blocker, Counter ou Trigger — test d'arrêt prématuré réglementaire, sans faux dégâts/KO.
3. Compteurs de génération/présence, main et Vie masquées — tests `projectState` pour les deux joueurs, événements et erreurs.
4. Double Attack et dégâts multiples pendant lesquels un Trigger modifie le terrain — le montant de dégâts fixé continue conformément au ruling, puis traitement des règles de défaite.
5. Données de carte manquantes, keyword/primitive inconnu ou capacité obligatoire incomplète — carte refusée explicitement, aucune approximation silencieuse.

## Phase 0 — audit, règles, conception et baseline

### Task 0 — baseline et références réglementaires

**Files:** créer `docs/game/M2_COMBAT_ROADMAP.md`, `docs/superpowers/plans/2026-10-11-one-piece-m2-combat.md`, `docs/game/evidence/m2/m2-baseline-tests.log` (journal existant du baseline : `docs/game/evidence/m2-baseline-tests.log`).

- [x] Lire le noyau, rapports et schémas existants ; inventaire de fichiers/entrées/numéros canoniques documenté dans la roadmap.
- [x] Vérifier Rules 1.2.1 : 6-5-6, 7-1-1 à 7-1-5, 8-3, 8-6, 9-2 et 10-1-2 à 10-1-7 ; relever FAQ/errata pour les cartes retenues.
- [x] Exécuter `npm test` dans `cardgame/` ; 234/234 PASS, journal fourni.
- [x] Revue unique utilisateur : approuvée (`ok je valide`). L'implémentation M2A–M2D a été exécutée dans la même session, sans push ni déploiement.

## M2A — attaque et combat contre Character

### Task A1 — état, commandes, versions et actions

- [ ] Écrire tests d'abord : `attack state serializes/restores`, `battle commands only during MAIN with no pending resolution`, `legacy M1.5 state restores with battle null`, `command replay never rests twice`, `one player cannot control opponent battle`.
- [ ] Étendre les schémas stricts avec une version explicite de `BattleState`: `battleId`, `step`, attaquant et cible comme présences, contrôleurs, compteur Blocker, durée/bonuses et données de reprise ; validation stricte dans invariants.
- [ ] Ajouter commandes discriminées : `DECLARE_ATTACK {attackerId,targetId}`, `ACTIVATE_BLOCKER {blockerId}`, `PLAY_COUNTER_CHARACTER {cardId,targetId}`, `PLAY_COUNTER_EVENT {cardId,targetId,donIds}`, `PASS_COUNTER`, `RESOLVE_DAMAGE`, `ANSWER_TRIGGER`. Commandes applicables uniquement via `applyCommand` et idempotence existante.
- [ ] Ajouter `combatActions` à `getLegalActions`; pendant une suspension d'effet, seules les réponses au choix sont légales.
- [ ] Ajouter adaptateur déterministe de restauration pour états 1/2 vers état courant avec `battle:null`, sans modifier le journal ni réinterpréter les effets historiques.
- [ ] Exécuter les tests A1 ciblés, suite complète, `npx tsc --noEmit`, `npm run lint`.

### Task A2 — déclaration et fenêtres d'attaque

- [ ] Tests rouges : premier tour interdit des deux joueurs ; source active Leader/Character uniquement ; Character joué ce tour sans Rush interdit ; `Rush` versus `Rush: Character`; cible adverse Leader ou Character reposé ; target own/active Character refusée ; restriction déclarative testée ; attacker rested par opération confirmée ; génération périmée refusée.
- [ ] Vérifier source officielle et FAQ pour mots-clés retenus. Ajouter une métadonnée keyword déclarative (`RUSH`, `RUSH_CHARACTER`, `UNBLOCKABLE`, etc. uniquement si la couverture requise est prête) à `CardReview`, jamais du parsing anglais.
- [ ] Implémenter repos/événement attaque par `processOperation`, créer `BattleState`, capturer `ATTACK_DECLARED` et `OPPONENT_ATTACK` après événement confirmé, puis reprendre après résolution de l'ordonnanceur.
- [ ] Si attaquant/cible quitte sa zone durant Attack Step, terminer immédiatement le combat (7-1-1-4), sans Block/Counter/Damage.
- [ ] Tests ciblés A2, test de restauration pendant déclaration/choix, puis suite complète, types, lint.

### Task A3 — comparaison, KO en combat et On K.O.

- [ ] Tests rouges : puissance courante/bonus DON via évaluateur ; attaquant plus fort, égalité, moins fort ; cible déplacée avant Damage Step ; KO confirmé via pipeline ; remplacement Sabo empêchant KO ; ON_KO lancé seulement après KO confirmé ; cascades et défense sans faux événements.
- [ ] À Damage Step, comparer exactement `evaluateCharacteristics(state, attacker).power.current` et target ; égalité = victoire attaquante.
- [ ] Character victime de bataille doit être KO, pas déplacé par la procédure de remplacement de terrain ; employer primitive `KO` générique et intégration scheduler déjà existante ; détecter l'interruption avant étape et état stable.
- [ ] Produire une trace de combat contre Character. Pas encore de Life/Blocker/Counter annoncé dans M2A.
- [ ] Tests A3 ciblés, suite complète 234+, types et lint ; rapport `M2A_REPORT.md` avec preuves/règles/limites avant M2B.

## M2B — Blocker et Counter

### Task B1 — Blocker et redirection

- [ ] Tests rouges : Blocker actif adverse et autre que cible ; un seul par bataille ; repos payé une fois ; cible redirigée sans retour après Counter ; Blocker absent/reposé/ami/attaqué lui-même/non autorisé refusé ; `UNBLOCKABLE` empêche le choix si la définition testée est validée ; On Block déclenché après repos.
- [ ] Relire ST01-006/Blocker, ST07-007 et FAQ générales ; `block` (index de bloc) ne sera jamais utilisé pour prouver Blocker.
- [ ] Créer capacité générique `BLOCKER` dans CardReview/registry et activation depuis fenêtre BLOCK par opération REST + mise à jour `battle.target`; scheduler résout On Block avant Counter.
- [ ] Tester changement de zone attaquant/cible et skip réglementaire de l'étape suivante.
- [ ] Ciblés B1, full suite, type, lint.

### Task B2 — Counter Characters et bonus de combat

- [ ] Tests rouges : Counter Characters seulement depuis main ; Counter absent/refus d'une identité invalidée ; valeur imprimée correcte ; plusieurs Counters par défenseur dans n'importe quel ordre ; cible autorisée Leader/Character même si non attaquée (FAQ) ; cartes consommées exactement une fois ; modifier encore actif jusqu'à fin de bataille.
- [ ] Relire un Character sans autres capacités (candidat ST01-003 Karoo) et Counter des cartes imprimées ; données null ou zéro refusées comme valeur de Counter.
- [ ] Défausser via coût/opération confirmés, appliquer le buff via évaluateur avec durée `BATTLE`, fournir actions répétées au défenseur et `PASS_COUNTER` distinct.
- [ ] Après chaque réponse, ne jamais recalculer/annuler le fait que Blocker est devenue cible ; tester sauvegarde/rejeu.
- [ ] Ciblés B2, full suite, type, lint.

### Task B3 — Counter Events et paiements

- [ ] Tests rouges : Event [Counter] uniquement durant Counter Step adverse ; coût DON!! −N choisit le nombre exact parmi cost/attached du joueur ; paiement initialement impossible = pas de coût ni activation ; interruption conserve les coûts réussis mais n'exécute pas le texte ; événement trashed une seule fois ; alternative non prise/refusée correctement ; mauvaise cible et coût non autorisé.
- [ ] Vérifier texte/FAQ/errata d'un Event simple dont l'effet complet est pris en charge (candidat ST04-016 Blast Breath) ; refuser les Event dont d'autres capacités ne sont pas couvertes.
- [ ] Étendre Cost/continuation pour `RETURN_DON` et sélection publique ordonnée ; opérations DON de cost/attached → donDeck atomiques par paiement réel ; appliquer l'Event en tant que définition depuis main via source temporaire/activation déclarative versionnée.
- [ ] Ajouter `COUNTER_EVENT` et le programme déclaratif de bonus de bataille dans le runtime M1.5D ; aucune mutation directe et aucun coût ignoré.
- [ ] Ciblés B3, suite complète, types, lint ; rapport `M2B_REPORT.md` et traces de Blocker/multiples counters/événement.

## M2C — Life, Trigger, dégâts et défaite

### Task C1 — dommages Leader, Life et confidentialité

- [ ] Tests rouges : attaque gagnante/perdante Leader ; blessure enlève uniquement Life du haut ; Life restant passe en main non révélé si Trigger refusé/inexistant ; événement public sans id secret ; Banish met en défausse et n'ouvre pas Trigger ; Double Attack fixe 2 blessures ; Life 0 avant dommage déclenche la condition de défaite au bon traitement ; Life devenant 0 seul ne fait pas perdre.
- [ ] Définir atomiquement le compteur de dommage restant dans `BattleState`, résoudre après éventuelles cascades, conserver l'orientation et l'ordre de Life ; l'attaque de Leader ne produit pas KO.
- [ ] Produire événements révélant l'identité uniquement sur choix Trigger, et utiliser projections autorisées. S'assurer que validation d'erreur ne cite pas l'identité secrète.
- [ ] Ciblés C1, full suite, types, lint.

### Task C2 — Trigger suspendu, reprise et fin de partie

- [ ] Tests rouges : aucun Trigger pour Life déplacé par un effet ; option accepter/refuser privée ; restauration à la décision et au milieu de résolution ; Trigger card hors zone pendant effet puis trash par défaut ; Trigger `PLAY_THIS_CARD` si définition vérifiée ; réponse/rejeu n'attribue pas une deuxième fois ; blessures restantes continuent après Trigger selon dégâts fixés ; double défaite et deck vide.
- [ ] Relire sections 8-6-2-1, 10-1-5 et FAQ. Étendre DSL aux seules primitives Trigger retenues, en gardant événements et coût d'Event distincts.
- [ ] Ajouter état autoritaire `resolving` vérifiable pour l'instance Life, projection publique après révélation, et choix JSON réservé au joueur touché.
- [ ] Étendre `processDefeat`/result reason pour `LEADER_DAMAGED_AT_ZERO_LIFE`; exécuter résolution réglementaire avant état terminal; toutes les conditions simultanées donnent les deux perdants si applicable.
- [ ] Produire rapports et traces M2C pour damage simple, Trigger accepté/refusé, Double Attack et défaite.
- [ ] Ciblés C2, suite complète, types, lint ; rapport `M2C_REPORT.md`.

## M2D — intégration de combat

### Task D1 — pipeline bout en bout et cartes réelles

- [ ] Tests rouges : Attack → On Attack → Blocker/On Block → Counter Character/Event → comparaison → KO/ON_KO ou Life/Trigger → End Battle ; fenêtres sautées si une cible part ; événements simultanés/cascades en ordre M1.5D.
- [ ] Vérifier les textes officiels/FAQ/errata pour chaque vraie définition et chaque capacité, pas seulement mots-clés. Les cartes candidates sont celles de la roadmap ; aucun statut `PLAYABLE_VERIFIED` sans couverture de toutes leurs capacités.
- [ ] Couvrir une interaction interséries réelle (p.ex. Sabo OP05, Shanks OP06, Caribou OP01/Usopp OP04) et un scénario distinct avec Blocker/Counter/Trigger. KO groupés ou remplacements multiples restent explicitement rejetés s'ils ne sont pas certifiés.
- [ ] Ajouter tests d'usage une fois par tour, ciblage devenu invalide, source partie, limite de queue, usage de durée BATTLE, événement de damage non faux, conservation 122 instances et 10 DON par joueur.

### Task D2 — future set et sauvegardes

- [ ] Fixture `TEST-FUTURE-SET` ajoute une définition de Leader/Character avec primitives déjà admises, puis joue une bataille sans branche du noyau sur son code ; comparer exécution continue et sauvegardée/reprise.
- [ ] Test de primitive inconnue/version incompatible : rejet explicite avant mutation, parties historiques restaurables.
- [ ] Sérialiser/reprendre déclaration, ordre d'effets, fenêtre Blocker, après chaque Counter, damage Life, choix Trigger et cascade ; réponses doubles/périmées refusées sans re-paiement.
- [ ] Vérifier `projectState` des deux côtés et erreurs pour fuite de main/Life, choix d'ordre, événement Counter ou carte de Trigger.
- [ ] Générer traces reproductibles seulement depuis tests exécutés dans `docs/game/evidence/m2/`.

### Task D3 — validation finale et rapports

- [ ] Exécuter tests ciblés M2D, suite complète, `npx tsc --noEmit`, `npm run lint`.
- [ ] Reproduire build de production dans copie isolée du checkout, recopier sources/config nécessaires sans `.env`/secrets, vérifier hashes ; préserver serveur local et `.next`.
- [ ] Relire `git status` et diff ; ne toucher aux fichiers hors périmètre. Vérifier anciennes versions/commandes et 234 tests d'historique.
- [ ] Créer `M2A_REPORT.md`, `M2B_REPORT.md`, `M2C_REPORT.md`, `M2D_REPORT.md`, `M2_FINAL_REPORT.md` avec PASS/FAIL/BLOCKED/NOT_TESTED, sources, preuves, limitations et statut des cartes.
- [ ] Verdict global PASS uniquement si chaque critère global est démontré ; sinon PARTIAL/BLOCKED exact. Ne pas commencer M3.

## Références réglementaires à consulter aux tâches concernées

- [Bandai Comprehensive Rules 1.2.1](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=), §§1-2, 6-5-6, 7-1, 8-3, 8-6, 9-1/9-2, 10-1-2 à 10-1-7.
- [Bandai Q&A Rules](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf?20250228=) et [FAQ ST01–ST04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=), puis FAQ de chaque carte/extension réellement activée.
- [Errata officielles Bandai](https://en.onepiece-cardgame.com/rules/errata_card/) et ruleset M0 du dépôt. Une FAQ postérieure ou un erratum prime le texte ancien dans le cadre daté concerné.

## Autorevue du plan

- Tous les items des jalons A–D sont rattachés à une tâche et à des tests nommés ; aucun ne suppose que le catalogue entier est validé.
- Les types et points d'entrée restent cohérents : commandes publiques passent par `applyCommand`, légalité par `getLegalActions`, effets par runtime M1.5D, toutes caractéristiques par évaluateur, état d'écran par `projectState`.
- Les tests review-focus couvrent reprise, changement de zone, confidentialité, dégâts multi-vie/Trigger et définitions invalides.
- Point ambigu laissé au contrôle réglementaire pendant la tâche : toute procédure d'ordonnancement/remplacement simultané au-delà des cas explicitement couverts est refusée et marquée PARTIAL, sans inventer un choix.

## Résultat de l'exécution

Les tâches M2A–M2D ont été tentées ; seules les capacités marquées comme réalisées dans les rapports correspondants sont couvertes. Verdict global **PARTIAL** : Counter Events, Trigger, mots-clés de dégâts multiples, fenêtres automatiques d'attaque/Blocker et certification de cartes complètes manquent. Preuves finales : `docs/game/evidence/m2/`.

