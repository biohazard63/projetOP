# M4 — Première partie jouable contre un bot sur mobile

Date : 12 octobre 2026. Base : commit M3 `345005e`, branche `feature/tcg-engine-m3-complete`. Le travail M4 n'est **pas commité** (aucune autorisation de commit pour ce lot). Aucun push, aucun déploiement, aucune opération sur la base de production ni sur la base de développement locale.

Verdict : **lots C1, C2, I1, I2, I3, I4 et I5 livrés**. Une partie complète contre le bot se joue au toucher dans un navigateur mobile (Chrome, viewport 390 × 844, tactile), jusqu'à une victoire ou une défaite. Les limites réelles sont listées à la fin.

## Lots

| Lot | Contenu livré | Preuve |
|---|---|---|
| C1 | `src/game/cards/certification.ts` : certification par révision (`definitionId` exact), liée aux sources revérifiées, aux capacités exécutables et aux titres de tests réels. `effectiveStatus` est la seule source de `PLAYABLE_VERIFIED` : le champ historique `playabilityStatus` ne certifie rien. | `tests/game-m4-certification.test.ts` |
| C2 | 23 révisions certifiées (11 Personnages rouges M0, dont ST01-006 [Blocker], et 12 cartes violettes M3, dont ST04-011 [Blocker]). Chaque carte est jouée pour son coût imprimé, attaque avec sa puissance imprimée et contre avec sa valeur ; les bloqueurs redirigent une vraie attaque. **P-015 est bloquée** pour conflit de données : Bandai donne *Wisdom*, la révision M0 *STRIKE*. | même fichier ; comparaison automatique des champs avec la liste officielle du 12/10/2026 |
| I1 | Commande moteur `CONCEDE` (CR §1-2-3/§1-2-4) : disponible à tout moment d'une partie, jamais listée comme action, non remplaçable, idempotente, contrôlée par les invariants. Graine serveur `createSecureSeed` (`crypto.randomInt`). | `tests/game-m4-engine.test.ts` |
| I2 | `src/lib/engine/catalog.ts` : pont des lignes Prisma `Card` vers les définitions revues (`::standard`, illustrations alternatives `::_pN`), conflits signalés et jamais résolus en silence. `decks.ts` : 3 decks de référence et éligibilité qui rejoue les contrôles réels de `createGame`. Bot déplacé dans `bot.ts` (trace M3 inchangée, SHA `08131cc…`). | `tests/game-m4-play.test.ts` (test I2) |
| I3 | Modèles Prisma `EngineGame` et `EngineCommand` ; migration additive `20261012120000_engine_games`. `repository.ts` : mises à jour conditionnelles sur la version (compare-and-set), une partie active par utilisateur, journal des commandes `(gameId, commandId)` unique. | `tests/play.integration.ts` sur PostgreSQL isolé |
| I4 | Routes `/api/play/decks`, `/api/play/games`, `/api/play/games/active`, `/api/play/games/:id`, `/api/play/games/:id/commands` et `/api/play/games/:id/concede`. Session obligatoire ; le siège est fixé par le serveur ; les intentions avec `actorId`, `id` ou `expectedVersion` sont refusées ; `409` pour une version obsolète ou un identifiant réutilisé ; limitation de débit ; `Cache-Control: no-store` ; bot joué côté serveur. | `tests/game-m4-play.test.ts`, test navigateur |
| I5 | Parcours `/play` mobile : choix du deck, tirage du premier joueur, mulligan, plateau plein écran, main en bandeau avec défilement magnétique, fenêtres de Blocker, de Counter, de Trigger et de choix, actions contextuelles par carte, retours d'événements, reprise après rafraîchissement, menu d'abandon, écran de fin. | `tests/game-m4-ui.test.ts`, `tests/play-mobile.browser.mjs` |

## Confidentialité et sécurité

- Le navigateur reçoit uniquement la vue `playerView` :
  - la projection du moteur pour le siège humain ;
  - ses actions légales ;
  - les données d'affichage des cartes que cette projection nomme déjà ;
  - deux exceptions légitimes : les cartes de son propre deck qu'un effet lui fait regarder (recherche), et sa propre carte de Life qui part en main avec un [Trigger] (CR §4-6-3).
