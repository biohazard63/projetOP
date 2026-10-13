# M6 checkpoint — Starter Decks

## CURRENT STATE — reprise Codex (13 octobre 2026)

- Faits vérifiés au runtime : 404 définitions, 207 certificats; ST-01..ST-06 ont 17/17 numéros certifiés chacun.
- `/play` propose les compositions exactes ST-01, ST-02, ST-04 et ST-06 (1 Leader + 50 cartes), après résolution conservatrice de deux alias certains : ST-04 “All-Star 'Calamity'” → ST04-014; ST-06 “Navy Headquarters” → ST06-017. Parties bots ST-04 et ST-06 complètes passées sans fallback/refus.
- ST-03 et ST-05 demeurent bloqués sur deux noms ambigus chacun; aucun choix conjectural n'a été enregistré.
- ST-08 : 5 profils déclaratifs exécutables ciblés (ST08-004, ST08-006, ST08-008, ST08-009, ST08-015), 0 carte certifiée; ST-08 complet non jouable.
- ST-07..ST-12 ne sont pas complets. ST-10 contient des données de composition incohérentes (trois Leaders, 56 cartes principales dans la liste extraite); ST-11 en totalise seulement 37 en raison de neuf entrées non résolues. ST-22 n'a pas de JSON local.
- Browser tests: NOT TESTED (pas de navigateur Playwright installé / serveur local arrêté). Les quantités en base n'ont pas été consultées.
- Tests ciblés ST-08 : 5/5 PASS. Validation finale de reprise : 469/469 tests PASS, `npm run typecheck` PASS, `npm run lint` PASS (0 erreur, 99 avertissements préexistants), build de production isolé PASS, `git diff --check` PASS. Aucun fichier de preuve historique n'a changé.
- Premier build isolé interrompu par un dossier `node_modules-ci-attempt` généré dans la copie temporaire et scanné par TypeScript; dossier déplacé à côté de la copie puis second build réussi. Aucun effet sur le workspace.
- Prochaine unité de travail : cartographier ST-07 depuis `carteJson/ST-07/cards-ST-07.json`; il faut d'abord généraliser les déplacements / réorganisations de Life, Life face visible et choix contrôlés par l'adversaire. Ensuite traiter ST-09..ST-12. Ne pas certifier de carte de ces decks tant que toutes ses capacités ne sont pas couvertes.
- Aucun commit/push/deploy, migration ni opération base. Ne pas nettoyer le workspace : nombreux changements antérieurs suivis et non suivis.

Les sections `CURRENT STATE` ci-dessous sont des archives historiques, à ne pas lire comme l'état courant.

## CURRENT STATE — fin des lots A, B, C (13 octobre 2026, Claude Code) — voir `M6_HANDOFF.md`

- **ST-01 à ST-06 : 102/102 numéros certifiés** (399 définitions, 207 certificats). Decks proposés dans `/play` : `starter-st01`, `starter-st02` (compositions exactes résolues). ST-03..ST-06 : cartes certifiées, decks bloqués par des noms non résolus dans `scripts/rebuildStarterDecks.ts` (correspondances proposées dans `M6_HANDOFF.md`, non appliquées).
- Validation finale réelle : `npm test` 459/459, typecheck PASS, lint 0 erreur / 99 avertissements, build isolé PASS, `git diff --check` PASS, preuves historiques inchangées. Tests navigateur des Starter Decks : **non faits**.

## CURRENT STATE — Lot A terminé (13 octobre 2026, Claude Code)

- **ST-01 : 17/17 certifiés** et **ST-02 : 17/17 certifiés** (`ST01_CERTIFICATIONS`, `ST02_CERTIFICATIONS`). Les deux decks exacts (`starter-st01`, `starter-st02`, extraits de `scripts/rebuildStarterDecks.ts` sans exécution) sont proposés dans `/play` : la liste n'inclut un Starter Deck que si toutes ses cartes sont certifiées.
- Régression ST-02 de Codex corrigée (couleur verte inconnue, champ `whenBindingNonempty` absent du schéma des opérations).
- Nouvelles primitives génériques : sélecteur `CARDS` (camp, zone, filtres), `returnToHand`, `moveToDeckBottom`, `restCard`, `setActive`, `playCard`, garde `whenBindingNonempty` sur les opérations, conditions `HAND_AT_LEAST`, `OWN_CHARACTERS_AT_LEAST`, `DON_DECK_AT_LEAST`, moments `END_OF_YOUR_TURN` et `END_OF_BATTLE_WITH_CHARACTER` (événement `CHARACTER_BATTLED`), effets continus conditionnels et auras.
- Règles corrigées : CR §3-7-6-1 (jouer avec 5 Personnages), Trigger d'Événement sans payer son coût (FAQ ST02-015), Counter Event certifiable seulement avec son programme COUNTER testé.
- Vie des Leaders : lue sur les listes officielles mises en cache (143 Leaders), écrite dans le champ `cost` des Leaders de `carteJson` (240 lignes, 46 fichiers) à la demande de l'utilisateur ; script `scripts/game/sync-leader-life.ts` pour la base (à blanc par défaut, non exécuté sur Neon).
- Tests ciblés ST-01 et ST-02 PASS ; suite complète différée à la fin des lots (consigne utilisateur).

