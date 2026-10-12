# M0 — Données du simulateur

10 octobre 2026. **Données et adaptateur validés pour le sous-ensemble décrit ci-dessous. Le simulateur automatique n'est pas jouable ; M0 n'est pas annoncé comme terminé globalement.**

Les trois documents demandés ont été lus intégralement. Aucun scraper, schéma Prisma, identifiant utilisateur, collection, deck sauvegardé, booster, coin ou interface active n'a été modifié. Aucune connexion à une base, migration, importation, collecte d'illustrations ou publication.

## Résultat concret

| Livrable | Résultat | Preuve |
|---|---|---|
| Vie des Leaders | PASS : 139 numéros, 284 variantes ; aucune valeur absente ou contradictoire | `evidence/leader-life.json` |
| Recherche locale | PASS : 67 fichiers inventoriés ; aucun champ Vie explicite récupéré ; coûts conservés comme candidats, jamais convertis | Même rapport |
| Sources officielles | PASS : 94 numéros avec source FR ; secours EN pour 45 ; valeurs de 2 à 6, aucun défaut | URLs, date, empreintes des réponses dans le rapport |
| Adaptateur strict | PASS : règles / illustration / anciens IDs distincts ; multicolore, null / zéro, refus des conflits | 10 tests M0 |
| Premier catalogue | PASS : 14 définitions, 33 illustrations, 29 références de l'instantané local conservées | `evidence/m0-preparation.json` |
| Deck de test | PASS : 1 Leader et 50 cartes principales, maximum 4 par numéro, couleurs compatibles | Composition sans erreurs |
| Exécution des effets | BLOCKED : interpréteur absent ; trois cartes refusées explicitement | `UNSUPPORTED_EFFECT` pour ST01-001, ST01-006, ST01-007 |
| Partie automatique / interface | NOT_TESTED : hors M0 | M1–M3 |
| Base et parcours utilisateurs | NOT_TESTED : aucune base connectée | Aucun modèle ou service existant modifié |

### Correction de Vie sans migration

Le maître historique conserve ses champs et identifiants. Une correction séparée relie chaque variante à une valeur officiellement vérifiée. Le fichier préparé pour le moteur applique ces valeurs et transforme le faux « coût » historique des Leaders en absence de coût **dans la vue moteur seulement**. Une Vie inconnue n'est jamais remplacée par 5, ni par le coût.

La résolution ne fait confiance qu'à un champ Life/Vie explicite, daté, issu du catalogue officiel. Les archives locales sans validation restent des éléments de comparaison. Les contradictions sont refusées, même si l'une des valeurs paraît plausible. Les valeurs numériques absentes restent `null` ; un zéro explicite reste zéro.

