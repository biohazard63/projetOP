# M6 — Rapport d'étape

Date : 12 octobre 2026. Branche `feature/tcg-m5`. Aucun commit, push, déploiement ou accès base de données effectué.

## CURRENT STATE — fin des lots A, B, C (13 octobre 2026, Claude Code) — voir `M6_HANDOFF.md`

- **ST-01 à ST-06 : 102/102 numéros certifiés** (399 définitions, 207 certificats). Decks proposés dans `/play` : `starter-st01`, `starter-st02` (compositions exactes résolues). ST-03..ST-06 : cartes certifiées, decks bloqués par des noms non résolus dans `scripts/rebuildStarterDecks.ts` (correspondances proposées dans `M6_HANDOFF.md`, non appliquées).
- Validation finale réelle : `npm test` 459/459, typecheck PASS, lint 0 erreur / 99 avertissements, build isolé PASS, `git diff --check` PASS, preuves historiques inchangées. Tests navigateur des Starter Decks : **non faits**.

## CURRENT STATE — correction source locale ST (13 octobre 2026)

### Mise à jour après correction utilisateur — composition et ST-02

Les decks sont déjà enregistrés avec leurs quantités dans la base (`DeckCard.quantity`); `scripts/rebuildStarterDecks.ts` contient aussi une liste nominative et quantitative jusqu'à ST-28. L'audit statique de ce script lit 28 entrées de deck; ST-01 et ST-02 listent chacun un Leader (quantité 1) et 50 cartes non-Leader. La liste du script est tronquée avant ST-29..ST-36 et son exécution est destructive (elle supprime/recrée les decks de même nom; `--reset` supprime les decks ST-*). Je ne l'ai pas exécuté. Les données de composition DB n'ont pas été chargées car le PostgreSQL local ne répond pas; aucune base distante n'a été utilisée.

J'ai commencé ST-02 sans test intermédiaire, conformément à la consigne : une définition locale de Killer (`ST02-005`) est déclarée depuis `cardJson`, avec On Play ciblant jusqu'à un Character adverse reposé de coût ≤3 et Trigger jouant cette carte depuis Life. Le sélecteur est générique; aucune branche par carte n'est ajoutée au runtime. Son statut reste `DATA_VALID_EFFECT_PENDING`. **Ces changements ST-02 n'ont pas été testés ni retapés après leur ajout**; les résultats ci-dessous (393 tests, typecheck/lint/build) décrivent le dernier état validé avant cette tranche ST-02.

Source des fiches : uniquement les JSON locaux sous `cardgame/carteJson/`; aucun appel Web ni téléchargement de cartes effectué dans cette tranche. Audit récursif : 59 fichiers JSON, 4 318 lignes, 2 667 numéros canoniques candidats. Sources ST présentes pour ST-01..ST-21 et ST-23..ST-36; ST-22 absent. **Correction importante : les quantités des decks sont déjà stockées en base dans `DeckCard.quantity`, via `DeckVersion`; elles ne figurent simplement pas dans les fichiers de fiches `cardJson`.**

ST-01 compte 17 numéros locaux et 17 présents dans `engineCatalog()` : cinq cartes déjà certifiées et douze profils locaux en attente de certification. Des programmes DSL exécutables couvrent désormais les effets de ST01-001 Luffy Leader, ST01-002 Usopp, ST01-004 Sanji, ST01-005 Jinbe, ST01-007 Nami, ST01-011 Brook, ST01-012 Luffy Personnage, ST01-013 Zoro, ST01-014 Guard Point, ST01-015 Gum-Gum Jet Pistol, ST01-016 Diable Jambe et ST01-017 Thousand Sunny. Cela prouve l'exécution des scénarios testés, pas la couverture exhaustive de toutes les interactions de chaque carte. Le pack projette les caractéristiques et textes depuis `cards-ST-01.json`; aucun texte brut n'est interprété à l'exécution.

Les programmes réutilisent le scheduler/DSL, l'évaluateur et des primitives génériques de restriction Blocker et jeu depuis Trigger. Les tests ciblés couvrent notamment les seuils de DON!!/puissance, restrictions d'attaque, ciblage, coûts, refus, confidentialité et reprises JSON. ST-01 reste partiel : ces profils issus des seules données locales ne disposent pas ici de preuves FAQ/errata et ne sont pas certifiés. **Le schéma confirme que la composition quantitative est conservée dans la base. La tentative de lecture de la base configurée localement n'a pas abouti : PostgreSQL local ne répondait pas sur `localhost:5432`; aucune composition n'a donc été lue ni vérifiée dans cette session.**

