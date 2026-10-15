# M6 — Passation (Claude Code → Codex)

## CURRENT STATE — ST-24 débloqué sur confirmation utilisateur (15 octobre 2026, Claude Code)

- **Jouables dans `/play` : 35/35 Starter Decks connus (ST-01..ST-35), soit 39 configurations de Leader (ST-10 ×3, ST-13 ×3), plus les 3 decks de référence (42 au total).** ST-36 reste absent : aucune quantité publiée.
- **Provenance de la composition ST-24** : l'utilisateur (propriétaire du projet) a confirmé **ST24-004 Law & Bepo ×2** et **ST24-005 X.Drake ×4**. Il s'agit d'une **confirmation utilisateur, pas d'une source officielle** : Bandai ne publie toujours aucune quantité par carte pour ST-24 (note `BANDAI_REVIEW` conservée). Ces quantités sont déjà celles de la liste auditée (`scripts/rebuildStarterDecks.ts`, inchangé). Dans `scripts/starterAudit/product-evidence.json`, ST-24 passe à `compositionVerified: true` et `reasons: []`, avec une note `USER_CONFIRMATION` datée du 2026-10-15 qui porte les quantités et l'avertissement de provenance. `starter-compositions.json` a été régénéré par l'extracteur non destructif (`extract-audited-starter-compositions.ts <sortie>`) : seule la porte ST-24 change, 1 Leader (OP07-019) + 50 cartes principales.
- Aucune autre composition, règle, définition ni certification n'a changé : les 15 certifications ST-24 existantes sont réutilisées, et les admissions figuraient déjà dans `MUGIWARA_FREE`.
- Tests adaptés :
  - `tests/starter-deck-audit.test.ts` : porte levée seulement par la note `USER_CONFIRMATION`, distincte de `BANDAI_REVIEW` ;
  - `tests/game-m6-starter-compositions.test.ts` : aucun deck non vérifié n'est proposé ; ST-24 donne 1 + 50 cartes avec ×2/×4 ;
  - `tests/game-m6-st24-certification.test.ts` : le deck est proposé avec 51 cartes.
- Partie complète contre le bot (`normal` contre `normal`) : gagnant, 0 fallback, 0 refus (`docs/game/evidence/m6/st24-bot-game.log`).
- Navigateur (build de production isolé, base jetable) : ST-24 **2/2 PASS** en desktop 1440×900 et en mobile paysage 844×390 (`docs/game/evidence/m6/browser-st24-2026-10-15/`, `st24-browser.log`).
- Couverture : `docs/game/evidence/m6/starter-coverage-2026-10-15-st24.{json,txt}` (35/35 produits dans `/play`, 0 carte restante). Totaux : 775 définitions, 631 certificats, registre 534. VF officielle : 359 des 541 cartes uniques ; noms de deck en français pour 21 des 39 configurations.
- Validations : suites ciblées ST-24, compositions et audit 80/80 PASS ; typecheck PASS ; lint 0 erreur / 99 avertissements ; build isolé PASS ; `git diff --check` PASS. `npm test` complet relancé puis **arrêté à la demande de l'utilisateur** après 631 tests OK et 0 échec : la suite complète n'a donc pas été rejouée après le déblocage de ST-24 (dernier passage complet : 876/876, session m6d). Preuves historiques inchangées après l'arrêt (sha256, 632 fichiers).
- Aucun push, déploiement, migration ni écriture en base réelle.

## CURRENT STATE — M6 ST-13/22/27/29/30/32/33/34/35 (14 octobre 2026, Claude Code, session m6d)

