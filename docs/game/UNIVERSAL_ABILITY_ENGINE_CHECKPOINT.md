# Checkpoint — Universal Ability Engine

## CURRENT STATE — 2026-10-12

Cette section est l’unique état opérationnel courant; les comptes et affirmations des sections datées plus bas sont des archives historiques, parfois contradictoires, et ne doivent pas être repris comme état présent sans nouvelle vérification.

- M3 est **PARTIAL / en cours**, pas terminé.
- Ajouts locaux visibles: `cards/m3Abilities.ts`, modifications de `cards/types.ts`, `cards/adapter.ts`, `effects/contracts.ts`, `effects/runtime.ts`, `core/combat.ts`, tests `tests/game-m3.test.ts` et `docs/game/M3_ROADMAP.md`.
- Tests M3 ciblés : 4/4 PASS le 2026-10-12. Suite complète courante post-M3 : NOT TESTED; dernier baseline complet avant M3 : 265/265 PASS.
- TypeScript : PASS le 2026-10-12; ESLint : PASS, 0 erreur et 99 avertissements. Build post-M3 et `git diff --check` post-M3 : NOT TESTED.
- Le profil déclaratif de Counter et les filtres de recherche sont des sous-ensembles, pas une implémentation universelle. `ST04-016` Blast Breath reste `DATA_VALID_EFFECT_PENDING`; aucun deck violet légal ni partie complète n’a été vérifié.
- Aucun statut de carte n’est nouvellement certifié par M3. Les certifications OP06 du rapport historique ne certifient pas automatiquement les nouveaux profils clonés/modifiés; contrôler notamment le `playabilityStatus` copié par `M3_ABILITY_CARDS`.
- La passation destinée à Claude Code est dans `docs/handoff/`; état Git détaillé dans `docs/handoff/08_GIT_AND_WORKSPACE.md`.

Mis à jour le 2026-10-11. Branche `maintenance/catalog-rebuild`. Pas de commit, push ou déploiement. Préserver les changements préexistants et les fichiers non suivis indiqués par `git status`.

## Terminé dans cette session

- Audit vérifié des modules : `core/game.ts`, `core/combat.ts`, `core/types.ts`, `effects/contracts.ts`, `effects/runtime.ts`, `effects/scheduler.ts`, les définitions labo et `tests/game-m2a.test.ts`.
- Créé `ABILITY_COVERAGE_MATRIX.md` sur preuves locales : catalogue 2 667 numéros / 4 179 variantes / 74 groupes / 485 variantes multi-groupes; aucun chiffre de texte heuristique interprété comme certification.
- Créé `ABILITY_REGISTRY.md` séparant timings, mots-clés, primitives, conditions et sélecteurs.
- Créé `UNIVERSAL_ABILITY_ENGINE_PLAN.md`.
- Implémenté les timings déclaratifs `WHEN_ATTACKING` et `ON_BLOCK` dans les contrats d'effets et la capture d'événements confirmés. Les choix interrompent bien les commandes de combat; les choix privés n'exposent ni ID ni options à l'adversaire.
- Préservé le format de cause historique `:played:` pour les triggers `ON_PLAY`.
- Ajouté deux tests dans `tests/game-m2a.test.ts`; chaque test ciblé passe individuellement. Tests totaux pré-changements : 248/248 PASS; TypeScript PASS; ESLint 0 erreur / 99 avertissements préexistants.

## Vérifications exécutées après le dernier patch

Ces commandes ont maintenant toutes été rejouées après le dernier changement de code : **PASS**.

- `node --import tsx --test --test-name-pattern='universal engine:' tests/game-m2a.test.ts` — 2/2 PASS.
- `npm test` — 250/250 PASS.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS, 0 erreur / 99 avertissements préexistants.
- `git diff --check` — PASS (journal vide; attention, les sources du moteur sont préexistantes non suivies par Git dans ce workspace).
- Build isolé — PASS après une première tentative bloquée par DNS `fonts.googleapis.com`; la relance autorisée a compilé le build dans `/private/tmp/universal-ability-build.T3JCYv/cardgame`. Journaux dans `evidence/universal-ability/`.
- Traces JSON ciblées : `when-attacking.json` et `on-block.json`.

```bash
cd cardgame
node --import tsx --test --test-name-pattern='universal engine:' tests/game-m2a.test.ts
npm test
npm run typecheck
npm run lint
```

Le build a été réalisé exclusivement depuis la copie sous `/private/tmp`, jamais dans le dossier source, pour préserver `.next` et le serveur local. Refaire un build seulement après des modifications runtime ultérieures.

## Travaux restant

