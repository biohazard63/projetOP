# M1.5D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Exécution proposée : directement dans cette session, après revue de ce plan.

**Goal:** Lever les blocages d'ordonnancement, de paiement et de ON_KO dans le moteur existant.

**Architecture:** Conserver `applyCommand` et l'interpréteur existants. Ajouter deux modules internes ciblés : opérations communes et ordonnanceur JSON. Les règles non vérifiées restent explicitement refusées.

**Tech Stack:** TypeScript, Zod existant, tests Node via tsx ; aucune nouvelle dépendance.

**Spec:** `docs/game/M1_5D_DESIGN.md`, validée avec les trois réserves du demandeur.

## Global Constraints

- API publiques, sérialisation JSON, confidentialité et identités physiques conservées.
- DSL proposée `1.2.0`, moteur `m1.5d-1` ; anciennes versions épinglées, sans mise à niveau silencieuse.
- Aucun changement de collection, boosters, coins, Prisma, base, scraper, catalogue maître, decks utilisateurs ou interface.
- Aucun combat, Counter, Blocker, dégâts de Vie ou Trigger ; aucun M2.
- Aucun push ou déploiement. Build isolé, serveur local préservé.
- Les remplacements simultanés et les KO multiples restent refusés tant que leur procédure n'est pas vérifiée et testée. Sabo est limité à une victime.

## Review Focus

1. Une source quitte puis revient : ne pas réutiliser sa génération ni son ancienne limitation — tâches 2 et 4.
2. Une sauvegarde suspendue est falsifiée : rejeter les références de choix/file incompatibles — tâches 1 et 2.
3. Un paiement possible devient interrompu : conserver les paiements réglementaires, sans exécuter le corps — tâche 3.
4. Un KO est remplacé : aucun ON_KO ni faux événement de KO — tâche 4.
5. Un joueur observe une file adverse : ne pas révéler les options privées ou journaux autoritaires — tâches 2 et 5.

## Tâche 1 — règles vérifiées et contrats versionnés

**Files:** modifier `cardgame/src/game/effects/contracts.ts`, `docs/game/EFFECT_RESOLUTION_SPEC.md` ; créer `cardgame/tests/game-m1-5d.test.ts`.

**Interfaces:** produire les contrats Zod `ScheduledTrigger`, `TriggerBatch`, `SchedulerState`, `OperationOutcome`, `PaymentOutcome` ; étendre les types existants sans dupliquer `GameState`. `PaymentOutcome` distingue `INITIAL_UNPAYABLE`, `PAID`, `INTERRUPTED` ; les erreurs techniques restent des erreurs de transition.

- [ ] Vérifier dans les règles 1.2.1 les sections 8-6, 8-3, 8-1-3 et 10-2-17, puis les FAQ OP10, OP04, OP05 et l'erratum Caribou. Consigner référence, interprétation et test. Ne pas activer un ordre général sans justification ; une ambiguïté impose une limite explicite.
- [ ] Ajouter les tests `legacy registries retain their behavior`, `reject incompatible scheduler version`, `reject malformed suspended queue`, `serialize versioned trigger and payment state` : anciennes définitions acceptées, versions inconnues rejetées, aller-retour JSON identique.
- [ ] Exécuter `node --import tsx --test tests/game-m1-5d.test.ts` depuis `cardgame/` ; constater l'échec des nouveaux contrats avant implémentation.
- [ ] Implémenter les schémas stricts, ON_KO limité à DSL 1.2, choix d'ordre distinct des choix de cartes et validation des références.
- [ ] Relancer les tests ciblés puis les tests M1.5B/M1.5C : aucune réinterprétation des sauvegardes historiques.

## Tâche 2 — ordonnanceur intégré et choix d'ordre

**Files:** créer `cardgame/src/game/effects/scheduler.ts` ; modifier `effects/runtime.ts`, `core/game.ts`, `core/types.ts`, les tests de tâche 1.

**Interfaces:** `captureAutomaticTriggers(state: GameState, events: CommittedEvent[]): void`, `advanceScheduler(state: GameState): void`. Ces fonctions sont internes à la copie de travail de `applyCommand`. Le registre fournit les définitions ; aucun callback persistant. Les enregistrements conservent définition/révision, source/génération, contrôleur, cause confirmée et état de résolution.

- [ ] Ajouter les tests `active player batch before non-active`, `controller chooses order`, `initial A B precedes cascade C`, `pending source leaves before activation`, `resumed ordering matches uninterrupted execution`, `private order choice`, `duplicate answer cannot resolve twice`.
- [ ] Exécuter les nouveaux tests et constater leurs échecs sur le noyau actuel.
- [ ] Implémenter les lots sérialisables et l'ordre vérifié en tâche 1. Suspendre lorsque le joueur doit choisir. Différer les nouveaux déclenchements jusqu'à la fin de la résolution courante ; conserver le lot déjà en attente.
- [ ] Raccorder `ANSWER_CHOICE`, la projection et les validations de restauration. Rejeter mauvais joueur, réponse périmée et commande concurrente sans mutation.
- [ ] Vérifier que les refus historiques restent actifs pour leurs versions. Remplacer le refus des simultanés uniquement dans le nouveau chemin couvert.
- [ ] Relancer les tests ciblés, puis tous les tests du moteur. Vérifier conservation des 122 instances et comparaison JSON après reprise.

## Tâche 3 — opérations communes et paiements

**Files:** créer `cardgame/src/game/effects/operations.ts` ; modifier `effects/contracts.ts`, `effects/runtime.ts`, `core/turns.ts`, tests M1.5D.