- **Jouables dans `/play` : 34 produits Starter / 38 configurations de Leader (ST-10 ×3, ST-13 ×3) + 3 decks de référence = 41.** Seul ST-24 reste bloqué (composition) et ST-36 est absent des données. **Nouveaux dans cette session : ST-13 (×3), ST-22, ST-27, ST-29, ST-30, ST-32, ST-33, ST-34, ST-35.** Couverture : toutes les cartes uniques des 35 Starter connus sont certifiées (0 restante), ST-24 compris (`docs/game/evidence/m6/starter-coverage-2026-10-14-m6d.{json,txt}`).
- Mesuré : **775 définitions, 631 certificats, registre 534.** Packs : `m6OfficialST13/22/24/27/29/30/32/33/34/35Cards.ts` (câblés dans `src/lib/engine/catalog.ts`), admissions ajoutées à `MUGIWARA_FREE.allowedNumbers` (admission seule, autorisée par l'utilisateur ; aucune autre modification du ruleset).
- **Primitives génériques ajoutées** (aucune logique par numéro, toutes refusées si inconnues, continuations JSON) :
  - repos : moments `ON_SOURCE_RESTED`, `ON_CHARACTER_RESTED_BY_OWN_EFFECT`, primitive `preventRest` (« ne peut pas être mis au repos », FAQ EB02-011/OP11-034 : ni attaque, ni [Blocker], ni coût de repos, ni repos par effet), conditions `OWN_RESTED_CARDS_AT_LEAST`, `OPPONENT_RESTED_CHARACTERS_AT_LEAST`, auras `minimumOwnRestedCards`/`whenOwnRestedNamed`/`minimumRestedDon` ;
  - défausse : moment `ON_OWN_HAND_TRASHED`, condition `HAND_TRASH_SOURCE_HAS_TRAIT`, aura `whenOwnHandTrashedThisTurn` ;
  - Vies : règles statiques de Leader `lifeRules` (`FACE_UP_LIFE_TO_DECK_BOTTOM`, `NEGATE_OWN_ON_PLAY`), destination `LIFE_TOP_FACE_UP`, `turnLifeFaceDown`, `playCard` depuis la Vie (événement `LIFE_PLAYED`), `addToLife` depuis la défausse ou « main ou défausse » ; les Vies face visible restent visibles des deux joueurs, les autres restent cachées (tests de projection et de reprise JSON) ;
  - deck adverse : `revealDeckTopCostMatch`, `revealDeckTopMatch`, étape `MODE` avec `chooseValue: 'COST'` (affiché « Coût N » dans `Board.tsx`, une ligne) ; le deck adverse n'est sélectionnable qu'avec `topN` ;
  - combat : `limitAttackTargets`, `UNBLOCKABLE`, `SOURCE_BATTLED_OPPONENT_CHARACTER_THIS_TURN`, `setBasePower` (joueur, ce tour ; plusieurs puissances de base → la plus haute, FAQ ST34-004) ;
  - divers : `negateOnPlay` (FAQ OP09-081), `drawCards.amountFromTrigger`, étape `UNION`, sélecteurs `handOrTrash`, `orNamesAny`, `excludeBinding`, `maxCostFromFieldDon`, `maxCostFromLife: 'TOTAL'`, recherches par coût/puissance/attribut/couleur d'Event, conditions `LEADER_HAS_ATTRIBUTE`, `DECK_AT_LEAST`, `FIELD_DON_AT_MOST_OPPONENT`, `OWN_CHARACTER_COUNT` (types, nom, puissance de base) ; GUARD : défausse de la source (+ pioche), puissance de la source ce tour, Vie retournée face visible, coût « défaussez N cartes » ; protections de K.O. en aura.
  - Les traces `restEvents`/`handTrashes` ne sont enregistrées que si un observateur existe : les traces historiques ne changent pas.
- **Règles vérifiées et corrigées** :
  - FAQ ST24-005 : un effet « à la fin de ce tour » se résout **après** tous les effets [End of Your Turn]. Zone source `delayed` (déclenchée après la file de fin de tour). P-058 (ST-16) corrigé et son certificat cite la FAQ ; le test d'ordre ST-16 a été mis à jour.
  - CR 1.2.1 §8-3-1 et FAQ OP07-031 : une carte mise au repos pour payer un coût d'activation est « mise au repos par votre effet » (Perona, Bartolomeo). Les règles complètes 1.2.1 sont archivées dans `docs/game/evidence/m6/sources/rules/` (`RULES.json`, sha256).
  - FAQ OP11-066 : même lecture « Then » que EB03-017/OP14-112 (Thatch déjà corrigé).
  - FAQ ST30 : « 6000 de puissance » signifie exactement 6000.
- **Source officielle EN** : le décodeur `scripts/game/official-cardlist-en.ts` supprimait les icônes d'attribut `<Slash>`… ; corrigé, seule `data/official-en/cards-ST-32.json` change (6 lignes, filtres d'attribut ST-32).
- **ST-24 / ST-27** :
  - ST-27 : la ligne « OP09-084 Sanjuan Wolf ×4 » de la source secondaire est une coquille pour **OP10-084**. Preuves : les listes officielles ST-27 (EN 569027, JP 550027, FR 622027) contiennent OP10-084 et ST27-004 (deux Sanjuan.Wolf distincts, ×4 et ×2) et aucun OP09-084 ; les totaux par rareté de la page produit (L1, C6, UC2, R4, SR2) et le total de 51 cartes correspondent exactement aux 15 lignes auditées. Porte levée (`compositionVerified: true`, note `BANDAI_CORROBORATION`), `starter-compositions.json` régénéré (seul ST-27 change). Test dédié dans `tests/game-m6-starter-compositions.test.ts`.
  - ST-24 : **reste bloqué**. Les listes Bandai EN/JP/FR confirment les identités (ST24-004 Law & Bepo SR, ST24-005 X.Drake C) et les totaux par rareté (L1, C4, UC5, R3, SR2), mais aucune source Bandai ne publie les quantités par carte et la table secondaire inverse les numéros des lignes ×2 et ×4. Les deux lectures totalisent 51 et respectent les raretés : aucune ne peut être démontrée. Note `BANDAI_REVIEW` ajoutée ; ses 15 cartes sont certifiées, le deck n'est pas proposé.
  - ST-36 : absent (aucune liste de quantités publiée).
- **Localisation** : 527 cartes uniques dans les decks jouables, 345 avec VF officielle, 182 en anglais faute d'impression française archivée. Noms de deck en français pour 20 des 38 configurations. Aucune traduction inventée.
- **Validations réelles** : `npm test` **876/876** (61 min ; les corrections de lint de six fichiers de test, faites après le lancement, ont été revalidées par leurs suites ciblées 207/207) ; typecheck PASS ; lint 0 erreur / 99 avertissements (et 0 erreur sur les nouveaux fichiers de test, hors du périmètre `eslint src`) ; build isolé PASS ; `git diff --check` PASS ; preuves historiques inchangées (sha256 de `docs/game/evidence/` avant/après, 598 fichiers). Parties contre le bot sans fallback ni refus pour chaque Starter proposé (`tests/game-m6-starter-decks-audited.test.ts`).
- **Navigateur** (build de production isolé, base jetable `127.0.0.1:55433/op_play_test`) : **24/24 PASS** (ST-13 ×3, 22, 27, 29, 30, 32, 33, 34, 35 et ST-10 Law, desktop 1440×900 et mobile paysage 844×390) dans `docs/game/evidence/m6/browser-m6d-picker-2026-10-14/`. Le commit tiers 15f499c a remplacé l'écran de sélection (« Choisissez votre équipage » → carte de deck → « Prendre la mer ») : l'ancien script `tests/m6-starters.browser.mjs` ne trouve plus son titre (premier essai 0 PASS, archivé tel quel dans `browser-m6d-2026-10-14/`). Nouveau script `tests/m6-starters-picker.browser.mjs` ; `DECKS` contient des expressions régulières (`ST-13.*Sabo`). L'ancien script est conservé.
- Journaux : `docs/game/evidence/m6/m6d-*.log` ; `m6d-bot-games.log` : 38 parties bot (une par configuration), toutes avec un gagnant, 0 fallback, 0 refus, 12 à 38 s chacune.
- Aucun commit, push, déploiement, migration ni écriture en base réelle. Rien n'a été supprimé.