Les profils issus uniquement de `cardJson` gardent `faqChecked=false` et `errataChecked=false`, restent `DATA_VALID_EFFECT_PENDING` et ne sont pas ajoutés à `MUGIWARA_FREE`. Aucune nouvelle carte n'est certifiée; les 120 certificats antérieurs, dont les quatre certifications OP récentes, sont conservés. Aucun Starter Deck n'est complet ou débloqué.

### Vérifications de la tranche locale

| Contrôle | Résultat réel | Preuve |
|---|---|---|
| Tests ciblés M6 (source et cartes ST-01) | PASS, **27/27**, avant l'ajout ST-02 | exécution ciblée réelle |
| Suite complète | PASS, **393/393**, avant l'ajout ST-02 | `evidence/m6/full-test-st01-quantity-fix.log` |
| TypeScript | PASS avant ST-02; après ajout ST-02 NOT TESTED | `evidence/m6/typecheck-st01-quantity-fix.log` |
| ESLint | PASS, 0 erreur, 99 avertissements, avant ST-02 | `evidence/m6/lint-st01-quantity-fix.log` |
| Build de production isolé | PASS avant ST-02 dans une copie `/tmp/mugiwara-m6-build-network.*` | `evidence/m6/isolated-build-st01-quantity-fix-network.log` |
| `git diff --check` | PASS avant ST-02; après ajout ST-02 NOT TESTED | contrôle antérieur réel |

Le schéma Prisma local contient `Deck`, `DeckVersion` et `DeckCard.quantity` (valeur par défaut 1, clé unique version/carte). Le catalogue de fiches reste séparé de la composition et les cartes d'un deck se raccordent à la clé `Card` via `cardId`. La base configurée localement étant indisponible, les lignes de deck et leur total n'ont pas été comptés cette session. Aucun accès à la production/préproduction ni changement de base n'a été effectué. Aucun JSON sous `cardgame/carteJson/` n'a été modifié.

## Verdict phase 1 (historique) : PARTIAL

Le premier lot M6 met en place un vrai point d'intégration générique et versionné pour les données de cartes, puis le branche au catalogue utilisé par le serveur. Il ne rend pas le moteur universel et ne certifie aucune nouvelle carte. Il ne démarre pas une réécriture des règles ou du combat.

## Audit vérifié

- Stack réelle : Next.js 15.5.27, React 19, TypeScript 5.9, Prisma 6.19, npm; scripts `test`, `typecheck`, `lint`, `build` dans `cardgame/package.json`.
- API du noyau : `createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame`.
- État effectif compilé : 331 définitions / 331 printings / 116 certificats, calculés à partir des fonctions et exports courants.
- Le rapport M5 documente une validation historique de 346 tests PASS, typecheck PASS, lint 0 erreur/99 avertissements et build isolé PASS. Ce sont des preuves M5, pas des vérifications M6.
- Présentes mais limitées : Blocker, recherche top du deck, On Play/Trigger/Counter/Activate Main retenus, combats et sauvegardes JSON du périmètre M3-M5. Modifiers continus refusés par schéma, plusieurs mots-clés non démontrés. Les bots ont quelques heuristiques par ID hors du moteur de règles.
- La matrice ST compte 71 numéros (21 révisions certifiées) répartis sur 14 starters; elle ne contient aucun deck complet ST-01..ST-36.

## Changements M6 — phase 1 historique

- `cardgame/src/game/cards/packs.ts` : schéma strict `CardPack`, versions de schéma/règle, consolidation via l'adaptateur existant, fusion des contributions au registre, refus des identifiants de packs/effets en collision, capacités non résolues, primitives inconnues et sources absentes.
- `cardgame/src/lib/engine/catalog.ts` : l'export de catalogue utilisé par `/play` compile désormais les packs M3 et M5 via cette frontière. Son contrat public, ses identifiants et son cardinal n'ont pas changé.
- `cardgame/tests/game-m6-packs.test.ts` : 5 tests ciblés, incluant `TEST-FUTURE-SET` synthétique et non certifié. Une fixture On Play `[Draw 1]` parcourt le setup, est jouée via `PLAY_CARD` dans un deck violet modifié, puis exécute `drawCards` avec l'interpréteur et le scheduler actuels. Ce n'est pas une carte officielle et elle ne reçoit aucune certification.
- Documents : architecture, couverture, certification et matrice Starter Deck.

## Tests phase 1 (historique)

