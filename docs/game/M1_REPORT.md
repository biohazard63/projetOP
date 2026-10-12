# M1 — Noyau déterministe de préparation

11 octobre 2026. Périmètre livré : préparation jusqu'à l'entrée du premier tour en phase Recharge. Pas d'interface, de partie complète, de raccordement à `/game`, ni de persistance nouvelle.

Les cinq documents demandés ont été lus. Les modifications M0 et les fichiers non committés ont été préservés sur `maintenance/catalog-rebuild`. Aucune base de données connectée ou modifiée ; collections, boosters, coins, decks sauvegardés et interface existante ne sont pas branchés à ce noyau.

## Référence et couverture réglementaire

Document Bandai consulté le 11/10/2026 : [Comprehensive Rules v1.2.1, mise à jour du 28/08/2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf).

| Comportement | Section v1.2.1 | Résultat |
|---|---|---|
| Deux joueurs ; Leader, 50 cartes principales, 10 DON!! | 1-1, 5-1 | PASS |
| Composition, couleurs et copies par numéro | 5-1-2 | PASS |
| Mélange initial ; Leader visible | 5-2-1-2/3 | PASS |
| Désigner celui qui choisit ; choix premier ou second | 5-2-1-4/5 | PASS |
| Main initiale de cinq cartes ; décision du premier joueur d'abord | 5-2-1-6 | PASS |
| Un mulligan complet : retour des cinq cartes, mélange, nouvelle main | 5-2-1-6-1 | PASS |
| Vie après les décisions, selon le Leader ; première carte du deck en bas de Vie | 2-9, 5-2-1-7 | PASS |
| Entrée du premier joueur dans son tour | 5-2-1-8 | PASS |
| Deck/Vie cachés aux deux joueurs, main personnelle visible ; DON deck public | 3-2/3/4/10 | PASS |
| Résolution d'effets « début de partie » | 5-2-1-5-1/2 | NOT_TESTED — cartes correspondantes non admises |
| Recharge, pioche et DON!! du premier/deuxième tour | 6-2/3/4 | NOT_TESTED — aucune transition de tour livrée |

Les commentaires des tests renvoient aux mêmes sections. Les autres règles, FAQ de combat et interactions ne sont pas certifiées par ces résultats.

## API et état

Point d'entrée : `cardgame/src/game/core/index.ts`.

```ts
createGame(input, generator?)              // GameState ou erreur de configuration
applyCommand(state, command, generator?)   // Transition acceptée ou refus explicite
getLegalActions(state, actorId)            // Descripteurs des décisions disponibles
projectState(state, viewerId)              // Vue personnelle ou publique si null
restoreGame(json)                         // Snapshot privé avec contrôle d'invariants
```

`GameInput` contient deux listes de composition, le nombre de DON!!, les définitions/impressions M0 et le ruleset figé. Le résultat conserve 122 instances distinctes, leurs propriétaires/contrôleurs, zones, états et générations de zone. Les instances DON!! sont génériques, sans inventer une illustration ou une référence Prisma.

L'état contient les zones deck, main, Vie, Leader, personnages, Lieu, défausse, deck DON!!, coût, attachements et réserve temporaire. Les zones non utilisées à la préparation restent vides. Les tableaux deck et Vie utilisent l'indice zéro comme sommet. Les phases futures sont typées, mais seules `CHOOSE_FIRST`, `MULLIGAN` et l'entrée dans `REFRESH` sont acceptées à M1.

Le ruleset, les définitions et impressions sont copiés dans le snapshot pour préserver leur révision. Les identifiants réglementaires, graphiques et de base ne sont pas réécrits. Les fonctions publiques copient leurs données avant transition : un refus ou une panne de générateur ne modifie pas l'état initial.

### Hasard et choix du premier joueur

Le générateur injecté suit un contrat `id + next(state)` produisant un échantillon et un état suivants. Son implémentation doit être pure. Aucun `Math.random`, horloge, React, DOM, Prisma, WebSocket ou module Node n'est importé par le noyau.

L'implémentation par défaut est `xorshift32-v1`, avec une graine non nulle de 32 bits et un mélange Fisher–Yates. Elle sert aux tests et aux relectures locales ; **elle n'est pas une source cryptographiquement sûre pour un serveur de production**. Le hasard et son état restent privés. Un générateur injecté doit être fourni à la reprise s'il diffère de celui par défaut ; un identifiant d'algorithme différent est refusé.

Un résultat externe de pierre-feuille-ciseaux peut être fourni via `chooserId` par l'appelant de confiance. Sinon, le hasard injecté désigne celui qui choisit ; sa décision `FIRST` ou `SECOND` reste une commande séparée, avant toute main distribuée. Aucun protocole réseau de pierre-feuille-ciseaux n'a été ajouté.

### Effets non implémentés

Le catalogue M0 contient les programmes `giveRestedDon` et `blocker`. Leur structure/timing est contrôlé : ils ne se déclenchent pas pendant la préparation. Les autres programmes et timings, notamment une action de début de partie, sont refusés.

Le noyau prépare ces decks en **scope `SETUP_ONLY`**, avec `automaticPlayReady: false`. Les effets ne sont jamais exécutés. Même une déclaration de capacité dans le ruleset ne permet pas d'étendre les commandes disponibles. Aucune action n'est autorisée après l'entrée dans `REFRESH`. Cela n'abaisse pas le refus d'admission automatique introduit dans M0 : la préparation est séparée d'une autorisation de jouer.