## CURRENT STATE — 13 octobre 2026

- Branche: `feature/tcg-m5`; changements existants de Codex/Claude préservés.
- Source de caractéristiques et textes: JSON locaux `cardgame/carteJson/`; aucune source JSON modifiée.
- Composition: les decks existants stockent leurs quantités dans Prisma `DeckCard.quantity`. `cardgame/scripts/rebuildStarterDecks.ts` fournit également des entrées nominatives/quantitatives ST-01 à ST-28, mais sa liste s'arrête à ST-28 et le script supprime/recrée les decks; ne pas l'exécuter pour auditer.
- La connexion PostgreSQL locale n'était pas disponible sur `localhost:5432`; aucune ligne réelle de composition DB n'a été lue. Pas d'accès à la production/préproduction.
- ST-01: 17/17 numéros locaux reconnus dans le catalogue précédent; 5 certificats préexistants, 12 profils à effet ayant désormais des DSL/scénarios ciblés. Aucun nouveau certificat; deck non certifié.
- ST-02: définition locale ajoutée pour `ST02-005 Killer` (On Play ciblant jusqu'à un Character adverse reposé de coût ≤3, puis K.O.; Trigger jouant la carte depuis Life). Sélecteur générique ajouté. Cette tranche est **non testée/non typée après modification** et Killer reste `DATA_VALID_EFFECT_PENDING`.
- ST-03: inventaire local lu. Familles qui demandent encore du moteur: DON!! −X avec cible de retour, On Block et bottom-deck, récupération depuis Trash, pioche + défausse, jeu depuis Deck + shuffle, réorganisation Top/Bottom, retour vers la main du propriétaire. ST03-017 existe déjà dans les définitions M3.

## Dernière validation complète

Avant les changements ST-02: tests ciblés ST-01 27/27; suite 393/393; TypeScript PASS; ESLint 0 erreur / 99 avertissements; build isolé PASS; `git diff --check` PASS. Les preuves sont dans `docs/game/evidence/m6/*quantity-fix*`. Ces résultats ne valident pas le code ST-02 ajouté ensuite.

## Suite immédiate

1. Continuer les prochains ST sans tests intermédiaires, selon la demande utilisateur; consigner les changements non vérifiés.
2. Étudier en priorité les primitives réutilisables pour ST-02/03: redressement de carte, mouvement vers main/deck (haut/bas), discard, jeu depuis deck, shuffle déterministe, et filtre par traits/coût/état.
3. Reprendre les quantités depuis les `DeckVersion`/`DeckCard` déjà en base quand le PostgreSQL local sera disponible; ne pas utiliser le script de reconstruction (destructif) pour lecture.
4. Ne certifier aucune nouvelle carte avant tests regroupés, revue des textes/règles et validation des interactions.
5. Après traitement de tous les ST visés, exécuter suite complète, typecheck, lint, build isolé, diff-check et corriger les régressions.

## Fichiers touchés dans la dernière tranche non validée

- `cardgame/src/game/effects/contracts.ts`
- `cardgame/src/game/effects/runtime.ts`
- `cardgame/src/game/cards/m6LocalST02Cards.ts` (nouveau)
- `cardgame/src/lib/engine/catalog.ts`
- `cardgame/tests/game-m6-packs.test.ts` (mise à jour attendue du compte de profils)
- `docs/game/M6_REPORT.md`
- `docs/game/M6_STARTER_MATRIX.md`
- `docs/game/M6_EFFECT_COVERAGE.md`
- `docs/game/M6_CARD_CERTIFICATION.md`