| Contrôle | État M6 |
|---|---|
| Test ciblé `game-m6-packs.test.ts` | PASS, 5/5 |
| `npm test` complet | PASS, **359/359**, 0 échec/skip/todo; exécuté après les changements finaux |
| `npm run typecheck` | PASS après le scénario vertical |
| `npm run lint` | PASS, 0 erreur et **99 avertissements**; nombre identique au rapport M5 |
| Build isolé | PASS, `next build` réussi dans `/tmp` après autorisation d'accès à Google Fonts; aucune base réelle ni `.env` copiés |
| `git diff --check` | PASS après les changements |

Le premier build isolé en sandbox a échoué uniquement sur `getaddrinfo ENOTFOUND fonts.googleapis.com` pour la police Inter. Le même build a ensuite réussi avec accès réseau autorisé. Aucun changement au code n'a été nécessaire pour ce problème d'environnement.

Les journaux finaux sont dans `docs/game/evidence/m6/` : `npm-test.log`, `typecheck.log`, `lint.log` et `isolated-build.log`.

## Limites identifiées en phase 1 (historique)

Le compilateur valide l'enveloppe des données et références mais n'analyse pas les textes français; il n'effectue ni certification réglementaire, ni import de catalogue officiel, ni migration de save. La seule partie verticale est synthétique et démontre une primitive On Play existante, pas une capacité d'une vraie carte ni une nouvelle règle. Le module actuel a besoin que les packs fournis incluent les cartes sources du registre, ce qui est intentionnellement vérifié strictement.

Étape suivante (formulée en phase 1, désormais historique) : améliorer le rapport d'inventaire puis sélectionner une famille d'effets à généraliser.

## CURRENT STATE — M6 phase 2

Verdict courant : **PARTIAL**. La phase 2 ajoute des capacités officielles exécutées par le moteur partagé; elle ne couvre pas tout le catalogue.

- Catalogue `/play` : **333 définitions, 333 printings**. Certificats explicites : **120 révisions**.
- Révisions certifiées par cette tranche : `OP01-006@m6-2026-10-12` Otama, `OP01-007@m6-2026-10-12` Caribou, `OP01-016@m3-2026-10-12` Nami et `OP06-013@official-2026-10-11` Luffy. Otama/Caribou sont de nouvelles définitions; Nami/Luffy existaient déjà et reçoivent un certificat explicite.
- Familles démontrées : On Play avec cible adverse et modificateur de puissance; recherche On Play, sélection/révélation et ordre du reste du deck; On K.O. issu d'un combat confirmé; Trigger pendant la résolution de dégâts Life, avec reprise du combat après les choix.
- Primitives/contrats changés : le sélecteur `OPPONENT_CHARACTER` accepte un `maximumPower` facultatif; `addPower` valide désormais le contrôleur du joueur destinataire déclaré. Aucun nouvel identifiant de primitive n'a été ajouté, et le runtime ne contient pas de branche OP01.
- `engineRuleset()` (`MUGIWARA_FREE`) admet les trois cartes. Les choix réutilisent les actions génériques déjà utilisées par `/play` et les bots; aucun changement UI/bot n'a été nécessaire.
- Starter Decks : inventaire toujours **71 numéros / 21 révisions certifiées sur 14 starters**, et **zéro deck complet débloqué**.
- Traces : `docs/game/evidence/m6/official-op01-006-target.json`, `official-op01-006-decline.json`, `official-op01-007-on-ko.json`, `official-op01-016-search.json`.
- Scénarios OP06 conservés sous `docs/game/evidence/universal-ability/` : `official-onplay-search-op06-013.json`, `official-trigger-search-op06-013.json`, `official-cross-set-battle-op06-009-017-013.json`; leurs titres sont liés explicitement au certificat M6.

Les chiffres de phase 1 ci-dessus sont conservés comme historique; le bloc `CURRENT STATE` est la source courante. Le test ciblé des suites M2A/M4/M6 a passé **43/43** après l'ajout de la certification Trigger OP06-013.

### Vérifications finales de cette phase

| Contrôle | Résultat | Preuve |
|---|---|---|
| Tests ciblés M2A + M4 certification + M6 cartes officielles | PASS, **43/43** | commande `node --import tsx --test tests/game-m4-certification.test.ts tests/game-m6-official-cards.test.ts tests/game-m2a.test.ts` |
| Suite complète | PASS, **366/366**, aucun échec, skip ou todo | `docs/game/evidence/m6/npm-test-final.log` |
| TypeScript | PASS | `docs/game/evidence/m6/typecheck-final.log` |
| ESLint | PASS, 0 erreur, 99 avertissements | `docs/game/evidence/m6/lint-final.log` |
| Build de production isolé | PASS | `docs/game/evidence/m6/isolated-build-final.log`; `next build` compilé avec succès dans une copie temporaire, `.env` exclu |
| `git diff --check` | PASS | relancé après les modifications de code et de documentation |