- Ne quittent **jamais** le serveur : `GameState`, PRNG, graine, catalogue, registre, journal de commandes, zones cachées.
- Contrôlé par trois moyens :
  - des tests qui interdisent ces clés et identifiants dans chaque vue ;
  - l'inspection de toutes les réponses réseau `/api/play` dans le test navigateur ;
  - une partie complète menée par le service, avec contrôle après chaque commande.
- Une partie d'un autre utilisateur répond exactement comme une partie inexistante (`404`).
- La collection, les boosters, les coins et les decks ne sont jamais écrits par le jeu. Le test navigateur vérifie les compteurs en base.

## Migration Prisma

- **Fichier** : `cardgame/prisma/migrations/20261012120000_engine_games/migration.sql`, généré par `prisma migrate diff` depuis les migrations existantes.
- **Contenu, strictement additif** : `CREATE TABLE` ×2, `CREATE INDEX` ×3, `ADD FOREIGN KEY` ×2. Aucun `DROP` ni `ALTER` de table existante.
- **Testée** sur une instance PostgreSQL 16 temporaire et isolée (`127.0.0.1:55433`, base `op_play_test`, créée par `initdb` dans le dossier temporaire de la session) :
  - `prisma migrate deploy` applique les 20 migrations ;
  - `migrate status` indique que le schéma est à jour ;
  - aucune dérive entre le schéma et les migrations.
- **Non appliquée** à la base de développement locale (`localhost` du `.env`) ni à la production.

## Résultats

| Contrôle | Résultat |
|---|---|
| `npm test` | **332/332 PASS**, 0 skip, 0 todo (`evidence/m4/m4-final-tests.log`) |
| `npm run typecheck` | PASS |
| `npm run lint` | 0 erreur, 99 avertissements (déjà présents) |
| Build de production isolé (copie sans `.env`, base temporaire) | PASS (`evidence/m4/m4-isolated-build.log`) |
| `tests/play.integration.ts` (PostgreSQL isolé) | **3/3 PASS** |
| `tests/play-mobile.browser.mjs` (Chrome réel en headless, 390 × 844 @3x, `isMobile` + `hasTouch`, serveur de production isolé) | **10/10 PASS**, exécution finale du 12/10/2026 à 13:40 (`evidence/m4/browser/results.json`, captures 01 à 10) |
| Trace M3 régénérée après refactorisation | identique (SHA `08131cca…`) |

## Parcours navigateur (résultats réellement obtenus)

Exécution finale : 10 contrôles sur 10, code de sortie 0. Le build et le serveur de production sont isolés, avec une base temporaire et de nouveaux utilisateurs.

| Vérification demandée | Résultat observé | Preuve |
|---|---|---|
| Une partie atteint une victoire ou une défaite depuis `/play` | Deux parties complètes jouées au toucher, deck violet puis deck rouge, terminées par « **Défaite** — Leader touché sans carte de Vie ». Une troisième partie, abandonnée depuis le menu, affiche « Défaite — Abandon ». **L'écran « Victoire » n'a pas été obtenu dans le navigateur** : le bot a gagné les deux parties. La victoire humaine est vérifiée seulement au niveau du service (`game-m4-play`). | `07-result.png`, `08-result-red.png`, `10-conceded.png` |
| Toucher | 17 cartes jouées au toucher, chacune apparue sur le terrain. Ont aussi été utilisés au toucher : attaques et choix de cible, blocage, Counter, Kaido DON!! −7, choix de cartes et d'ordre, [Trigger], résolution, poursuite des dégâts, mulligan, premier joueur, menu et abandon. | `results.json` (`usedControls`) |
| Défilement de la main | Geste tactile réel (`Input.synthesizeScrollGesture`, source `touch`) : le bandeau défile. | contrôle 3, `04-board-turn-1.png` |
| Choix de cartes | Fenêtres de sélection et d'ordre résolues depuis l'écran, ainsi que la fenêtre de [Trigger] avec la carte de Life du joueur (OP06-013). | `09-trigger.png` |
| Reprise après rafraîchissement | Rechargement de la page en cours de partie : même version, même tour, partie poursuivie jusqu'à son terme. | `06-after-refresh.png` |
| Aucune fuite | Toutes les réponses `/api/play` interceptées sont `no-store` et ne contiennent ni `random`, ni `seed`, ni `instances`, ni `zones`, ni `registry`, ni `catalog`, ni `commands`. | contrôle 7 |
| Accès | Anonyme : `401`. Autre utilisateur : `404` en lecture comme en commande. | contrôle 9 |
| Collection préservée | Après les parties, aucune carte, aucun deck ni aucune transaction de coins pour le joueur ; ses parties sont toutes `FINISHED`. | contrôle 10 |

