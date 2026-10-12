# 07 — Tests, vérifications et commandes

Toutes les commandes s’exécutent dans `cardgame/`, sauf indication contraire. Scripts définis par `cardgame/package.json`.

## Commandes disponibles

```bash
cd cardgame
npm test
npm run typecheck
npm run lint
node --import tsx --test tests/game-m3.test.ts tests/game-m3-atomicity.test.ts tests/game-m3-1.test.ts tests/game-m3-2.test.ts tests/game-m3-3.test.ts tests/game-m3-4.test.ts tests/game-m3-5.test.ts
node --import tsx scripts/game/m3-full-game.ts   # régénère evidence/m3/full-game-trace.json, refuse d'écraser un contenu différent
node --import tsx --test tests/game-m1.test.ts tests/game-m1-5.test.ts tests/game-m1-5b.test.ts tests/game-m1-5c.test.ts tests/game-m1-5d.test.ts tests/game-m2a.test.ts tests/game-m3.test.ts
```

Les deux dernières commandes ciblées sont compatibles avec le projet; la commande ciblée multi-fichiers est une proposition et n’a pas été exécutée comme telle pendant la passation. `npm test` exécute `tests/*.test.ts`. Ne confonds pas test unitaire du moteur avec navigateur, intégration DB ou conformité officielle.

## Validation actuelle (clôture M3, 12 octobre 2026)

- `npm test` : 314/314 PASS (`docs/game/evidence/m3/m3-final-tests.log`), dont 49 tests M3 répartis dans sept fichiers `game-m3*.test.ts`.
- TypeScript : PASS (`m3-final-typecheck.log`). ESLint : 0 erreur, 99 warnings dans `cardgame/src` (`m3-final-lint.log`).
- Build isolé : PASS (`m3-isolated-build.log`, copie sans `.env`, `.next`, `node_modules`).
- Attention : `npm test` réécrit 17 preuves JSON historiques (`evidence/m2`, `m2_5`, `universal-ability`) ; leur contenu a été vérifié identique par hachage avant/après chaque exécution de la session.
- Historique : 265/265 PASS avant M3 (`baseline-tests.log`); journaux `current-*.log` de la passation du matin.

Autres tests existants sont dans `cardgame/tests/` et preuves historiques dans `docs/game/evidence/{m1,m1_5,m1_5a,m1_5b,m1_5c,m1_5d,m2,m2_5,universal-ability}/`. Vérifie timestamp/contenu du journal avant de l’attribuer au code courant.

Journaux rejoués pendant la passation : `docs/game/evidence/m3/current-targeted-tests.log`, `current-typecheck.log` et `current-lint.log`.

## Build isolé

`npm run build` existe mais ne doit pas être exécuté dans le workspace source. Procédure de `CLAUDE.md`, exécutée avec succès le 12 octobre 2026 (clôture M3); elle copie sans `.env`, `.next` ni `node_modules` vers `/private/tmp`, puis installe et bâtit dans la copie. Les builds précédents du moteur antérieurs à M3 ont réussi isolément selon les rapports; cela ne valide pas les modifications M3.

## Environnement

Node requis `>=22 <25`; observé v22.22.2, npm 10.9.7. `npm ci` lance `prisma generate` en postinstall. Aucun secret `.env` ne doit être affiché ou copié. Les builds historiques peuvent requérir réseau (fonts Google); consigner toute erreur DNS comme échec environnemental, ne pas la masquer.

## Précautions

Ne jamais supprimer `.next`, `node_modules`, caches, fichiers `.DS_Store`, JSON non suivis ou assets. Les tests actuels travaillent sur moteur et fixtures locales. Toute commande Prisma/import/catalogue peut altérer données et est hors périmètre sans autorisation. Le script `npm run test` ne lance pas les tests navigateur/Playwright définis ailleurs.
