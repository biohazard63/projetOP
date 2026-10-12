# M5 — Expérience de jeu complète sur `/play`

Date : 12 octobre 2026. Branche `feature/tcg-m5` (créée depuis `feature/tcg-engine-m3-complete`, commit `345005e`). **Rien n'est commité, poussé ni déployé.** Aucune migration n'a été appliquée à une base réelle.

## 1. Statut

| Lot | Statut | Résumé |
|---|---|---|
| M5-1 Refonte visuelle du plateau | **COMPLETE** | Toutes les zones redessinées (direction « nuit pirate »), mises en page téléphone, petit téléphone, tablette et desktop vérifiées sur captures |
| M5-2 Animations et immersion | **COMPLETE** | 15 types d'étapes, dérivés uniquement des événements confirmés, couvrent les 16 animations demandées ; journal de combat ; mode réduit + `prefers-reduced-motion` ; aucun rejeu après rafraîchissement |
| M5-3 Interactions tactiles et ergonomie | **COMPLETE** | Toucher, appui long, glisser main → terrain, DON!! → cible, attaquant → cible, swipe ; fenêtres de décision avec nom de la capacité ; confirmations ; aucune action illégale proposée |
| M5-4 Bots Facile / Normal / Difficile | **COMPLETE** | Stratégies séparées des règles, contexte public uniquement, commandes légales uniquement, 240 parties de tournoi : 0 repli, 0 refus |
| M5-5 Catalogue, tutoriel, statistiques | **COMPLETE (périmètre limité, voir § 10)** | 35 → 331 cartes reconnues, 23 → 116 révisions certifiées ; tutoriel en 8 étapes ; statistiques côté serveur |

**M5 : COMPLETE**, sous réserve des limites du § 10.

> **Rectificatif (12/10/2026, préproduction).** Une version antérieure de ce rapport affirmait que les decks seraient refusés dès le 13/10. C'est faux : `validateEngineDeck` compare deux constantes du ruleset (`date` et `restrictionWindow`), jamais la date du jour, et aucune expiration calendaire n'existait. Depuis, les nouvelles parties utilisent le format permanent `MUGIWARA_FREE` (voir `PREPROD_REPORT.md`).

## 2. Fonctionnalités livrées

- **Plateau** : Leader, Personnages, pile de Vie, deck, défausse, zone DON!! (pile compacte de jetons, actifs et reposés distingués), main défilante, barre d'état (tour, phase, niveau du bot), panneau de combat (puissances en duel, bonus de Counter public, boutons rapides Counter / Blocker / Passer), journal (tiroir sur mobile, colonne permanente sur desktop), menu (mouvement, tutoriel, abandon).
- **Animations** (`src/components/play/anim.ts`) : pioche (face cachée), carte jouée et apparition du Personnage (`fx-play`), DON!! attaché, DON!! reposé, attaque avec désignation de la cible, Blocker, Counter, gain de puissance, dégâts de Vie (face cachée), Trigger, K.O., défausse, capacité, fin de tour, victoire et défaite. Durées de 300 à 900 ms, file non bloquante (le plateau reste utilisable) et bouton pour passer.
- **Pas de rejeu** : dernière séquence affichée en `sessionStorage` (`mugiwara:play:seen:<gameId>`) ; un rafraîchissement n'anime rien.
- **Gestes** (`gestures.ts`) : un seul modèle pointeur pour le tactile et la souris. Tap = détail. Appui long de 450 ms = inspection. Un glissé dans la main ne démarre qu'en montant nettement : le swipe horizontal reste un défilement natif. Un dépôt hors cible légale annule. Une commande n'est envoyée qu'après le dépôt, et une seule fois (`busy` + identifiants de commande idempotents).
- **Fenêtres de décision** : Counter, Blocker, Trigger (carte et texte), recherche / choix de cartes, ordre, remplacement, DON!! −X (confirmation), mulligan, abandon (confirmation), fin de tour avec attaques restantes (confirmation). Le nom et le texte de la capacité source s'affichent (`choiceSource`) seulement si la carte est publique ou dans la main du joueur.
- **Difficulté** : Facile, Normal ou Difficile, choisie avant la partie et stockée en base (`EngineGame.botLevel`).
- **Tutoriel** (`Tutorial.tsx`) : 8 étapes (Leader/Vie, DON!!, jouer, attaquer, Counter, Blocker, fin de tour, victoire). Les étapes d'action n'avancent que sur l'événement serveur correspondant. Il peut être passé ou relancé depuis le menu (préférence `localStorage`).
- **Statistiques** (`GET /api/play/stats`) : parties, victoires, défaites, abandons, par deck et par niveau. Elles sont calculées côté serveur à partir des parties terminées de l'utilisateur ; aucune donnée client n'est prise en compte.
- **Collection** : l'écran de choix affiche le nombre de cartes possédées, reconnues par le moteur et certifiées. C'est une lecture seule de `UserCard`, sans aucune écriture dans la collection, les decks ou les coins, et sans récompense en coins.

