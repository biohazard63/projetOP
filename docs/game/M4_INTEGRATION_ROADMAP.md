# M4 — Intégration jouable et certification : audit et feuille de route

Date : 12 octobre 2026. Base : commit `345005e` (branche `feature/tcg-engine-m3-complete`). Ce document est un **plan** : aucune modification de `/game`, de Prisma ou de l'interface n'a été faite.

## 1. Existant dans l'interface

- **`/game`** ([page.tsx](../../cardgame/src/app/game/page.tsx), `/game/select-deck`) et `components/game/*` (environ 4 600 lignes : `GameBoard`, `PlayerField`, `OpponentField`, `Card`, `PhaseActions`, `CardEffectsPanel`, `TestPanel`…).
- Ces composants sont pilotés par les **types historiques** `src/types/game.ts` et par onze routes `/api/game/*` : `initialize`, `play-card`, `attack`, `block`, `next-phase`, `end-turn`, `draw-card`, `mulligan`, `keep-hand`, `execute-effect` (renvoie 501), `start`.
- **Services historiques** `src/lib/game/*` (environ 4 400 lignes) : `manualGameService`, `combatService`, `phaseService`, `donService`, `counterService`, `cardEffectsService`, `gameSimulationService`, `gamePersistenceService`, `testData`…
- **Persistance** dans le modèle Prisma `GameState`, dénormalisé : `playerLife` vaut 4 par défaut, mains et decks sont en `Json[]`.
- **Aucun fichier de l'application n'importe `src/game/`.**

### Défauts du flux historique, à ne pas reproduire

| Défaut | Conséquence |
|---|---|
| `playerId` lu dans le corps de la requête (`play-card` et autres) | Un client peut agir pour l'adversaire. |
| Main adverse générée `isFaceUp: true` et état complet renvoyé au client | Fuite d'informations cachées. |
| Mélanges par `Math.random()` | Ni reproductible ni auditable. |
| Deck adverse tiré au hasard dans tout le catalogue ; adversaire enregistré avec l'id du joueur lui-même | Aucune légalité, pas de vrai second joueur. |
| Effets absents (`execute-effect` → 501) | Mécaniques ignorées. |

**Conclusion :** les services historiques sont à **remplacer, pas à adapter**. Seuls les éléments visuels (`Card`, mise en page des zones) sont réutilisables.

## 2. Moteur disponible

Entrées publiques ([core/index.ts](../../cardgame/src/game/core/index.ts)) : `createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame`.

**Commandes :**
- `CHOOSE_FIRST`, `MULLIGAN`, `ADVANCE_PHASE`, `END_MAIN` ;
- `PLAY_CARD`, `ATTACH_DON`, `START_EFFECT` (`payOptionalCost`, `donMinusIds`), `ANSWER_CHOICE` ;
- `DECLARE_ATTACK`, `ACTIVATE_BLOCKER`, `PASS_BLOCKER`, `PLAY_COUNTER_CHARACTER`, `PLAY_COUNTER_EVENT`, `PASS_COUNTER`, `RESOLVE_BATTLE`, `CONTINUE_LIFE_DAMAGE`, `ANSWER_TRIGGER`.

**Garanties :**
- transitions pures ;
- `expectedVersion` (verrou optimiste) et `id` de commande idempotent ;
- invariants vérifiés à chaque commande ;
- état sérialisable en JSON ;
- projections par joueur, et actions légales par acteur avec jetons opaques pour les cartes cachées.

**Limites :**
- 35 numéros admis par `m3-reviewed-subset-2026-10-12` ;
- pas d'abandon (CR §1-2-3) ni de limite de temps ;
- `seededRandom` est un PRNG de test, son état figure dans `GameState` ;
- état de 247 Ko et projection de 42 Ko en fin de partie de référence ; environ 8 ms par commande, contrôles compris.

## 3. Confidentialité à préserver

- `GameState` ne quitte jamais le serveur : ni API, ni journal, ni log. Il contient l'état du PRNG, qui permettrait de prédire les mélanges, et les zones cachées.
- Le client ne reçoit que `projectState(state, viewerId)` et `getLegalActions(state, viewerId)`.
- `actorId` est toujours dérivé de la session serveur, jamais du corps de la requête.
- La graine est générée côté serveur avec `crypto.randomInt` et n'est jamais exposée avant la fin de la partie.
- Les erreurs sont renvoyées sous forme de codes moteur génériques : pas de trace, pas d'identifiant d'instance cachée.
- Les options de choix référençant une Life, ou la main ou le deck adverses, restent réduites à leur jeton (acquis M3).
- Projection de fin de partie : décider explicitement de ce qui devient public.