**Interfaces:** `processOperation(state: GameState, proposal: ProposedOperation): OperationOutcome`, `preflightCosts(state: GameState, cost: Cost, context: EffectContext): PaymentOutcome`, `payCosts(state: GameState, cost: Cost, context: EffectContext): PaymentOutcome`. Adapter les contrats existants en unions versionnées. Les opérations discriminent paiement, effet et traitement réglementaire.

- [ ] Ajouter les tests `rest source produces confirmed operation`, `power modifier uses common pipeline`, `initially impossible composite cost pays nothing`, `interrupted cost retains completed payment`, `technical error leaves original state intact`, `replaced cost does not imply written cost paid`, `unknown alternative cost rejected`.
- [ ] Exécuter les tests : vérifier des échecs fonctionnels, pas seulement des imports manquants.
- [ ] Centraliser validation, restriction, remplacement couvert et confirmation pour repos, DON!!, attachement, puissance, KO et déplacement. Produire événements et traces seulement pour les changements réels.
- [ ] Faire la prévalidation complète des coûts couverts et conserver une progression JSON pour le paiement. L'interruption réglementaire est un résultat normal ; elle n'est pas lancée comme exception technique. Appliquer les limitations selon la règle vérifiée.
- [ ] Raccorder les opérations existantes et les paiements de base concernés. Les coûts alternatifs non exécutables sont explicitement refusés.
- [ ] Relancer tests ciblés et historiques. Vérifier absence de mutation partielle illégale et absence de faux événement après prévention.

## Tâche 4 — ON_KO réels, Sabo et interactions

**Files:** modifier `cards/effectPrototype.ts`, `effects/runtime.ts`, `effects/contracts.ts`, `effects/characteristics.ts` uniquement si nécessaire ; tests M1.5D.

**Interfaces:** définitions déclaratives de Caribou OP01-007, Usopp OP04-003, Sabo OP05-001. Le sélecteur distingue puissance actuelle et puissance de base. Les captures ON_KO sont associées à la confirmation, avec les informations pertinentes figées sur le terrain.

- [ ] Ajouter les tests `Caribou confirmed KO triggers optional target`, `Caribou may choose zero`, `Caribou cascade`, `Usopp checks base not current power`, `Sabo accepted prevents KO and ON_KO`, `Sabo declined allows Usopp ON_KO`, `Sabo once per turn`, `Sabo invalid condition`, `multiple replacements explicitly refused`, `multiple KO targets explicitly refused`.
- [ ] Vérifier que les scénarios réels respectent couleurs, contrôleurs, DON!!, tour et génération ; utiliser Shanks OP06-007 comme source de KO déjà relue. Ne pas remplacer leurs conditions par des fixtures artificiellement favorables non légales.
- [ ] Exécuter les tests et constater les échecs avant ajout des définitions.
- [ ] Implémenter ON_KO générique et remplacement de Sabo pour une victime. Les anciennes capacités LittleOars restent compatibles. Un KO remplacé ne génère aucune capture ON_KO.
- [ ] Vérifier changement de zone et génération après KO : source résolue en défausse, ancienne présence jamais réutilisée sur le terrain.
- [ ] Relancer tests ciblés et suite historique. Conserver la certification restrictive ; ne déclarer aucune carte pleinement jouable.

## Tâche 5 — preuves de compatibilité et validation finale

**Files:** tests M1.5D ; créer `cardgame/scripts/game/trace-m1-5d.ts` ; mettre à jour les documents concernés de `docs/game/` et `M1_5D_REPORT.md`.

**Interfaces:** `trace-m1-5d.ts` utilise les API publiques et des scénarios de tests, produit du JSON reproductible dans `docs/game/evidence/m1_5d/`. Aucun accès DB ni réseau à l'exécution du moteur.

- [ ] Ajouter `future set uses scheduler without core changes`, `unknown primitive rejected`, `old save restores unchanged`, `hidden events absent from opponent projection`, `same inputs produce same trace`, `resume cascade without duplication`.
- [ ] Exécuter les tests avant implémentation des fixtures pour vérifier les échecs attendus.
- [ ] Ajouter la définition `TEST-FUTURE-SET` uniquement aux fixtures, puis générer les traces simultanés/cascade/KO confirmé/KO empêché/reprise/future série depuis les exécutions réelles.
- [ ] Exécuter `node --import tsx --test tests/game-m1-5d.test.ts`, `npm test`, `npx tsc --noEmit`, `npm run lint` ; enregistrer sorties et codes de retour.
- [ ] Préparer une copie temporaire des sources et configurations sans secrets ; vérifier ses empreintes ; exécuter `npm run build` dedans. Ne pas arrêter le serveur ni modifier son `.next`.
- [ ] Contrôler le diff et les fichiers hors périmètre. Documenter nombre de tests, sources officielles, traces, limites, versions et verdict. Critère obligatoire manquant : PARTIAL ou BLOCKED, jamais PASS artificiel.

## Revue du plan

Les trois réserves validées sont portées par les tâches 1/2, 3 et 4. Les sauvegardes, projections et versions sont vérifiées en tâches 1, 2 et 5. Les tests historiques restent une preuve de non-régression distincte des tests nouveaux. Les modifications ne sont pas commencées avant revue de ce plan.

Les commits éventuels doivent cibler uniquement les fichiers de chaque tâche ; le noyau et ses tests sont actuellement non suivis dans Git. Ne pas intégrer aveuglément les fichiers locaux préexistants dans un commit de M1.5D.

## État final d’exécution

Les cinq étapes ont été exécutées dans la session autorisée. Vérification finale : 234 tests PASS, typage/lint/build isolé PASS. Les cases détaillées ci-dessus restent le plan original, pas une affirmation de couverture totale. Voir [M1_5D_REPORT.md](M1_5D_REPORT.md) et [ledger](evidence/m1_5d/EXECUTION_LEDGER.md) pour la couverture effective et les limites justifiant PARTIAL.