### Informations privées et commandes

La projection fonctionne par liste explicite de champs : aucun registre complet, ordre de deck, contenu de Vie, état aléatoire, catalogue privé ou journal de commandes n'est transmis. La main personnelle seule est projetée ; un spectateur ne voit aucune main. Les événements publics contiennent des types et acteurs, sans identifiant de carte cachée.

Les commandes portent `id`, `actorId` et `expectedVersion`, puis un choix strictement validé. Acteur inconnu, champs supplémentaires, type inconnu, mauvaise phase, mauvaise décision et version périmée sont refusés. Une même clé/acteur et intention répétée ne produit pas de second mulligan ; une intention différente sous cette clé est refusée. Les snapshots publics ne sont pas acceptés par `restoreGame`.

**Limite du noyau pur :** l'identité de l'acteur doit être établie par le futur serveur, et les écritures concurrentes doivent être sérialisées par ce service. Ces fonctions ne constituent pas une authentification ou une transaction PostgreSQL. Les états complets et retours internes d'`applyCommand` sont privés ; utiliser `projectState` avant tout transport.

## Tests exécutés

Depuis `cardgame/` :

```bash
npm run test:game:m1
npm test
npx tsc --noEmit
npx eslint src/game/core tests/game-m1.test.ts
npm run lint
```

Build : `npm run build` dans une copie temporaire actualisée `/private/tmp/mugiwara-managed-build-pwwqpcx8`, avec dépendances locales et sans copie des variables de production. Le `.next` et le serveur du dépôt sont préservés.

| Vérification | Résultat final | Preuve |
|---|---|---|
| Tests M1 | PASS — 17/17 | `evidence/m1/unit.log` |
| Suite complète M0 + M1 + tests existants | PASS — 98/98, zéro échec ou skip | `evidence/m1/tests.log` |
| TypeScript | PASS — sortie 0 | `evidence/m1/typecheck.log`, `validation.json` |
| Lint nouveaux fichiers | PASS — aucune erreur ou alerte | `evidence/m1/core-lint.log` |
| Lint application | PASS — 0 erreur, 99 avertissements existants | `evidence/m1/lint.log` |
| Build production | PASS — sortie 0 | `evidence/m1/build.log` |
| Intégration base / autorisations réseau / concurrence serveur | NOT_TESTED | Aucun service nouveau branché |
| Appareils physiques et UI | NOT_TESTED | Aucune interface créée |

Les 17 tests couvrent configuration, instances/zones, composition invalide, choix premier/second, injection du hasard, mulligan unique et complet, conservation, Vie différente, ordre de Vie, sérialisation/reprise, projection personnelle/spectateur, commandes falsifiées, versions, idempotence, snapshots altérés, rollback RNG et 100 scénarios de graines/mulligans.

Le test de Vie 5/6 utilise un **second Leader synthétique OP99-999 dans les fixtures uniquement**, sans prétendre vérifier une carte officielle supplémentaire. Un test séparé prépare deux decks exclusivement issus des 14 définitions M0 réelles, avec Luffy et Vie 5. Le zéro explicite est également testé avec une fixture, jamais comme valeur par défaut.

Lors du premier passage, un test attendait une erreur de conservation alors que le garde des comptes de zone la détectait plus tôt. Deux erreurs TypeScript de construction de tuple/zones ont aussi été corrigées. Les résultats ci-dessus proviennent des exécutions finales, sans désactivation de contrôle.

## Fichiers concernés

- Créés : `cardgame/src/game/core/{types,random,invariants,game,index}.ts`.
- Créé : `cardgame/tests/game-m1.test.ts`.
- Modifié : `cardgame/package.json`, commande `test:game:m1` uniquement en plus des ajouts M0 conservés ; aucune dépendance nouvelle.
- Documentation : ce rapport, suivi dans `SIMULATOR_ARCHITECTURE.md` / `RULES_OPEN_QUESTIONS.md`, preuves dans `docs/game/evidence/m1/`.

Prisma, scripts d'import/scraper, APIs, interface, collections, coins et logique de boosters inchangés. Aucun commit, push, migration ou déploiement.

## Limites et suite

Le périmètre de préparation demandé est testé. Le jalon M1 plus large de la feuille de route, qui prévoyait aussi les deux premiers tours, reste partiel : aucune boucle de tour n'est annoncée comme opérationnelle.

1. Compléter Recharge → Pioche → DON!! → Principale → Fin, avec exceptions du premier tour, ressources restantes et conservation des instances après chaque transition. Tests des deux premiers tours avant activation.
2. Définir le registre des capacités réellement implémentées, les fenêtres et continuations ; maintenir le blocage des effets de début de partie ou de construction non couverts. Puis combat et effets des jalons M2/M3.
3. Réactualiser les restrictions lorsque la fenêtre M0 expire après le 12/10 ; choisir format/région/blocs avant toute certification compétitive. Le noyau reçoit une date figée, il ne lit pas la date du système.
4. Préparer ultérieurement un hasard sûr, l'autorisation des acteurs, la persistance atomique et les projections réseau. Aucun branchement de l'ancien `/game` avant ces contrôles.
5. Garder le noyau partagé PC/mobile/tablette ; tests de navigateurs et appareils lorsque la présentation sera autorisée.