## 4. Manques pour une partie complète dans le navigateur

1. **Pont catalogue.** Prisma `Card` (`id`, `code`, `isAltArt`, `isParallel`) doit correspondre à la définition et à l'impression moteur (`printingKey`, `databaseIds`).
   - `catalogAdapter.ts` part d'un instantané de catalogue ; il faut un adaptateur serveur depuis la base, conflits signalés et non masqués.
2. **Éligibilité des decks.** Un deck utilisateur n'est jouable que si toutes ses cartes sont revues et que leurs capacités sont exécutables.
   - Afficher la raison exacte du refus (`NOT_ADMITTED`, `UNSUPPORTED_EFFECT`, etc.).
   - Proposer des decks de référence jouables : violet ST04-001 et rouge ST01-001 de M3.
3. **Persistance dédiée**, distincte de l'ancien `GameState` (migration Prisma à autoriser) :
   - `EngineGame` : `id`, `status`, `rulesetId`, `version`, `state` en JSON côté serveur seulement, sièges, dates ;
   - `EngineCommand` : `gameId`, `seq`, `commandId`, `actorId`, `payload`, `resultVersion`, avec `@@unique([gameId, commandId])` ;
   - mise à jour conditionnelle `WHERE version = expectedVersion`.
4. **Sièges et adversaire.** D'abord un **bot serveur**, à partir de la politique déterministe de `scripts/game/m3-full-game.ts`, isolée en module serveur. Ensuite le joueur contre joueur, via `BattleInvite` existant.
5. **Abandon et inactivité.** Ajouter `CONCEDE` au moteur (CR §1-2-3 : défaite immédiate, non remplaçable), puis une politique de délai côté service.
6. **Interface pour chaque `LegalAction` :**
   - fenêtres de bloqueur, de Counter et de Trigger ;
   - choix `SELECT`/`ORDER` et options à jeton seul ;
   - sélection des DON!! pour DON!! −X ;
   - paiement Life facultatif ;
   - continuation des dégâts de Life, fin de partie.
7. **Transport.** Interrogation par numéro de version (`GET …?since=version`), puis SSE. Envoyer les événements de façon incrémentale plutôt que tout le journal.
8. **Fin de partie.** Écrire un historique. `GameHistory.opponentId` est une clé étrangère vers `User`, donc un bot impose un choix de modèle.
9. **Messages** : traduction des codes d'erreur moteur en français.

## 5. Architecture recommandée

```
Navigateur (/play, client)  ──fetch──▶  Route handlers Next.js (runtime node, 'server-only')
   rendu depuis projection + actions          │ auth() → actorId ; validation zod de l'intention
                                              ▼
                          src/lib/engine/ (service serveur, nouveau)
                          ├─ catalog.ts   Prisma Card ⇄ definitions/printings (lecture seule)
                          ├─ decks.ts     Deck/DeckCard → DeckEntry + éligibilité (lecture seule)
                          ├─ sessions.ts  create / load / applyIntent (CAS sur version)
                          ├─ bot.ts       politique déterministe pour le siège bot
                          └─ projection.ts  projectState + getLegalActions du seul viewer
                                              │
                                              ▼
                          src/game/ (moteur pur, inchangé par l'intégration)
                                              │
                                              ▼
                          Prisma : EngineGame + EngineCommand (nouveaux)
```

- **Nouvelle route `/play`**, derrière un indicateur de fonctionnalité. `/game` et `/api/game/*` restent intacts jusqu'à la bascule, puis seront retirés dans un lot séparé et validé.
- **API :**
  - `POST /api/play/games` : `deckId` ou deck de référence, choix du bot ;
  - `GET /api/play/games/:id` : renvoie `{ version, projection, legalActions }` ;
  - `POST /api/play/games/:id/commands` : `{ id, expectedVersion, intent }` → nouvelle projection ; `409` en cas de version obsolète, `422` en cas de refus du moteur.
- **Tours du bot** joués côté serveur après chaque commande humaine, dans la même transaction logique, avec une limite de pas.

## 6. Préservation de la collection, des boosters, des coins et des decks