## 3. Changements d'architecture

- **Moteur (`src/game/`)**
  - `projectState` publie le bonus de Counter du combat (`battle.counterBonus`, information publique).
  - **Correctif CR §1-2-3** (`effects/runtime.ts`, `pendingVersion`) : un abandon pendant qu'une capacité attend un choix était refusé (`INVALID_EFFECT_CONTINUATION`). Le choix suspendu reste figé et lié à la version exacte de l'abandon ; rien ne se résout après la fin de partie. Ce bug a été trouvé par le test d'intégration PostgreSQL, reproduit de façon déterministe (graine 3, étape 14), puis couvert par `tests/game-m5-concede.test.ts`. Ce test abandonne pour les deux joueurs à chaque état atteint de 6 parties, choix suspendus compris.
  - Aucune logique par numéro de carte. Le mode d'application de M3 est inchangé : la trace M3 reste vérifiée par `npm test`.
- **Catalogue** : `cards/m5Catalog.ts` (révision `m5-2026-10-12`), `rulesets/m5.ts` (`m5-reviewed-subset-2026-10-12`), `src/game/cards/m5-reviewed-cards.json` (sources et méthode ; déplacé depuis `data/onepiece/`, ignoré par Git). `catalog.ts` sépare `m3EngineCatalog()` (figé, 35 définitions) et `engineCatalog()` (331). La certification passe toujours uniquement par `cards/certification.ts`.
- **Bots** (`src/lib/engine/strategy/`) : `context.ts` construit un `BotContext` = projection du siège, actions légales et définitions publiques, rien d'autre. `strategies.ts` contient les 3 niveaux sous forme de réglages. `index.ts` fournit `botDecision`, qui vérifie qu'une action légale correspond à l'intention et sinon se replie sur la première action légale, avec comptage. `playMatch` est borné à 4 000 commandes.
- **Service / HTTP** : `start(deck, botLevel)`, `stats(userId)`, `repository.finished()`, route `/api/play/stats` (no-store, limitation de débit), `decks.collection`, `view.choiceSource`, `view.botLevel`.
- **Prisma** : `EngineGame.botLevel String @default("normal")` + index `(userId, finishedAt)`. Migration additive `20261012180000_engine_bot_level` testée **uniquement** sur la base PostgreSQL temporaire `127.0.0.1:55433/op_play_test`.
- **UI** : `Board.tsx`, `PlayApp.tsx`, `anim.ts`, `gestures.ts`, `Tutorial.tsx`, `model.ts`, `api.ts`, `play.css` (réécrits ou nouveaux). L'ancien `/game` n'a pas été modifié.

## 4. Cartes reconnues et certifiées

| | Avant M5 | Après M5 |
|---|---|---|
| Définitions reconnues par le moteur | 35 | **331** (35 M3 + 296 M5) |
| Révisions certifiées `PLAYABLE_VERIFIED` | 23 | **116** (23 M4 + 93 M5) |

- Les **296 cartes M5** sont des Personnages extraits des listes officielles anglaises (61 séries, en.onepiece-cardgame.com/cardlist), consultées le 12/10/2026 : 257 sans effet (« - ») et 39 dont l'effet est exactement le mot-clé [Blocker] avec son texte de rappel. Ont été exclus : tout [Trigger], tout numéro présent dans l'une des 47 FAQ officielles ou sur la page d'errata, et tout numéro déjà défini. Aucun effet n'a été inventé ; les capacités plus complexes restent hors catalogue.
- Couleurs des 296 : rouge 53, vert 50, bleu 51, violet 40, noir 56, jaune 46.
- **93 certifiées** = cartes M5 monocolores rouges ou violettes, jouables dans un deck légal avec les Leaders de référence. Chacune est jouée dans un deck légal par `tests/game-m5-certification.test.ts`, et la certification est liée à la révision exacte `<numéro>@m5-2026-10-12`. Les autres couleurs sont reconnues (`DATA_VALID_EFFECT_PENDING`) mais pas certifiées, faute de Leader certifié de ces couleurs.