### Lenteur constatée : un défaut du test, pas du jeu

Une exécution intermédiaire a semblé bloquée. Diagnostic en base : la partie attendait une décision humaine, et aucune commande n'arrivait depuis plusieurs minutes. L'interface proposait correctement « Jouer (coût 6) en remplaçant… » (terrain de cinq Personnages), mais la boucle du test ne savait pas répondre à la fenêtre « Personnage à remplacer », la refermait et recommençait. Le test gère désormais ce cas.

Lors de l'exécution finale, aucun remplacement ne s'est présenté (`replacements: 0`). Ce parcours n'est donc **pas** validé par le passage final ; il est seulement couvert par la logique du modèle d'écran.

### Défauts d'interface trouvés par le test navigateur et corrigés

1. Le plateau passait sous la navigation de l'application, à cause d'un contexte d'empilement parent : le bouton « Fin du tour » ne recevait pas les touchers. Correction : portail vers `<body>`.
2. Les illustrations Bandai étaient bloquées par `Cross-Origin-Resource-Policy: same-site`. Correction : `next/image` passe par l'optimiseur du même domaine, déjà autorisé dans `next.config.js`.
3. En thème clair, les textes et les boutons secondaires étaient illisibles. Correction : palette de nuit locale à `/play`.

## Decks utilisables

1. **Kaido — Animal Kingdom Pirates** (violet, référence M3).
2. **Luffy — Interséries** (rouge, référence M3).
3. **Luffy — Équipage** (rouge, composé surtout de cartes certifiées).
4. **Decks de l'utilisateur** s'ils ne contiennent que des cartes du catalogue moteur (35 numéros) dont les données Prisma concordent. Sinon, la raison s'affiche (« contient des cartes que le moteur ne sait pas encore jouer », etc.).

Le bot joue le deck violet contre un deck rouge, et le deck rouge de référence contre un deck violet.

## Limites réelles

- **Pool jouable** : 35 numéros de carte, 23 révisions certifiées. La plupart des decks de collection seront refusés.
- **Pas de joueur contre joueur** : un seul adversaire, le bot serveur déterministe de M3. C'est un pilote de règles, pas une intelligence artificielle stratégique.
- **Illustrations alternatives** : le pont les accepte, mais l'affichage utilise l'illustration officielle de base du numéro.
- **Fenêtre de choix générique** : elle indique le nombre de cartes à choisir, sans le nom de la capacité qui le demande (la projection ne le transmet pas).
- **Tours du bot** : ils sont résolus dans la même requête. Leurs événements s'affichent dans le fil de la partie, sans animation pas à pas de chaque action.
- **Interface tactile** : validée dans Chrome headless avec émulation tactile (toucher, défilement par geste) ; **pas sur un appareil iOS ou Android physique, ni dans Safari**.
- **Mise en page** : le plateau plein écran est portalisé devant la navigation de l'application ; `/game` historique est intact.
- **Limitation de débit** : en mémoire du processus, comme le reste de l'application. Insuffisante avec plusieurs instances serveur.
- **Inactivité et historique** : pas de délai d'inactivité ; pas d'écriture dans `GameHistory`, dont l'adversaire doit être un `User`.

## Avant un déploiement

1. Autoriser puis appliquer la migration additive sur la base cible, après sauvegarde (`prisma migrate deploy`), et vérifier `migrate status`.
2. Revalider la liste des cartes interdites et restreintes : le ruleset `m3-reviewed-subset-2026-10-12` expire après le 12/10/2026, et le moteur refuse alors les decks (`RESTRICTIONS_OUT_OF_DATE`).
3. Tester sur un iPhone (Safari) et un Android réels.
4. Passer à une limitation de débit partagée (Redis ou base) si plusieurs instances.
5. Décider de l'écriture de l'historique et des statistiques de fin de partie.
6. Revoir les journaux de preuves avant tout push (chemins locaux `/Users/…`).
7. Commiter le travail M4 sur la branche dédiée après revue.