Sources contrôlées : [Leaders FR](https://fr.onepiece-cardgame.com/cardlist/?search=true&categories%5B%5D=Leader), [Leaders EN](https://en.onepiece-cardgame.com/cardlist/?search=true&categories%5B%5D=Leader), [P-011 EN](https://en.onepiece-cardgame.com/cardlist/?search=true&freewords=P-011). Le contrôle ciblé de P-011 complète le filtre global. Les pages et illustrations n'ont pas été archivées intégralement.

### Identités et sécurité d'intégration

- Numéro réglementaire canonique : par exemple `ST01-001` ; les alias connus sont normalisés, pas les suffixes arbitraires.
- Identité de définition : numéro + révision contrôlée (`ST01-001@m0-2026-10-10`).
- Illustration : clé existante, par exemple `ST01-001::standard` ou `::_p1` ; elle conserve ses extensions et ses anciens IDs.
- Les 29 références proviennent de `data/onepiece/sources/local-database.json`, **pas d'une vérification de la base actuelle**. Aucune réattribution de cartes.

Les copies dans un deck sont comptées par numéro réglementaire, toutes illustrations réunies. Les caractéristiques contradictoires entre variantes invalident la définition plutôt que de sélectionner silencieusement une version. Les cartes non relues sont refusées par le moteur.

## Catalogue initial et conformité

Le catalogue utilise des cartes ST-01, OP-01 et promotionnelles déjà présentes localement. Une matrice par carte est disponible dans [M0_COVERAGE.md](M0_COVERAGE.md). Les textes actuels, FAQ et errata officiels ont été consultés ; les traductions françaises restent explicitement non officielles et à relire. Les métadonnées canoniques de traits/attributs ne sont pas des textes d'interface.

Les seuls programmes d'effet préparés sont le don de zéro ou un DON!! épuisé, une fois par tour, et Blocker. Ce sont des **spécifications typées**, sans gestionnaire d'exécution. Le mode `composition` vérifie les données d'un deck, mais ne donne jamais l'autorisation de jouer. Le mode par défaut refuse les capacités non implémentées.

Le ruleset M0 est un sous-ensemble non compétitif daté du 10/10/2026. Les restrictions actives ont une date de début de **snapshot** au 10/10, pas une date historique de bannissement reconstituée. La restriction annoncée pour OP14-020 n'est appliquée qu'au 12/10. La validation refuse une date extérieure à la fenêtre 10–12/10 : actualiser les références avant de prolonger celle-ci. La conformité Standard et la politique de blocs restent à définir. [Restrictions officielles](https://en.onepiece-cardgame.com/news/restriction.html).

## Commandes exécutées et résultats

Depuis `cardgame/`, avec les dépendances existantes ; aucune nouvelle dépendance :

```bash
npm run game:leaders:audit
npm run game:leaders:audit -- --verify-official
npm run game:leaders:audit -- --verify-missing
npm run game:m0:prepare
npm run test:game:m0
npm test
npx tsc --noEmit
npx eslint src/game scripts/game tests/game-m0.test.ts
npm run lint
```

Les vérifications réseau ont nécessité l'autorisation du sandbox après une première erreur DNS. Les derniers audits et préparations étaient locaux et réutilisent les preuves obtenues. Délai réseau 1,5 seconde, timeout 30 secondes, tentatives limitées ; aucun téléchargement d'image. Le scraper existant est inchangé.

| Vérification finale | État | Résultat |
|---|---|---|
| Préparation | PASS | 284 Vies, 14 définitions, 33 illustrations, zéro erreur de données / composition |
| Tests M0 | PASS | 10 / 10 |
| Suite unitaire existante + M0 | PASS | 81 / 81 ; zéro échec, zéro skip |
| TypeScript | PASS | Code de sortie 0 |
| ESLint nouveaux fichiers | PASS | Aucun avertissement ni erreur |
| ESLint application | PASS | 0 erreur ; 99 avertissements existants |
| Production build | PASS | Code de sortie 0 ; compilation et génération des routes terminées |
| Git diff --check | PASS | Aucun problème détecté |
| Intégration DB / appareils physiques | NOT_TESTED | Aucun environnement DB ni interface de partie utilisés |

`npm run build` a été exécuté dans `/private/tmp/mugiwara-managed-build-pwwqpcx8`, copie actualisée du code/configuration utilisant les dépendances locales, sans `.env` de production. Cela préserve le `.next` et le serveur local de l'utilisateur. Les avertissements du build sont conservés, sans désactiver les contrôles.

Preuves conservées : [tests.log](evidence/tests.log), [build.log](evidence/build.log), [lint.log](evidence/lint.log). Le test sur le maître réel est explicitement SKIP si les archives locales sont absentes sur un autre poste ; il a bien été exécuté ici.

## Fichiers créés / modifiés

- `cardgame/package.json` : trois commandes M0, aucun changement de dépendance.
- `cardgame/scripts/game/leader-life.ts`, `prepare-m0.ts` : audit et préparation locale.
- `cardgame/src/game/cards/{types,leaderLife,adapter,catalogAdapter,reviewedCards}.ts` : données et adaptateur purs, sans React, DOM ou Prisma.
- `cardgame/src/game/rulesets/{decks,m0}.ts` : contrôles de composition et admission datée.
- `cardgame/tests/game-m0.test.ts` : dix tests automatisés.
- `docs/game/M0_REPORT.md`, `M0_COVERAGE.md`, `evidence/*` : résultats et preuves.
- `docs/game/SIMULATOR_ARCHITECTURE.md`, `RULES_OPEN_QUESTIONS.md` : suivi du jalon.
- Généré localement : `cardgame/data/onepiece/game/m0-catalog.json` (dossier de données ignoré par Git). Reproductible par `game:m0:prepare` ; ne pas publier comme catalogue entièrement jouable.

Les fichiers et images non committés de l'utilisateur restent préservés. Aucun commit, push ou déploiement.

## Données manquantes et passage à M1

1. **Vie : zéro manque** pour les 139 Leaders audités. Cela ne valide pas tous leurs autres effets.
2. Hors sous-ensemble : 2 653 autres numéros et 4 146 illustrations n'ont pas une définition moteur complètement relue ; ils ne sont pas admis. Les blocs absents du maître restent inconnus ; le bloc des 14 définitions a été vérifié séparément.
3. Français : formulation et certains noms provisoires à valider humainement ; aucune traduction automatique présentée comme officielle.
4. M1 : état sérialisable pur, zones, instances, deck DON!! de 10 cartes, mélange injecté/reproductible, choix du premier joueur, main initiale, mulligan et Vie depuis la définition. Tests officiels de mise en place et d'information cachée avant tout branchement de l'ancien `/game`.
5. Implémenter ensuite les transitions et fenêtres, puis les gestionnaires d'effets contrôlés et leurs tests. Ne pas activer une capacité dans le ruleset tant que ses scénarios ne passent pas.
6. Choisir région / format compétitif et actualiser les restrictions datées. Aucune migration indispensable pour tester M1 : l'adaptateur séparé préserve Prisma. Toute persistance nouvelle nécessitera un plan distinct.

Le noyau de données est indépendant de l'affichage : une base de code PC, mobile et tablette est conservée. Les tests sur appareils et la future interface tactile restent des jalons ultérieurs.