## 5. Bots : résultats comparatifs

Preuve : `evidence/m5/bot-tournament.json` (SHA-256 `3063d5fc…ca9ce83`), script `scripts/game/m5-bot-tournament.ts`. Le script est déterministe et refuse d'écraser une preuve existante. Les 240 parties (6 appariements × 10 graines × 2 attributions de decks × 2 sièges) se sont toutes terminées : **0 repli, 0 commande refusée**.

| Appariement | Parties | Victoires du premier | Tours moyens |
|---|---|---|---|
| Facile vs Normal | 40 | 0 % | 8,7 |
| Facile vs Difficile | 40 | 0 % | 8,1 |
| Normal vs Difficile | 40 | 40 % (Difficile 60 %) | 13,8 |
| Miroirs (×3) | 40 chacun | 50 % | 13,0 – 14,4 |

Comportements mesurés (cumul des appariements mixtes) :

| Action | Facile | Normal | Difficile |
|---|---|---|---|
| Counters (Personnage + Événement) | 0 | 379 | 315 |
| Blockers activés | 0 | 13 | 39 |
| DON!! donnés (Leader / Personnage) | 0 / 0 | 773 / 0 | 133 / 346 |
| Repioches de main (mulligan) | 0 | 0 | 8 |

Le niveau Difficile contre avec la carte suffisante la plus faible, bloque quand la Vie est basse, redistribue ses DON!! vers les attaquants qui en ont besoin et repioche les mains faibles. Coût mesuré : environ 5 à 7 ms par commande, moteur compris (valeur indicative, dépendante de la machine). `tests/game-m5-bots.test.ts` vérifie la confidentialité du contexte, la légalité, l'ordre des niveaux et les différences de comportement.

## 6. Résultats de tests exacts

| Contrôle | Résultat | Preuve |
|---|---|---|
| `npm test` | **346/346 PASS**, 0 skip, 0 todo | `evidence/m5/npm-test.log` |
| `npm run typecheck` | PASS | `evidence/m5/typecheck.log` |
| `npm run lint` | 0 erreur, 99 avertissements (tous antérieurs à M5) ; les 49 fichiers M4/M5 sont sans avertissement | `evidence/m5/lint.log` |
| Build de production isolé (copie rsync sans `.env`) | PASS | `evidence/m5/build.log` |
| `tests/play.integration.ts` (PostgreSQL isolé) | **4/4 PASS**, puis 5 exécutions de suite à 4/4 après le correctif d'abandon | `evidence/m5/integration.log` |
| `tests/play-m5.browser.mjs` | **11/11 PASS** | `evidence/m5/browser/results.json`, `browser.log` |
| Tournoi des bots | 240/240 parties terminées, 0 repli | `evidence/m5/bot-tournament.json` |
| Preuves existantes (41 JSON hors M5) | empreintes SHA-256 identiques avant et après `npm test` | — |

`npm test` couvre tous les `tests/*.test.ts`, dont les nouveaux tests M5 (bots, certification, UI, abandon) ; la trace M3 de référence y reste identique.

## 7. Navigateur : ce qui a réellement été testé

Chrome (headless, `/Applications/Google Chrome.app`) avec émulation d'appareil et événements tactiles CDP, contre le serveur de production isolé. **Ni Safari ni appareil physique n'ont été testés.**

| Scénario | Résultat |
|---|---|
| A. Téléphone 390 × 844 @3 : écran de choix (difficulté, tutoriel, collection, statistiques), tutoriel, appui long → inspection, swipe sans commande, glisser tactile pour jouer, partie complète contre Facile → **Victoire** à l'écran (CPU ×4), rafraîchissement sans rejeu | PASS |
| B. Petit téléphone 360 × 740 : deck violet contre Normal, DON!! −X confirmé, résultat à l'écran | PASS |
| C. Tablette 820 × 1180, `reducedMotion` : aucune animation, jeu jouable, abandon confirmé → **Défaite** à l'écran | PASS |
| D. Desktop 1440 × 900 : journal permanent, clavier (Entrée / Échap), partie complète à la souris | PASS |
| E. Téléphone : **[Trigger]** révélé (vraie partie préparée via `PlayService`, graine fixe) avec carte et texte, activation acceptée par le serveur | PASS |
| Confidentialité : chaque réponse `/api/play/*` est `no-store`, sans `random`, `seed`, `instances`, `zones`, `registry`, `catalog`, `commands` | PASS |
| Statistiques et collection : parties terminées par utilisateur, 0 transaction de coins, 0 `UserCard` créée | PASS |