1. Relancer la suite complète, typecheck, lint et `git diff --check`; corriger toute régression.
2. Ajouter les timings `WHEN_ATTACKED` et `ON_OPPONENT_ATTACK` uniquement avec capture réglementaire correcte des sources et ordre établi.
3. Concevoir la suspension des opérations d'attaque si une capacité déplace attaquant/cible; la règle §7-1.1 doit mener à End of Battle si la présence réglementaire ne tient plus.
4. Implémenter Trigger comme choix Life privé et continuation, avec règles §§8-6-2 et 10-1-5 revérifiées.
5. Généraliser les Counter Events au lieu d'étendre la règle particulière Blast Breath.
6. Ajouter les primitives DSL par familles et leurs tests négatifs/interactions/reprise.
7. Revoir les définitions et textes officiels de plusieurs cartes de séries différentes; pas de `PLAYABLE_VERIFIED` tant qu'une carte entière n'est pas couverte.
8. Produire les rapports d'état par famille et une matrice chiffrée des capacités (les 56 classes antérieures sont heuristiques, pas une mesure réglementaire).
9. Build de production depuis copie isolée; archiver le résultat.

## Limites actuelles

Le travail ne termine pas la mission complète. `WHEN_ATTACKING`/`ON_BLOCK` sont des chemins techniques avec définition déclarative de test, non des cartes certifiées. Trigger est toujours refusé. Double Attack + Banish avec chaque Trigger, coûts alternatifs, recherche, reveal/shuffle, définitions complètes de Counter Events et conversion progressive du catalogue restent à implémenter. Les compteurs de cartes de la couverture proviennent d'un audit local daté 2026-10-10; aucun accès ou import de base de données n'a été effectué.

## État mis à jour après reprise — 2026-10-11

Cette section remplace les limites opérationnelles ci-dessus, qui décrivaient le checkpoint avant la reprise.

- Combat officiel intégré testé : OP06-009 Shuraiya → OP06-017 Meteor-Strike of Love → attaque Life → Trigger OP06-013, recherche FILM, choix privé, ordre sous le deck et reprise JSON.
- OP06-009 et OP06-013 sont les seules définitions marquées `PLAYABLE_VERIFIED` dans ce périmètre.
- OP06-018 Trigger fonctionne, mais son effet Main reste absent. OP06-017 Main reste absent. Ces cartes ne sont pas certifiées jouables.
- `SEARCH_TOP_DECK` est désormais un pas déclaratif suspensible. `drawCards` existait déjà. Le mélange générique et le mouvement libre entre toutes les zones restent à faire.
- Tests : 259/259 PASS; TypeScript PASS; ESLint 0 erreur / 99 avertissements; build isolé PASS; `git diff --check` PASS.
- Rapport détaillé : `docs/game/UNIVERSAL_ABILITY_ENGINE_REPORT.md`. Traces finales dans `docs/game/evidence/universal-ability/`.
- Aucun changement base de données, commit, push ou déploiement.

Travaux ensuite : versionner et tester les primitives génériques manquantes, compléter les modes Main des Events retenus, puis élargir les profils officiels au moyen de decks légaux et de tests interséries. Ne pas présenter la couverture actuelle comme universelle.

## Reprise Universal Ability Engine — Main et primitives génériques

Mise à jour le 2026-10-11. Cette section remplace les travaux ensuite ci-dessus pour le lot demandé.

- Implémenté DSL 1.3.0 : `[Main]` et `[Activate: Main]`, paiement d'Event et de coût déclaré, source Main, Once Per Turn; primitives `SEARCH_TOP_DECK`, `REVEAL_BINDING`, `SHUFFLE_DECK` déterministe et `moveCard` contrôlé par audience.
- OP06-017 et OP06-018 ont leurs capacités Main ajoutées et reliées aux profils officiels. La FAQ OP06 confirme notamment les cibles différentes permises par l'effet Main d'OP06-018. Les deux sont maintenant `PLAYABLE_VERIFIED` dans le périmètre du laboratoire.
- OP06-009 et OP06-013 conservent leur certification. ST04-016 reste `DATA_VALID_EFFECT_PENDING` : le profil Blast Breath n'a pas été vérifié dans un deck violet légal complet.
- Une définition déclarative `TEST-FUTURE-SET` combine recherches successives, sélection facultative, révélation, déplacement, shuffle, choix privés et restauration JSON. Le cas deck vide est exercé à la frontière runtime, puis la règle de défaite est appliquée sans commande de jeu illégale.
- Validation finale : `npm test` **265/265 PASS** (259 tests de référence conservés); TypeScript **PASS**; ESLint **PASS**, 0 erreur et 99 avertissements; build isolé **PASS**; `git diff --check` **PASS**. Journaux renouvelés dans `docs/game/evidence/universal-ability/`.
- Rapport de reprise : `docs/game/UNIVERSAL_ABILITY_ENGINE_REPORT.md`. Matrice et registre actualisés : `ABILITY_COVERAGE_MATRIX.md`, `ABILITY_REGISTRY.md`.
- Limites maintenues : conversion générique des Counter Events, recherche libre hors dessus du deck, couverture complète des coûts alternatifs, et certification ST04-016 nécessitent encore des validations. Aucun changement DB/UI/booster/collection, commit, push ou déploiement.