- Accès en **lecture seule** à `Card`, `Deck`, `DeckVersion` et `DeckCard`. Aucune écriture dans `UserCard`, `Booster*` ou `CoinTransaction`.
- Aucune récompense en coins liée au jeu dans ce lot, conformément à la priorité « monnaie gagnable par la collection, sans dépendre du jeu ».
- Le deck-builder reste la source des decks ; le jeu ne fait que calculer l'éligibilité.
- La PWA et le mode hors ligne public ne doivent pas mettre en cache les routes `/api/play` : à vérifier avec `pwa-policy.test.ts`.

## 7. Feuille de route

Les deux pistes avancent en parallèle : **I** (intégration) et **C** (certification). Chaque lot respecte la discipline M3 : tests avant et après, preuves, rapport, aucune certification sans preuve.

| Lot | Contenu | Dépendances | Critère de sortie |
|---|---|---|---|
| **C1** | Modèle de certification par révision : liste de contrôle texte, FAQ, errata, capacités et tests, preuve attachée | — | Tests empêchant tout statut hérité ; rapport |
| **C2** | Certifier les 12 cartes sans effet et Black Maria du deck violet, puis les cartes sans effet du deck rouge | C1 | `PLAYABLE_VERIFIED` uniquement avec preuve ; matrice à jour |
| **I1** | Moteur : commande `CONCEDE` (CR §1-2-3), projection incrémentale des événements, PRNG de production à graine serveur | — | Tests unitaires, tests M3 inchangés et verts |
| **I2** | `src/lib/engine/catalog.ts` + `decks.ts` : pont Prisma→moteur, éligibilité, decks de référence | I1 | Tests sur fixtures, sans écriture en base ; conflits signalés |
| **I3** | Schéma `EngineGame` / `EngineCommand` (**migration à autoriser**), `sessions.ts` avec verrou optimiste | I2 + autorisation | Tests d'intégration en base de test ; aucun impact sur l'ancien `GameState` |
| **I4** | Routes `/api/play/*`, acteur pris dans la session, bot serveur, codes d'erreur | I3 | Tests de route : usurpation d'acteur refusée, version obsolète, idempotence, aucune fuite |
| **I5** | Interface `/play` mobile d'abord, à partir de la projection et des actions légales ; toutes les fenêtres d'action | I4 | Partie complète jouée au navigateur contre le bot, deck violet ou rouge, test navigateur |
| **C3** | Certifier les capacités déjà exécutables (Kaido, Blast Breath, ST01-001/007, OP06-xxx, OP01-016…) avec scénarios réels | C2 | Une preuve par carte |
| **I6** | Joueur contre joueur (`BattleInvite`), SSE, historique de fin de partie, retrait programmé de `/game` historique | I5 | Décision produit ; deux sessions réelles |
| **C4** | Extension du pool : choix des cartes et des decks prioritaires, nouvelles primitives au cas par cas | C3 | Pas de branche par numéro de carte dans le noyau |

## 8. Risques d'intégration

1. **Migration Prisma obligatoire** pour une persistance correcte. Sans autorisation, I3 et la suite sont bloqués.
2. **Pool jouable réduit (35 numéros).** La plupart des decks utilisateurs seront inéligibles au début. Il faut l'expliquer dans l'interface et prioriser C2 à C4.
3. **Coexistence avec l'ancien `/game`.** Noms proches (`GameState` Prisma et `GameState` moteur, types `src/types/game.ts`) : il faut un espace de noms distinct (`/play`, `EngineGame`) pour éviter les confusions.
4. **Concurrence.** Sans mise à jour conditionnelle en base, deux onglets pourraient écraser l'état. L'idempotence du noyau ne suffit pas sans verrou de persistance.
5. **Taille et coût.** Environ 250 Ko d'état par partie, et la projection embarque tout le journal. Prévoir une projection incrémentale et éviter de réécrire tout l'état si la base le permet mal.
6. **PRNG de test** à remplacer, ou au moins à graine serveur secrète, pour qu'un mélange ne soit pas prévisible.
7. **Écarts de catalogue.** La base Prisma peut différer des définitions revues (coût, puissance, Life). L'adaptateur signale des conflits qui ne doivent jamais être résolus en silence.
8. **Abandon et inactivité absents du moteur.** Une partie abandonnée resterait active.
9. **Traces sensibles.** Les journaux de lint des preuves contiennent des chemins locaux (`/Users/…`) et un inventaire M1.5A cite des noms de fichiers d'export de deck. À relire avant tout push vers un dépôt partagé.