Contrôles réellement utilisés : `block`, `counter`, `pass`, `trigger`, `choice`, `pick`, `order`, `replace`, `don-minus`, `don-minus-confirm`, `end-turn-confirm`, `concede-confirm`, `keep`, `long-press`, `swipe`, `drag-play-touch`, `drag-play-mouse`, `drag-attack-touch`, `drag-attack-mouse`, `drag-don`, `keyboard`, `refresh`, `tutorial-next`. Accessibilité des boutons vérifiée à chaque largeur (`reachable-360/390/820/1440`).

Animations observées à l'écran lors de la passe finale : `ability`, `attack`, `counter`, `don-attach`, `draw`, `life`, `play`, `power`, `result`, `trigger`, `turn`. Les types `block`, `ko`, `don-rest` et `trash` dépendent du déroulé aléatoire de la partie. Leur production à partir de vraies vues serveur est vérifiée par `game-m5-ui.test.ts` (les 15 types), et ils sont rendus par le même composant `Stage`.

Captures inspectées une par une (`evidence/m5/browser/`) : `phone-01` à `phone-07`, `after-refresh-390`, `small-01/02`, `tablet-01/02/03`, `desktop-01/02`.

## 8. Performances mobiles

Mesurées sur la partie complète du scénario A (Chrome, 390 × 844 @3, CPU ralenti ×4, serveur local) :

| Mesure | Valeur |
|---|---|
| Frames enregistrées | 10 397 |
| Durée de frame p50 / p95 | 17 ms / 17 ms |
| Frames > 50 ms | 2 |
| Longues tâches (`longtask`) | 0 |
| Aller-retour d'une commande p50 / p95 | 85 ms / 118 ms (64 commandes) |

Le serveur était local, sans latence réseau mobile réelle. Ces chiffres ne remplacent pas une mesure sur un appareil physique.

## 9. Problèmes trouvés et corrigés pendant M5

