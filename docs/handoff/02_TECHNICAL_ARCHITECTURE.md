# 02 — Architecture technique

État observé le 12 octobre 2026. Vérifier chaque contrat dans le code avant extension.

## Application

`cardgame/package.json` définit Next.js `15.5.27`, React `19.1.9`, TypeScript `5.9.2`, Prisma `6.19.3`, NextAuth `5.0.0-beta.32` et Zod `4.0.17`. Node est contraint à `>=22 <25`. L’interface utilise l’App Router (`cardgame/src/app`), les composants (`src/components`) et services (`src/lib`). PostgreSQL est piloté par Prisma. Ces données applicatives sont séparées du moteur de simulation.

## Entrées du moteur

`cardgame/src/game/core/index.ts` exporte les fonctions ci-dessous depuis `core/game.ts` :

- `createGame(input, generator?)` valide deux joueurs, deck/leader/catalogue/ruleset, crée des instances physiques, mélange avec l’état PRNG et produit un état préparé.
- `applyCommand(previous, raw, generator?)` valide une commande et sa version, rejoue les identifiants déjà traités de façon idempotente, clone l’état, route vers effets/combat/tour, capture les capacités déclenchées, contrôle les invariants et retourne une transition discriminée. Les erreurs sont renvoyées comme erreurs de transition.
- `getLegalActions(state, actorId)` expose les commandes admises pour une phase/choix.
- `projectState(state, viewerId)` construit une projection à liste blanche; les mains et options privées ne sont pas sérialisées à l’adversaire.
- `restoreGame(json)` parse et vérifie un état autoritaire JSON; ce n’est pas une API pour accepter une projection client.

`core/types.ts` est la source des `GameState`, `PlayerState`, `Instance`, `BattleState`, `Command`, `LegalAction`, zones et événements. Une instance physique a un identifiant stable, owner/controller, zone, état reposé et `zoneGeneration`; les références de présence s’appuient sur cette génération pour distinguer les changements de zone.

## Effets

- `effects/contracts.ts` définit les schémas Zod versionnés des définitions, conditions, sélecteurs, coûts, programmes, continuations, runtime et registry. Le DSL déclaré dans les profils M3 est `1.3.0`; runtime exige ruleset `1.2.1`.
- `effects/runtime.ts` valide/regroupe les définitions, démarre/reprend des programmes, formule les choix persistants et applique les capacités. Ne stocke pas de callbacks dans les états.
- `effects/scheduler.ts` enregistre les triggers par lot, choisit les triggers en attente et gère le contrôleur actif/les cascades, avec choix d’ordre sérialisable selon le code courant.
- `effects/operations.ts` centralise une partie des opérations confirmées et coûts (repos, déplacement, puissance); certaines branches historiques de combat existent encore et l’unification complète n’est pas prouvée.
- `effects/characteristics.ts` fournit les calculs observés de puissance. N’assume pas un évaluateur exhaustif de toutes les caractéristiques.
- `core/combat.ts` orchestre combat et fenêtres Blocker/Counter/Life. Il dispatch les anciens profils Counter et les nouveaux profils déclaratifs M3.
- `core/turns.ts` gère les tours/phases de base.
- `core/invariants.ts` vérifie la cohérence d’état.
- `core/random.ts` conserve l’état du générateur déterministe sérialisable.

## Cartes et catalogue de simulation

- `cards/types.ts` définit définitions et variantes/printings, textes, capacités requises et statut de jouabilité.
- `cards/adapter.ts` valide/adapte les cartes et compile des définitions.
- `cards/catalogAdapter.ts` adapte un catalogue d’entrée.
- `cards/officialAbilities.ts` contient un petit laboratoire de profils révisés OP06 et ST04, avec références de cartes/FAQ.
- `cards/m3Abilities.ts` ajoute des profils Counter Event et Nami de recherche pour les tests M3. Ils sont nouveaux, non certifiés à nouveau; le statut copié d’un profil historique ne constitue pas une preuve M3.
- `cards/reviewedCards.ts`, `cards/effectPrototype.ts`, `cards/effectScheduling.ts`, `cards/leaderLife.ts` soutiennent les étapes de catalogue/laboratoire.
- `rulesets/decks.ts` valide composition (Leader, 50 cartes, couleur, copies, restrictions) et capacités; `rulesets/m0.ts` fournit un ruleset non compétitif.

## Sérialisation, sécurité et reproductibilité

`GameState` est JSON-compatible et contient notamment l’état RNG, cartes, zones, scheduler, opérations, événements, command IDs, choix et BattleState. Le runtime doit toujours refuser une définition incompatible/incomplète. Ne jamais calculer un résultat côté interface; le serveur autoritaire devra appeler `applyCommand`, persister un snapshot autoritaire et ne retourner que `projectState`.

Les options d’un choix privé sont représentées par des tokens au moteur; les identifiants cachés ne doivent pas fuiter dans les projections adverses. Les tests de restauration ne remplacent pas la validation du stockage/authentification réseau.

## Pas encore établi

Pas de contrat WebSocket intégré à ce noyau, pas de persistence de partie Prisma, pas de compatibilité documentée pour toutes anciennes versions de sauvegarde, et pas de connexion vérifiée du moteur à `/game`. Le runtime actuel ne doit pas être présenté comme un simulateur complet.
