# M6 checkpoint — Starter Decks

## CURRENT STATE — compositions auditées ST-01..ST-35 (14 octobre 2026, Claude Code)

- **Source des compositions** : `cardgame/scripts/rebuildStarterDecks.ts` (liste auditée avec `cardNumber`/`printingCode`/`quantity`, lue comme texte, jamais exécutée) + porte `scripts/starterAudit/product-evidence.json` (`compositionVerified`). Nouvel extracteur `scripts/game/extract-audited-starter-compositions.ts` → `src/game/cards/starter-compositions.json` (35 decks, ST-36 absent). L'ancien extracteur par noms (garde ajoutée par l'utilisateur) est conservé tel quel. Un produit à plusieurs Leaders (ST-10, ST-13) donne un deck par Leader (`starter-st10-st10-00N`), toujours 1 Leader + 50.
- **Lot A (réconciliation)** : ST-01, 02, 04, 06, 07, 08, 12 identiques à la liste auditée. **ST-03 corrigé** : Sables ST03-015 ×4 et Love-Love Mellow ST03-017 ×2 (l'ancienne résolution par nom donnait OP01-088/OP07-057 ; ces deux cartes restent certifiées mais hors ST-03).
- **Jouables dans `/play` : 17 produits / 19 Starter Decks + 3 decks de référence = 22.** Nouveaux : ST-05, ST-10 (×3 Leaders), ST-11, ST-14, ST-17, ST-18, ST-19, ST-21, ST-23 (ST-03 corrigé). Parties bots complètes sans fallback/refus pour chaque Starter proposé (`tests/game-m6-starter-decks-audited.test.ts`).
- Mesuré : **552 définitions, 387 certificats (+93), registre 272**. Packs : `m6LocalReprintCards.ts` (OP01-025, OP02-034..045), `m6LocalST14Cards.ts`, `m6OfficialST17/18/19/21/23Cards.ts`.
- **Textes officiels anglais** : pour les cartes sans texte anglais local (ou incohérent), snapshot des listes officielles `en.onepiece-cardgame.com/cardlist/?series=5690NN` (ST-13, ST-15..ST-35) par `scripts/game/official-cardlist-en.ts` : HTML brut archivé `docs/game/evidence/m6/sources/cardlist-en/`, lignes au format cardJson dans `cardgame/data/official-en/` (Vie du Leader dans `cost`). Révision `m6-official-en-2026-10-14`. Contrôle : 112 cartes communes avec les lignes anglaises locales, 3 écarts expliqués (OP07-019 erratum, OP11-062/OP12-020 lignes locales françaises).
- **Primitives et règles génériques ajoutées** (aucune logique par numéro) : certification mot-clé seul (`keywordText.ts`), source renvoyée en main par son coût, filtre `noBaseEffect` (FAQ P-011), auras Leader/Stage avec filtres couleur/type/`charactersOnly`/`maxBasePower`, `evaluateCost` séparé (pas de boucle coût↔puissance), conditions `OWN_CHARACTER_COST_AT_LEAST`, `SOURCE_PLAYED_THIS_TURN`, `TRASH_AT_LEAST`, `OWN_CHARACTER_POWER_AT_LEAST`, `minimumFieldDon`/`whenCharacter` (réduction de coût en main), `addCost`/`addPower` jusqu'à la fin du prochain tour adverse (FAQ ST21-015), `moveCard` vers le dessus du deck, `arrangeTopDeck` sans dessous, recherche multi-types/couleur et reste à la défausse, primitives `preventAttack`, `trashCharacter`, `disableBlocker` (manifeste de primitives étendu, anciennes sauvegardes lisibles), protection K.O. `opponentEffectsOnly`, condition [DON!! xN] évaluée au K.O. pour [On K.O.], moment `ON_OPPONENT_ATTACK`, usage `ONCE_PER_TURN_WHEN_CHOSEN` (FAQ OP09-001), remplacement `NAMED_ALLY_KO_BY_EFFECT` (OP09-012), [Blocker] conditionnel (`hasBlockerAbility`, prévu pour ST-25/28/31, pas encore utilisé par une carte certifiée).
- Rapport de couverture réutilisable : `npx tsx scripts/game/starter-coverage.ts [report.json]` (instantané `docs/game/evidence/m6/starter-coverage-2026-10-14.{json,txt}` : 244 cartes uniques non certifiées).
- Build isolé réutilisable : `scripts/game/isolated-build.sh <copie>` (npm ci seulement si `package-lock.json` change).
- **Validations finales réelles** : `npm test` **687/687**, typecheck PASS, lint 0 erreur / 99 avertissements préexistants, build isolé PASS, `git diff --check` PASS, preuves historiques inchangées (hash avant/après). Navigateur (build de production isolé, base jetable `127.0.0.1:55433/op_play_test`) : **18/18 PASS** ST-03, 05, 11, 14, 17, 18, 19, 21, 23 en desktop 1440×900 et mobile paysage 844×390 (`docs/game/evidence/m6/browser-audited-2026-10-14/`). ST-10 (3 decks) : NOT TESTED en navigateur (bots PASS).
- **Blocages restants** : ST-24 et ST-27 compositions non vérifiées (porte de preuve) ; ST-36 absent ; **ST-31** : OP04-016 a un coût « - » sur la liste officielle et en local (coût de lancement indéterminable, rien d'inventé) ; **ST-09** : ST09-010 Ace (remplacement de K.O. en combat avec choix) ; **ST-13** : Vies face visible (règle de remplacement du Leader Luffy, fin de tour, Vie au deck) ; ST-15, 16, 20, 22, 25, 26, 28, 29, 30, 32..35 : mécaniques restantes listées par le rapport de couverture.
- Prochain lot conseillé : [Blocker] conditionnel déjà prêt → ST-25/ST-28 ; puis restrictions d'ajout de Vie et « retiré du terrain » (ST-15, ST25-003), effets différés et « ne se redresse pas » (ST-16), Vies face visible (ST-13, ST-20).
- Aucun commit, push, déploiement, migration ni écriture en base réelle. Rien supprimé dans le workspace (seules mes copies de build temporaires du scratchpad, hors dépôt, avaient été supprimées le 13/10).

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