1. **Abandon refusé pendant un choix de capacité** (moteur, voir § 3) : trouvé par l'intégration PostgreSQL, corrigé et couvert par un test de propriété.
2. **Inspection refermée aussitôt** : le `click` généré au relâchement de l'appui long tombait sur la superposition et la fermait. Elle se ferme désormais seulement sur un appui qui commence sur elle, ou avec Échap.
3. **Inspection fantôme à la souris** : un relâchement hors de la carte (re-rendu pendant l'appui) laissait le minuteur d'appui long armé. Un écouteur global du relâchement annule désormais l'appui.
4. **Image d'inspection vide** : chargement paresseux. La taille `lg` est maintenant chargée immédiatement, et le test vérifie que l'image est bien chargée.
5. **Bulle du tutoriel couvrant la main et la zone adverse** : bulle déplacée en haut, rendue compacte sur téléphone, et transparente aux clics hors de ses boutons.
6. **Tiroir du journal fermé mais encore accessible** (« Fermer » invisible ciblé) : le tiroir est maintenant `visibility:hidden` lorsqu'il est fermé.
7. **Terrain débordant sur la main et la barre d'actions** (tablette, desktop) : terrain contenu, tailles de cartes réduites, vérification d'accessibilité ajoutée au test.
8. **Jetons DON!! sur deux lignes** en fin de partie : pile compacte sur une ligne, libellé seulement sur le dernier jeton (les compteurs sont affichés à côté).
9. **Journal vide en début de partie** : ajout des lignes ordre de jeu, main gardée, absence de pioche au premier tour et DON!! reçus.
10. Défauts du test lui-même (sélecteur de la bulle du tutoriel, sortie de boucle en pleine décision du bot) : corrigés sans affaiblir les assertions.

## 10. Limites restantes

- **Format officiel** : `m5-reviewed-subset-2026-10-12` reste un instantané des restrictions du 12/10/2026 ; s'il redevient le format d'une partie, il faudra relire la liste officielle. Les nouvelles parties utilisent `MUGIWARA_FREE`, sans liste officielle.
- **Catalogue élargi mais prudent** : seulement des Personnages sans effet ou avec [Blocker] seul. Les cartes à capacités (On Play, When Attacking, Activate: Main, etc.) ne sont pas ajoutées : chaque texte doit d'abord être traduit dans le DSL et revu. Aucun Événement de Counter supplémentaire n'a été retenu, car les candidats ont tous des clauses en plus.
- **Certification limitée aux couleurs rouge et violette** (Leaders de référence). Les 203 autres cartes M5 sont reconnues sans être certifiées.
- **Pas de Safari ni d'appareil physique** : validation limitée à Chrome avec émulation. Le comportement tactile iOS (appui long, `touch-action`) reste à confirmer.
- **Tablette et desktop** : la bande centrale du plateau reste peu utilisée sur grand écran. C'est fonctionnel et lisible, mais l'espace pourrait être mieux exploité.
- **Animations** : quatre types (`block`, `ko`, `don-rest`, `trash`) sont vérifiés par test de vues réelles, pas par observation dans la passe navigateur finale.
- Le niveau Difficile ne bat Normal que dans 60 % des parties : il n'y a ni anticipation sur plusieurs tours ni recherche.
- Limitation de débit en mémoire : elle n'est pas partagée entre plusieurs instances.
- Les journaux de preuves contiennent des chemins locaux de la machine ; ils sont à relire avant tout push.

## 11. Tester en local

Prérequis : Node 22, dépendances installées dans `cardgame/`, et une base PostgreSQL **isolée** (jamais la base de dev ni de prod).

```bash
# 1. Base temporaire (exemple utilisé pendant M5)
initdb -D <dossier-temp>/data -U mugiwara
pg_ctl -D <dossier-temp>/data -o "-p 55433 -c unix_socket_directories=''" start
createdb -h 127.0.0.1 -p 55433 -U mugiwara op_play_test
cd cardgame
DATABASE_URL="postgresql://mugiwara@127.0.0.1:55433/op_play_test" npx prisma migrate deploy   # base temporaire uniquement

# 2. Build isolé (ne touche pas au .next du workspace)
BUILD_DIR="$(mktemp -d)"; rsync -a --exclude node_modules --exclude .next --exclude '.env' --exclude '.env.*' ./ "$BUILD_DIR/cardgame/"
cd "$BUILD_DIR/cardgame" && npm ci && npm run build
DATABASE_URL="postgresql://mugiwara@127.0.0.1:55433/op_play_test" NEXTAUTH_URL=http://localhost:3007 AUTH_TRUST_HOST=true \
  NEXTAUTH_SECRET="$(openssl rand -hex 32)" npx next start -p 3007

# 3. Tests (depuis cardgame/ du workspace)
npm test && npm run typecheck && npm run lint
DATABASE_URL="postgresql://mugiwara@127.0.0.1:55433/op_play_test" node --import tsx --test tests/play.integration.ts
DATABASE_URL="postgresql://mugiwara@127.0.0.1:55433/op_play_test" node --import tsx tests/play-m5.browser.mjs
npx tsx scripts/game/m5-bot-tournament.ts <nouveau-fichier>.json   # refuse un fichier existant
```

Ensuite, ouvrir http://localhost:3007/play avec un compte créé sur la base temporaire. Pour la vue mobile, utiliser le mode appareil de Chrome (390 × 844).

## 12. Préparation de M6

1. **Autorisations à obtenir** : commit du travail M4 + M5 ; application des migrations `20261012120000_engine_games` et `20261012180000_engine_bot_level` sur une base réelle, après sauvegarde.
2. **Format officiel** (facultatif) : relire la liste officielle des restrictions pour proposer un format distinct de `MUGIWARA_FREE`.
3. **Capacités** : traduire dans le DSL des familles d'effets fréquentes (On Play recherche / pioche, When Attacking +puissance, Activate: Main avec DON!! −X), avec références FAQ, puis certifier par révision.
4. **Leaders** des autres couleurs, pour certifier les 203 cartes M5 reconnues.
5. **Validation sur appareils** : iPhone (Safari) et Android réels, mesures de performance sur réseau mobile.
6. **Joueur contre joueur** (`BattleInvite`) en réutilisant le service autoritaire, puis retrait programmé de l'ancien `/game`.
7. Bot Difficile plus fort (anticipation sur un tour), en gardant le contexte public uniquement.
