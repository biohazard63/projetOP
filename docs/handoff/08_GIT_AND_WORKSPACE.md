# 08 — Git et espace de travail

Snapshot observé le 12 octobre 2026; ne pas utiliser les instructions ci-dessous comme autorisation de nettoyer/committer.

## Git

- Branche active : `maintenance/catalog-rebuild`, suivie de `origin/maintenance/catalog-rebuild`.
- `git status --short --branch` : `maintenance/catalog-rebuild...origin/maintenance/catalog-rebuild`; `cardgame/package.json` modifié; nombreux fichiers/dossiers non suivis listés ci-dessous.
- Aucun commit, push ou déploiement effectué pendant la passation.

## Modifications et non suivis importants

La sortie du status comprend notamment :

- `M cardgame/package.json`.
- `?? cardgame/src/game/`, `cardgame/scripts/game/`, `cardgame/tests/game-*.test.ts` (M0–M3 et tests).
- `?? docs/game/` (rapports, specs, traces, preuves historiques et roadmap M3).
- `?? cardgame/carteJson/nouvelle/` et `?? cardgame/docs/ONE_PIECE_TCG_RULES.md`.
- Médias de maquettes sous `cardgame/public/images/`.
- `docs/ONE_PIECE_TCG_RULES.md`, `docs/superpowers/`.
- `.DS_Store` à plusieurs niveaux.
- Les fichiers de handoff créés dans cette mission seront eux aussi non suivis tant qu’ils ne sont pas ajoutés/commités manuellement.

La sortie complète doit être relue par `git status --short`; cette liste est un résumé, pas une liste exhaustive ni une attribution de propriété des changements. Une partie des éléments existait avant la reprise M3. Ne pas tenter de reconstituer l’origine par reset ou stash.

## Fichiers générés et risques

`cardgame/.next/` et `node_modules/` peuvent contenir état local; ne pas supprimer. Les sorties d’audit antérieures et traces JSON sont précieuses. Ne pas écraser les dossiers d’évidence. Aucune valeur de `.env` n’est reproduite dans cette passation.

## Procédure sûre de reprise

1. `git status --short --branch` et garder une copie de la sortie dans le compte-rendu.
2. Lire `04_CURRENT_STATUS.md` puis `05_M3_HANDOFF.md`.
3. Ne pas `git checkout`, reset, clean, stash, rebase ou cherry-pick sans autorisation spécifique.
4. Avant un changement, examiner les fichiers concernés et protéger les états non suivis.
5. Ajouter/committer des fichiers seulement si l’utilisateur le demande explicitement.
