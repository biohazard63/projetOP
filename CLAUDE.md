# Mugiwara TCG — instructions Claude Code

Lis d’abord `docs/handoff/01_PROJECT_OVERVIEW.md`, puis `docs/handoff/04_CURRENT_STATUS.md`, `docs/handoff/08_GIT_AND_WORKSPACE.md` et `docs/handoff/09_NEXT_STEPS.md`. La passation décrit l’état observé le 12 octobre 2026; confirme toujours les faits dans le code et dans `git status` avant d’agir.

## Présentation

Mugiwara TCG est une application de collection One Piece Card Game. Le sous-projet applicatif se trouve dans `cardgame/` et utilise Next.js, React, TypeScript, Prisma, PostgreSQL et NextAuth. Il contient le catalogue, les boosters, la collection, les decks, l’historique et l’interface `/game`. Un moteur déterministe indépendant de l’interface est développé dans `cardgame/src/game/`.

Le simulateur visé doit appliquer les règles officielles Bandai, ne jamais ignorer une mécanique inconnue et ne certifier `PLAYABLE_VERIFIED` qu’avec des définitions réglementaires vérifiées et des tests pertinents. Le 12 octobre 2026 en fin de journée, M3 est **COMPLETE** (`docs/game/M3_REPORT.md`), sans nouvelle carte `PLAYABLE_VERIFIED`.

## Architecture utile

- Application : `cardgame/src/app/`, API sous `cardgame/src/app/api/`, composants sous `cardgame/src/components/`, services métier sous `cardgame/src/lib/`.
- Prisma : `cardgame/prisma/schema.prisma`; toute migration ou opération de base requiert une autorisation explicite.
- Données locales : `cardgame/carteJson/` et `cardgame/data/onepiece/`; ne pas confondre données extraites, définitions de moteur revues et cartes certifiées.
- Moteur : `cardgame/src/game/core/` (`game.ts`, `combat.ts`, `turns.ts`, `types.ts`), `cardgame/src/game/effects/` (contrats DSL, runtime, scheduler, opérations, caractéristiques), `cardgame/src/game/cards/` (adaptateur et profils), `cardgame/src/game/rulesets/`.
- Entrées publiques : `createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame` sont exportées par `cardgame/src/game/core/index.ts`.
- Tests : `cardgame/tests/game-*.test.ts`; rapports historiques et preuves dans `docs/game/`.

L’API est pure sur les transitions de jeu, mais `GameState` contient l’état autoritaire, les instances, les journaux, le PRNG et les continuations; ne jamais exposer directement cet objet au client. Les règles runtime annoncent actuellement Comprehensive Rules `1.2.1`. Le DSL observé est `1.3.0`; vérifie les constantes dans le code avant tout changement.

## Règles impératives

- Préserve toutes les modifications locales, suivies ou non suivies. Ne supprime aucun fichier non suivi et n’utilise jamais `git reset`, `git clean` ou `git stash` pour « nettoyer » le workspace.
- Aucun commit, push, déploiement, migration Prisma ou changement de base sans autorisation explicite.
- Ne touche pas aux fonctionnalités de collection, boosters, coins ou à `/game` sans demande explicite.
- Pas de logique dans le noyau conditionnée par un numéro de carte ou une série; les capacités sont déclaratives et versionnées.
- N’invente pas de règle, de texte officiel, de taux, de certification ou de résultat de test. Vérifie la règle Bandai/FAQ/errata applicable et conserve ses références.
- Ne certifie pas une carte si toutes ses capacités obligatoires et restrictions ne sont pas exécutables et testées.
- Garde les continuations sérialisables en JSON (aucune closure dans `GameState`), l’idempotence, le déterminisme, les générations de présence et la confidentialité des zones cachées.
- Une primitive ou une définition inconnue doit être refusée clairement, jamais ignorée silencieusement.
- Effectue les builds de production dans une copie isolée, afin de ne pas altérer `.next` ni le serveur local. N’écrase pas les fichiers existants de preuve.
- Communique en français; conserve les noms techniques dans leur langue d’origine.

## Environnement et commandes

Le dépôt n’a pas de `package.json` à sa racine; les commandes Node se lancent depuis `cardgame/`. `cardgame/package.json` exige Node `>=22 <25`. Environnement observé pendant la passation : Node `v22.22.2`, npm `10.9.7`. Le gestionnaire est npm; un `package-lock.json` est présent.

```bash
cd cardgame
node --version
npm --version
npm test
npm run typecheck
npm run lint
npm run dev
```

Les scripts ci-dessus existent dans `cardgame/package.json`. À la clôture de M3 (12 octobre 2026) : `npm test` 314/314 PASS, `npm run typecheck` PASS, `npm run lint` 0 erreur et 99 avertissements. `npm test` réécrit 17 preuves JSON historiques ; hache `docs/game/evidence/` avant et après pour vérifier qu’elles restent identiques. `npm run dev` n’a pas été vérifié; l’application peut nécessiter un `.env` local. Ne copie jamais les secrets d’environnement dans un rapport.

Installation : `cd cardgame && npm ci`. Cette commande est déclarée ici comme commande npm standard et n’a pas été exécutée pendant la passation; son `postinstall` lance `prisma generate` et peut dépendre de la configuration locale.

Les tests ciblés M3 observés :

```bash
cd cardgame
node --import tsx --test tests/game-m3*.test.ts
node --import tsx scripts/game/m3-full-game.ts   # trace de la partie complète, refuse d’écraser une preuve différente
```

Sortie observée à la clôture : 49/49 tests M3 PASS (sept fichiers). Le dernier résultat intégral connu avant M3 était 265/265 PASS (baseline).

Build isolé, **exécuté avec succès le 12 octobre 2026** (`docs/game/evidence/m3/m3-isolated-build.log`) :

```bash
cd /Users/quentin/Documents/GitHub/projetOP
BUILD_DIR="$(mktemp -d /private/tmp/mugiwara-build.XXXXXX)"
rsync -a --exclude node_modules --exclude .next --exclude '.env' --exclude '.env.*' cardgame/ "$BUILD_DIR/cardgame/"
cd "$BUILD_DIR/cardgame"
npm ci
npm run build
```

Ce build ne reprend volontairement aucun fichier `.env`; il peut donc nécessiter une configuration de build non secrète appropriée. `rsync`, `npm ci` et le build de la copie doivent être confirmés dans l’environnement avant d’annoncer PASS. Ne jamais exécuter `npm run build` dans le workspace source si `.next` ou un serveur local doit être préservé.

## Point d’entrée de passation

Consulte les dix fichiers de `docs/handoff/`. Commence par la tâche P1 de `09_NEXT_STEPS.md` et les limites détaillées dans `05_M3_HANDOFF.md`. Aucun nouveau jalon fonctionnel n’est autorisé par le seul fait de lire ce fichier.