### Prochaines étapes

1. ST-24 : trouver une source indépendante des quantités (feuille de deck imprimée, photo du produit, liste Bandai JP officielle de tournoi) ; puis basculer `compositionVerified` avec la référence, régénérer `starter-compositions.json` et ajouter l'admission.
2. ST-36 : attendre la publication des quantités.
3. Ruleset `m5-reviewed-subset-2026-10-12` à renouveler avant toute partie réelle (voir CLAUDE.md).

## CURRENT STATE — M6 déblocage ST-09/15/16/20/25/26/28/31 et VF (14 octobre 2026, Claude Code)

- **Jouables dans `/play` : 25 produits Starter / 27 configurations de Leader (ST-10 ×3) + 3 decks de référence = 30.** Produits : ST-01..ST-12, ST-14, ST-15, ST-16, ST-17, ST-18, ST-19, ST-20, ST-21, ST-23, ST-25, ST-26, ST-28, ST-31. **Nouveaux dans cette session : ST-09, ST-15, ST-16, ST-20, ST-25, ST-26, ST-28, ST-31.**
- Mesuré : **635 définitions, 475 certificats, registre 367.** Packs : `m6OfficialST15/16/20/25/26/28/31Cards.ts`, ST09-010 dans `m6LocalST09Cards.ts`.
- **Primitives génériques ajoutées** (aucune logique par numéro) : remplacement GUARD (K.O./retrait, par effet adverse ou en combat avec pause `KO_REPLACEMENT`, actions défausse/Vie/repos/puissance, couverture de lot FAQ ST25-003) ; `lockLifeToHand` + condition `CAN_ADD_LIFE_TO_HAND` (FAQ OP02-023 : coûts « ajoutez une Vie » non payables) ; condition `KO_BY_EFFECT` (On K.O. hors combat) ; `LEADER_TRAIT_INCLUDES`, filtres `traitIncludesAny`/`isSource` ; `lockRefresh` (ne se redresse pas au prochain Refresh, FAQ P-057) ; `scheduleEndOfTurn` (partie différée « à la fin de ce tour » déclenchée comme [End of Your Turn], ordonnée avec les autres, FAQ P-058) ; `addPower.perBinding` (+N par carte) ; auras conditionnelles (cartes reposées, [Uta] reposée, DON!! donnés au total, type du Leader) ; `DON_RETURNED_TOGETHER_AT_LEAST` (DON!! renvoyés par une même résolution, FAQ OP09-061) ; `setBasePower` (FAQ ST26-005) ; `LEADER_MULTICOLORED`, DON!! du terrain adverse ; `whenBindingEmpty` (« 1 DON!! ou 1 Personnage ») ; moment `ON_OPPONENT_EVENT` (FAQ OP11-012) ; zone `stage` dans les sélecteurs ; `returnGivenDon`, `lifeToDeckTop`, `arrangeLife`, `turnLifeFaceUp`, `attackProhibitions`, [Blocker] et mots-clés conditionnels.
- **Règle vérifiée et corrigée** : FAQ EB03-017 et OP14-112 — quand la condition de Leader n'est pas remplie, la partie « Then, … » ne s'applique pas. ST15-004 Thatch corrigé (n'ajoute plus de Vie sans Leader Whitebeard) ; OP09-078 suit la même lecture. Aucun autre cas dans les cartes certifiées (contrôle sur tous les textes officiels).
- **OP04-016 (ST-31)** : la liste officielle affiche « - », mais les images officielles des deux impressions (OP-04 et ST-31) portent un coût **0**. Elles sont archivées dans `docs/game/evidence/m6/sources/images/` (`IMAGES.json`, sha256). Le profil `printedCostFromImage` n'est accepté que si la liste affiche « - », et il ajoute la référence de l'image ; rien n'est supposé.
- **Localisation** : l'affichage français officiel est disponible quand l'impression existe. Decks jouables : 383 cartes uniques, dont 210 avec VF officielle et 173 en anglais faute d'impression française archivée (ST-01..ST-14 et leurs rééditions). Les noms de deck sont en français pour 12 des 27 configurations (ST-15 et suivants). Aucune traduction n'a été inventée.
- **Validations réelles** : `npm test` **770/770** ; typecheck PASS ; lint 0 erreur / 99 avertissements (100 → 99 après retrait d'un import inutilisé) ; build isolé PASS ; `git diff --check` PASS ; preuves historiques inchangées (sha256 de `docs/game/evidence/` avant/après, 525 fichiers). Navigateur sur build de production isolé, base jetable `127.0.0.1:55433/op_play_test` : **22/22 PASS** (ST-09, 10 ×3, 15, 16, 20, 25, 26, 28, 31 en desktop 1440×900 et mobile paysage 844×390), dans `docs/game/evidence/m6/browser-m6c-2026-10-14/`. Journaux : `docs/game/evidence/m6/m6c-*.log` et `starter-coverage-2026-10-14-m6c.txt`.
- **Blocages restants** :
  - ST-24 et ST-27 : composition non vérifiée (porte de preuve, conflits de sources) ;
  - ST-36 : absent (quantités non publiées) ;
  - ST-13 : Vies face visible (Leader Luffy, Vie au deck en fin de tour) ;
  - ST-34 : « choisissez un coût et révélez le dessus du deck adverse », base power 0, Smoothie [Opponent's Turn] [On K.O.] DON!! −1 ;
  - ST-32 : « si un Personnage est mis au repos par votre effet », « ne peut pas être mis au repos », Leader Zoro (redressement conditionnel au combat), filtres d'attribut, Koushirou (GUARD REST_SOURCE sur Personnages à attribut) ;
  - ST-33 : Leader Kuzan (pioche quand une carte est défaussée par un effet {Navy}), « ne peut pas attaquer jusqu'à la fin du prochain End Phase adverse », coût −3 en main « pendant le tour où une carte de votre main est défaussée » ;
  - ST-22, ST-29, ST-30, ST-35 : toutes leurs cartes propres (voir le rapport de couverture).
- Aucun commit, push, déploiement, migration ni écriture en base réelle. Rien n'a été supprimé.

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

## CURRENT STATE — ST-03 via le script de composition (13 octobre 2026)

- Consigne utilisateur : faire confiance à `cardgame/scripts/rebuildStarterDecks.ts` pour les compositions (lu comme texte, jamais exécuté).
- L’extracteur applique désormais aussi le repli inter-sets du script (`resolveByRebuildScriptName`, accepté seulement s’il donne un numéro unique). ST-03 : « Desert Spada » ×4 → OP01-088, « Perfume Femur » ×2 → OP07-057 (aucune carte ST-03 ne porte ces noms).
- OP01-088 et OP07-057 sont implémentées (`m6LocalST03OPCards.ts`), certifiées (`ST03_OP_CERTIFICATIONS`, FAQ OP-01, errata 2023-02-17) et admises au ruleset libre.
- **ST-03 est jouable** dans /play : 8 Starter Decks (ST-01, 02, 03, 04, 06, 07, 08, 12) + 3 decks de référence.
- Mesuré : 470 définitions, 294 certificats, registre 186. `npm test` 556/556, typecheck PASS, lint 0 erreur / 99 avertissements, build isolé PASS, `git diff --check` PASS, preuves inchangées.
- Même avec le script, restent illégaux : ST-05 (5 noms introuvables), ST-09 (couleurs hors Leader, noms manquants), ST-10 (3 Leaders), ST-11 (21 cartes, couleurs hors Leader), ST-13+ (noms ambigus ou manquants).
- Test navigateur de ST-03 non exécuté.

## CURRENT STATE — Claude Code, fast track ST-07..ST-12 (13 octobre 2026, fin de session)

- Branche `feature/tcg-m5`, **rien de commité**, aucun push/déploiement/migration/accès à une base réelle (seule la base jetable locale `127.0.0.1:55433/op_play_test` a reçu un utilisateur de test pour les tests navigateur). Aucune action Git destructive.
- Mesuré : **468 définitions**, **292 certificats** (207 → +85), registre courant 182 définitions d’effets.
- Certifiés : **ST-07 17/17**, **ST-08 15/15**, **ST-12 17/17**, **ST-10 17/17**, **ST-11 5/5** (ST11-001..005 ; les réimpressions OP02 du produit ne sont pas traitées), **ST-09 14/15** — ST09-010 Portgas.D.Ace n'est pas intégré : son remplacement « If this Character would be K.O.'d ... instead » exige un choix pendant le Damage Step (non exécutable).
- **Decks jouables dans `/play` : 7 Starter Decks** — ST-01, ST-02, ST-04, ST-06 (avant) et **ST-07, ST-08, ST-12** (cette session) — plus les 3 decks de référence.
- Bloqués par la composition (cartes prêtes) : ST-03, ST-05 (deux noms ambigus de quantités différentes), ST-09 (13 noms absents de ST-09), ST-10 (3 Leaders, 56 cartes), ST-11 (37 cartes). Une liste officielle de produit ou une confirmation utilisateur est nécessaire.
- ST-12 résolu de façon démontrable : alias `Elephant Tuna → ST12-009` (seul nom local contenant « Elephant », seul Personnage restant, quantité 4) ; « Shishi Sonson » / « Mouton Shot » ↔ ST12-016 / ST12-017 ont chacune la quantité 2 : `equalQuantityGroups` (`starterDecks.ts`) accepte ce groupe sans choisir d'association.

### Validation finale (mesurée)
- `npm test` : **547/547 PASS**. Empreintes SHA-256 de `docs/game/evidence/` identiques avant/après (et identiques au début de session).
- `npm run typecheck` PASS ; `npm run lint` 0 erreur, 99 avertissements préexistants ; `git diff --check` PASS.
- Build isolé (export `git ls-files -co --exclude-standard`, sans `.env`, `npm ci` + `npm run build`) : **PASS**.
- Navigateur (Chrome système, build isolé sur le port 3008, base jetable) : `cardgame/tests/m6-starters.browser.mjs` — **6/6 PASS** : ST-07, ST-08, ST-12 démarrent, plateau atteint, main de 5, pas de débordement horizontal, abandon OK, en bureau 1440×900 et mobile paysage 844×390. Captures : `docs/game/evidence/m6/browser-st07-st12/`. En portrait le plateau affiche « Tournez votre téléphone » (comportement existant). Les choix « Vie dessus/dessous », « Option 1/2 » n'ont été vérifiés qu'en tests moteur, **NOT TESTED** au navigateur.
- Parties bots : `tests/game-m6-starter-decks-07-08-12.test.ts` (9 parties) et `tests/game-m6-certified-decks-09-10-11.test.ts` (5 decks de cartes certifiées ST-09/10/11), sans fallback ni commande refusée.

### Nouvelles briques DSL 1.3.0 (génériques, aucune logique par numéro)
- Conditions : `YOUR_TURN`, `OPPONENT_TURN`, `ALL_OF`, `ANY_OF` (non imbriquées), `LIFE_AT_MOST`, `LIFE_AT_LEAST`, `LIFE_LESS_THAN_OPPONENT`, `OWN_CHARACTERS_AT_MOST`, `ACTIVE_DON_AT_LEAST`, `FIELD_DON_AT_MOST`, `LEADER_NAME_IS`.
- Sélecteur `CARDS` : zones `life` (+ `lifeEnd: TOP | TOP_OR_BOTTOM`) et `leader`, `colorsAny`, `attributesAny`, `traitOrAttribute`, `battledWithSource`, `inBinding` ; main adverse seulement pour un choix `conceal` (face cachée, ST10-010).
- Choix : `reveal: 'CHOOSER'` (regard privé), `conceal`, `skipIfNone` ; options avec `slot` (`LIFE_TOP`, `LIFE_BOTTOM`, `DECK_TOP`, `HAND_CARD`, `MODE`) libellées par `Board.tsx`. Étape `MODE` (« choose one », `chooser: 'OPPONENT'`, garde). Garde `whenBindingNonempty` sur `SEARCH_TOP_DECK`.
- Opérations : `lifeToHand`, `addToLife` (face visible, `side`, `bottomBinding`), `placeLife`, `triggerCardToHand`, `koCharacter` `player: 'ANY'` (lot, curseur `koCursor`) + `resultBinding`, `grantKeyword` `THIS_BATTLE`, `playCard.rested`, `addPower` `UNTIL_START_OF_YOUR_NEXT_TURN` / `UNTIL_END_OF_YOUR_NEXT_TURN`.
- Moments : `ON_DON_RETURNED` (événement public `DON_RETURNED`, émis seulement si le registre l'écoute), `ON_OPPONENT_BLOCKER`. `CHARACTER_BATTLED` aussi pour le Personnage défenseur (porte `battled`) ; Hawkins ST02-010 a désormais `ALL_OF[DON!! x1, YOUR_TURN]`.
- Registre : continus de Leader (`zone: 'leader'`, `duringOpponentTurn`, `maximumOwnLife`, `minimumOwnLife`), `koProtections` `byLeaders` / `minimumAttachedDon` / `maximumOwnLife`. Manifeste de primitives : nouvelle variante, anciennes sauvegardes lisibles.
- Moteur : +X « pendant ce combat » compte pour l'attaquant ; événements `LIFE_TO_HAND` / `LIFE_ADDED` et comptage de Vie recalculé ; Vie face visible admise si `LIFE_ADDED` la nomme, `projectState.lifeFaceUp` seulement s'il y en a ; un Trigger peut finir en main ; invariants de confidentialité : une carte nommée publiquement puis renvoyée en main/deck, ou un DON!! revenu au deck DON!!, reste admis. Le K.O. en lot reste refusé (`KO_BATCH_NOT_IMPLEMENTED`) pour les registres 1.2.0.
- Donnée locale signalée, non modifiée : ST11-005 a le type « 音楽/FILM » dans `carteJson`.

### Fichiers ajoutés / modifiés (cette session)
- Ajoutés : `src/game/cards/m6LocalST07Cards.ts`, `m6LocalST09Cards.ts`, `m6LocalST10Cards.ts`, `m6LocalST11Cards.ts`, `m6LocalST12Cards.ts` ; tests `game-m6-st07/st08/st09/st10/st11/st12-certification.test.ts`, `game-m6-starter-decks-07-08-12.test.ts`, `game-m6-certified-decks-09-10-11.test.ts`, `m6-starters.browser.mjs` ; preuves `docs/game/evidence/m6/browser-st07-st12/`.
- Modifiés : `m6LocalST08Cards.ts`, `m6LocalST02Cards.ts`, `dsl.ts`, `certification.ts`, `starterDecks.ts`, `starterCompositionResolution.ts`, `starter-compositions.json` (régénéré par l'extraction en lecture seule), `rulesets/free.ts`, `effects/contracts.ts`, `effects/runtime.ts`, `effects/operations.ts`, `effects/characteristics.ts`, `core/combat.ts`, `core/game.ts`, `core/invariants.ts`, `core/types.ts`, `lib/engine/catalog.ts`, `lib/engine/view.ts`, `components/play/Board.tsx`, `anim.ts`, `labels.ts` ; tests `game-m4-certification`, `game-m5-certification`, `game-m6-packs`.

### Étapes suivantes
1. Compositions ST-03/ST-05/ST-09/ST-10/ST-11 : liste officielle ou confirmation utilisateur (ST-03 : Desert Spada ×4 / Perfume Femur ×2 ↔ ST03-015 Sables / ST03-017 Love-Love Mellow ; ST-05 : Shishi Odoshi ×2 / Armor Mode ×4 ↔ ST05-016 / ST05-017).
2. ST09-010 Ace : remplacement de K.O. avec choix du contrôleur, en combat comme par effet.
3. Réimpressions OP01/OP02 des produits ST-10/ST-11 si leurs decks deviennent résolvables.
4. Test navigateur d'une partie complète avec choix de Vie et de mode.

## CURRENT STATE — reprise Codex (13 octobre 2026)

- Workspace conservé sur `feature/tcg-m5`; aucune action Git destructive, aucun commit, push, déploiement ou accès à une base n'a eu lieu.
- Vérifié dans le code après reprise : **404 définitions**, **207 certificats**, dont ST-01..ST-06 = 102/102 numéros certifiés.
- Compositions résolues à partir du parseur en lecture seule du manifeste de `scripts/rebuildStarterDecks.ts` : ST-01, ST-02, ST-04 et ST-06 ont chacun 1 Leader + 50 cartes et sont proposés dans `/play`. Le script destructif n'a pas été exécuté. Les quantités Prisma n'ont pas été interrogées pendant cette reprise.
- ST-03 reste bloqué par Desert Spada / Perfume Femur ; ST-05 par Shishi Odoshi Goshojimaki / Armor Mode. Les alternatives sont dans `src/game/cards/starterCompositionResolution.ts` et restent explicitement ambiguës.
- Vérifié : parties bots complètes ST-04 et ST-06 contre le deck rouge de référence, sans fallback ni commande refusée (`tests/game-m6-starter-decks-04-06.test.ts`).
- ST-08 : 5 profils d'effets exécutables déclaratifs (ST08-004, -006, -008, -009, -015), **0 certification**. Tests ciblés 5/5 PASS. Les autres capacités du deck restent non prises en charge; le deck ne peut donc pas être proposé.
- ST-07, ST-09, ST-10, ST-11 et ST-12 restent partiels ou bloqués selon les définitions et compositions locales. ST-22 reste sans fiche locale.
- Tests navigateur desktop/mobile : **NOT TESTED**. Playwright est dépendance présente, mais aucun navigateur Playwright n'est installé et aucun serveur local de test n'était actif.
- Validation finale de cette reprise : **469/469 tests PASS** (`npm test -- --test-reporter=dot`), TypeScript PASS (`npm run typecheck`), ESLint PASS avec 0 erreur et 99 avertissements préexistants, build isolé PASS, `git diff --check` PASS. Les tests n'ont modifié aucun fichier de preuve historique.
- Le premier essai de build isolé a échoué car un ancien `node_modules-ci-attempt` dans la copie temporaire était inclus par le glob TypeScript; ce dossier généré a été déplacé hors de la copie de build puis le build complet a réussi. Le workspace n'a pas été modifié par cette correction.
- Reprise recommandée : commencer ST-07 par une cartographie effet par effet dans `carteJson/ST-07/cards-ST-07.json`. Ses effets principaux nécessitent une primitive générique de déplacement / réorganisation de Life, traitement de Life face visible et choix contrôlé par l'adversaire, puis vérifier l'interaction avec Banish / Double Attack; ces mécanismes ne sont pas couverts par les cinq profils ST-08 et aucune carte ST-07 n'est certifiée ici. Continuer ensuite ST-09..ST-12 en ne certifiant qu'après validation des effets complets.

Les états ci-dessous décrivent l'historique au 13 octobre avant les corrections de composition et le lot ST-08; ils sont conservés comme archive.

Date : 13 octobre 2026. Branche `feature/tcg-m5`. **Rien n'est commité** depuis `b086ee2` : tout le travail M6 (Codex puis Claude) est dans l'arbre de travail. Aucun push, aucun déploiement, aucune modification de base réelle.

Lis d'abord `CLAUDE.md` (règles impératives), puis ce fichier, puis `M6_CHECKPOINT.md`.

## 1. État réel

| Starter | Numéros certifiés | Composition exacte | Proposé dans `/play` | Statut |
|---|---|---|---|---|
| ST-01 | 17/17 | oui (script, 1 + 50) | oui (`starter-st01`) | **PASS** |
| ST-02 | 17/17 | oui (script, 1 + 50) | oui (`starter-st02`) | **PASS** |
| ST-03 | 17/17 | non : 2 noms du script inconnus (« Desert Spada », « Perfume Femur ») | non | **PARTIAL** (cartes PASS, deck BLOCKED) |
| ST-04 | 17/17 | non : « All-Star 'Calamity' » inconnu | non | **PARTIAL** |
| ST-05 | 17/17 | non : 5 noms (« Karina », « Guild Tesoro », « Scarlett », « Shishi Odoshi Goshojimaki », « Armor Mode ») | non | **PARTIAL** |
| ST-06 | 17/17 | non : « Navy Headquarters » | non | **PARTIAL** |

Compteurs mesurés (`engineCatalog()`, `CERTIFICATIONS`) : **399 définitions**, **207 certificats** (120 au début de la session → +87), registre courant 96 définitions d'effets.

Correspondances **proposées, non appliquées** (à faire confirmer par l'utilisateur avant d'ajouter les decks) :
- ST-04 « All-Star 'Calamity' » ×2 → ST04-014 Lead Performer "Disaster" (seul numéro restant).
- ST-06 « Navy Headquarters » ×2 → ST06-017 Navy HQ (seul numéro restant).
- ST-05 : variantes d'orthographe Karina → ST05-005 Carina, Guild Tesoro → ST05-006 Gild Tesoro, Scarlett → ST05-009 Scarlet ; « Shishi Odoshi Goshojimaki » et « Armor Mode » ↔ ST05-016 / ST05-017 (attribution ambiguë).
- ST-03 « Desert Spada » ×4 / « Perfume Femur » ×2 ↔ ST03-015 Sables / ST03-017 Love-Love Mellow (attribution ambiguë).

Un deck n'apparaît dans `/play` que si **toutes** ses cartes sont certifiées **et** si sa composition est entièrement résolue (`src/game/cards/starterDecks.ts`, `src/lib/engine/decks.ts`). Après confirmation, corriger les noms dans l'extraction (pas dans le script destructif) et relancer `npx tsx scripts/game/extract-starter-compositions.ts src/game/cards/starter-compositions.json`.

## 2. Sources et données

- Fiches : `cardgame/carteJson/` uniquement. Les sources officielles relues (FAQ ST-01..04, ST-05, ST-06, errata) sont archivées avec URL et empreintes dans `docs/game/evidence/m6/sources/` (`SOURCES.json`, extraits `.txt`, `errata-st01-st06.json`).
- **Vie des Leaders** : absente des données locales ; lue (à la demande de l'utilisateur) sur les pages officielles de liste de cartes mises en cache le 12/10/2026, et **écrite dans le champ `cost` des Leaders** de 46 fichiers `carteJson` (240 lignes). Preuve : `evidence/m6/sources/leader-life.json`. Pour un Leader, `cost` = Vie. Le pont base ↔ moteur (`bridgeCards`) traite `cost` NULL ou 0 comme « non renseigné ».
- Base : `scripts/game/sync-leader-life.ts` copie ces Vies dans `Card.cost` (à blanc par défaut, `--apply` pour écrire, `--allow-remote` exigé hors localhost). **Jamais exécuté sur Neon.** Les 4 migrations Neon (dont `engine_games`, `engine_bot_level`) ne sont pas appliquées (voir `PREPROD_REPORT.md`).
- Compositions : `src/game/cards/starter-compositions.json` (extraction **en lecture seule** de `scripts/rebuildStarterDecks.ts` ; ne jamais exécuter ce script, il supprime des decks).

## 3. Architecture ajoutée (générique, aucune logique par numéro dans le runtime)

Fichiers de cartes (données + programmes DSL) :
- `src/game/cards/localCards.ts` — projecteur générique ligne `carteJson` → `CardInput` revue (références officielles, Vie de Leader, puissance « - » → 0 signalée).
- `src/game/cards/dsl.ts` — constructeurs réutilisables : `ability`, `upTo`, `ko`, `returnToHand`, `toDeckBottom`, `rest`, `setActive`, `power`, `powerSelf`, `draw`, `drawThenTrash`, `trashFromHand`, `addDon`, `donMinus`, `after`, `playChosen`, `playThisCardSteps`, `lookTopAndPlace`, `bindAll`, `check`, `addCost`, `preventKO`, `grantRush`, `grantDoubleAttack`, `moveFromTrashToHand`, `shuffleDeck`, `opponentTrashesFromHand`, `ownLeaderOrCharacter`.
- Packs : `m6LocalStarterCards.ts` (ST-01, Codex), `m6LocalST02Cards.ts`, `m6LocalST03ST04Cards.ts`, `m6LocalST05ST06Cards.ts`, branchés dans `src/lib/engine/catalog.ts` (`currentPacks`).
- Certificats : `src/game/cards/certification.ts` (`ST01_CERTIFICATIONS`, `ST02_CERTIFICATIONS`, `ST03_ST04_CERTIFICATIONS`, `ST05_ST06_CERTIFICATIONS`) ; admission : `src/game/rulesets/free.ts`.

DSL 1.3.0 (`src/game/effects/contracts.ts`, `runtime.ts`), nouvelles briques :
- Sélecteur **`CARDS`** : `side` (OWN/OPPONENT/ANY), `zone` (characters, leaderOrCharacters, hand, trash, deck, cost, fieldDon), filtres `categories`, `minCost`/`maxCost`, `maxPower` (+`powerBasis`), `rested`, `traitsAny`, `nameIs`/`nameNot`, `hasBlocker` (vrai [Blocker] seulement), `excludeSource`, `topN` (deck). Main/deck/trash/fieldDon : côté OWN seulement ; main/deck : choix PRIVATE obligatoire.
- Champs de choix : `allOrNone` (0 ou X, DON!! −X), `clampMin` (« whenever possible »), `chooser: 'OPPONENT'` ; étapes `BIND_ALL`, `CHECK`.
- Opérations : `returnToHand`, `moveToDeckBottom`, `restCard`, `setActive`, `playCard`, `returnDon`, `grantKeyword`, `arrangeTopDeck`, `addCost`, `preventKO` ; garde `whenBindingNonempty` sur les opérations ; `playSelfFromTrigger.replaceBinding`.
- Conditions : `HAND_AT_LEAST` (+`traitsAny`), `OWN_CHARACTERS_AT_LEAST`, `DON_DECK_AT_LEAST`, `LEADER_HAS_TRAIT`, `FIELD_DON_AT_LEAST`, `OPPONENT_MORE_FIELD_DON`, `BATTLE_OPPONENT_ATTRIBUTE`.
- Moments : `END_OF_YOUR_TURN` (capturé sur `MAIN_ENDED`), `END_OF_BATTLE_WITH_CHARACTER` (événement `CHARACTER_BATTLED`), `ON_BATTLE_PAIRED` (événement `BATTLE_PAIRED` à la fin du Block Step). Ces événements ne sont émis que si le registre contient une capacité qui les écoute (traces historiques inchangées).
- Registre : effets continus conditionnels et **auras** (`minimumOwnCharacters`, `duringYourTurn`, `sourceRested`, `targets.traitsAny`), mots-clés conditionnels `whenAnyCharacterCostAtMost`, protections `koProtections` (BATTLE/EFFECT, `minimumFieldDon`). Runtime : `keywordGrants`, `costModifiers`, `koImmunities`. Limite du registre : 1024 définitions.
- Manifeste de primitives 1.3.0 : une variante `starterPrimitiveList` supplémentaire ; les anciennes sauvegardes restent lisibles.

Règles corrigées (avec test) :
- CR §3-7-6-1 / §3-8-5-1 : jouer dans une zone pleine défausse d'abord 1 Personnage choisi (traitement de règle, pas un K.O.).
- Le [Trigger] d'un Événement ne paie pas son coût imprimé (FAQ ST02-015) ; avant, il était annulé faute de DON!!.
- Un combat dont l'attaquant ou la cible quitte le terrain se termine sans effet (FAQ ST03-003/016, règles).
- Capture des déclencheurs par événement (un même Personnage nommé par deux événements n'est plus capturé deux fois).
- Invariant de confidentialité : une carte publique déplacée vers main/deck par une opération tracée reste admise.
- Un Événement [Counter] est certifiable s'il nomme son programme COUNTER testé (`certificationErrors`).

Bots et `/play` : choix génériques ; `allOrNone` géré par les bots (paient X) et par l'interface (`Board.tsx`, validation 0 ou X).

## 4. Recette pour intégrer une carte (ST-07 et suivants)

1. Lire la ligne `carteJson` et les entrées FAQ / errata. Les extraits texte de **toutes** les FAQ officielles téléchargées le 12/10/2026 (ST, OP, EB, PRB, promos, règles) sont dans `evidence/m6/sources/` avec URL et SHA-256 du PDF (`SOURCES.json`) ; l'errata officiel complet (toutes séries) est extrait dans `errata-all.json` (`after` = texte en vigueur) ; comparer le texte `carteJson` au texte après erratum (ex. ST04-001 : la fiche locale garde l'ancien texte).
2. Écrire les capacités avec `dsl.ts` dans un pack `m6LocalSTxx…Cards.ts` ; profil `localCard(row, set, path, revision, faqUrl, reviewedAt, { abilityIds, blocker, counterEvent, keywords })`. Une capacité non exécutable ⇒ **ne pas projeter la carte** (jamais d'effet ignoré).
3. Ajouter le pack dans `catalog.ts`.
4. Tests : `tests/helpers/m6.ts` (`newGame`, `deckFor`, `toMain`, `put`, `inHand`, `attachDon`, `playCard`, `startEffect`, `choose`, `attack`, `finishBattle`, `roundTrip`…). Un test par décision FAQ + cas négatifs + `roundTrip` ; titres sans apostrophe échappée (le vérificateur M4 cherche le titre littéral).
5. Certificat dans `certification.ts` : une entrée `declarative` par carte (regroupant ses capacités déclaratives), `trigger`/`counterEvent`/`blocker` selon le cas ; ajouter le lot à l'exclusion de `tests/game-m4-certification.test.ts` (et `game-m5-certification` pour les révisions M5).
6. Admettre les numéros dans `free.ts` seulement une fois certifiés.

## 5. Validation (fin de session Claude, résultats réels)

| Contrôle | Résultat | Journal |
|---|---|---|
| `npm test` | **459/459 PASS**, 0 skip/todo ; preuves historiques (hors m6) identiques avant/après | `evidence/m6/claude-lots-abc-npm-test.log` |
| typecheck | PASS | `claude-lots-abc-typecheck.log` |
| lint | 0 erreur, 99 avertissements (antérieurs) | `claude-lots-abc-lint.log` |
| build isolé (fichiers suivis + non suivis non ignorés, sans `.env`, `npm ci` + `vercel-build`) | PASS | `claude-lots-abc-isolated-build.log` |
| `git diff --check` | PASS | — |
| Parties complètes bots (ST-01, ST-02 exacts, 4 niveaux/graines chacun) | gagnant à chaque partie, 0 repli, 0 refus | tests `game-m6-st01/st02-certification` |

**Non fait** : tests navigateur desktop/mobile des decks `starter-st01`/`starter-st02` (exigés pour la certification complète d'un deck dans la mission) ; parties bots pour ST-03..06 (compositions bloquées).

## 6. Pièges connus

- `npm test` **réécrit** des preuves JSON (17 historiques ; les tests M6 de Codex réécrivent aussi `evidence/m6/st01-*`). Toujours hacher `docs/game/evidence` avant/après ; restaurer depuis `git show HEAD:<fichier>` si une preuve suivie change.
- La connexion Credentials est limitée à 10 tentatives / 10 min / IP (tests navigateur répétés → redirection `/login`).
- `deckFor` (harnais) met 3 exemplaires par défaut ; au tour 2, le second joueur ne peut pas attaquer ; chaque commande renvoie un **nouvel** état (ne pas réutiliser une référence de joueur d'avant la commande).
- Le serveur local de test (port 3007, base temporaire 127.0.0.1:55433) est hors dépôt.

## 7. Prochain lot recommandé

1. Faire confirmer les correspondances de noms (§1) puis proposer ST-03..ST-06 dans `/play`, avec parties bots et tests navigateur desktop/mobile pour les 6 decks.
2. ST-07 à ST-09 (FAQ en cache à archiver), puis ST-10+.
3. Appliquer `sync-leader-life.ts` et les migrations sur une base de préproduction confirmée (autorisation explicite requise).
