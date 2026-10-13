# M6 — Certification des cartes

## CURRENT STATE — fin des lots A, B, C (13 octobre 2026, Claude Code) — voir `M6_HANDOFF.md`

- **ST-01 à ST-06 : 102/102 numéros certifiés** (399 définitions, 207 certificats). Decks proposés dans `/play` : `starter-st01`, `starter-st02` (compositions exactes résolues). ST-03..ST-06 : cartes certifiées, decks bloqués par des noms non résolus dans `scripts/rebuildStarterDecks.ts` (correspondances proposées dans `M6_HANDOFF.md`, non appliquées).
- Validation finale réelle : `npm test` 459/459, typecheck PASS, lint 0 erreur / 99 avertissements, build isolé PASS, `git diff --check` PASS, preuves historiques inchangées. Tests navigateur des Starter Decks : **non faits**.

## CURRENT STATE — 13 octobre 2026

Le catalogue compilé a maintenant **342 définitions et 342 printings** (mesure réexécutée depuis `engineCatalog()` pendant cette session). Les 17 numéros ST-01 sont reconnus; ses profils DSL locaux couvrent douze cartes à effet dans les scénarios ciblés. Le nombre de certificats explicites reste **120** : aucun profil local ST de ce lot n'est certifié (`faqChecked=false`, `errataChecked=false`, `DATA_VALID_EFFECT_PENDING`) ni ajouté à `MUGIWARA_FREE`. Les quatre certifications récentes OP01-006, OP01-007, OP01-016 et OP06-013 sont conservées. Les tests d'exécution du DSL ne remplacent pas la vérification réglementaire.

Depuis cette mesure, le profil local `ST02-005 Killer` et son sélecteur générique ont été ajoutés sans validation (pas de tests intermédiaires sur le prochain ST, selon la consigne). Le total courant du catalogue n'a donc pas été recalculé; le compteur de certifications reste le dernier compteur observé, **120**, et Killer n'est pas certifié.

Les champs d'examen peuvent désormais rester `false` pendant la normalisation d'un pack local; cette transformation rend les données compilables, sans produire de certification. `certificationErrors()` et l'allowlist du ruleset continuent de distinguer une fiche importée d'une carte jouable.

L'inventaire source local ST-01..ST-36 est dans `M6_STARTER_MATRIX.md`. ST-22 est absent de `cardJson`, mais la liste de composition le mentionne dans `scripts/rebuildStarterDecks.ts`. Les quantités sont aussi conservées par Prisma dans `DeckCard.quantity`; la base configurée localement n'a pas répondu sur `localhost:5432`, donc les lignes persistées n'ont pas été lues. Aucun Starter Deck n'est certifié complet ou débloqué.

## Règle de certification

`src/game/cards/certification.ts` est la source effective de `PLAYABLE_VERIFIED`. Chaque certificat nomme une révision exacte, un ruleset, des sources de texte/FAQ/errata datées, les capacités couvertes et les titres des tests réels. Une entrée historique `playabilityStatus` seule ne certifie rien. Le validateur bloque les références incohérentes, les tests absents, les capacités supplémentaires et les conflits connus.

Un deck jouable doit en plus respecter `rulesets/decks.ts`, avoir un Leader compatible et ne contenir aucune capacité requise silencieusement ignorée. Les succès de simulation M3/M5 ne transforment pas automatiquement toutes les cartes du deck en cartes certifiées.

## État actuel calculé

- Définitions reconnues par `engineCatalog()`: **342** (mesure courante; les nombres plus anciens ci-dessous sont historiques).
- Révisions avec certificat explicite: **120**.
- Cartes M5 (296) retenues: 257 sans effet et 39 avec [Blocker] uniquement; 93 révisions rouge/violet ont été certifiées par M5.
- 23 certificats historiques M4 couvrent des définitions examinées de M0/M3.
- Aucune certification de la fixture `TEST-FUTURE-SET` M6.
- Aucun deck ST-01 à ST-36 complet n'est certifié par le seul inventaire de cartes. Les données d'extension M5 ne représentent qu'un échantillon réduit de plusieurs starters.
- Nouvelles certifications M6 : `OP01-006@m6-2026-10-12` (Otama, On Play −2000) et `OP01-007@m6-2026-10-12` (Caribou, On K.O. jusqu'à 1 Character adverse de puissance actuelle ≤4000). Les deux sont testées dans le moteur de jeu et autorisées par `MUGIWARA_FREE`.
- ST-01 : 17/17 numéros locaux reconnus, 5 cartes certifiées préexistantes, 12 profils à effet non certifiés. Aucun Starter Deck complet nouvellement débloqué.
- `OP01-016@m3-2026-10-12` est maintenant certifiée pour sa recherche On Play. La définition existait déjà; le lot ajoute un test MUGIWARA_FREE en plus des tests M3-2 de sélection, exclusion, ordre, deck court/vide, confidentialité et reprise.
- `OP06-013@official-2026-10-11` est certifiée pour ses deux capacités requises: On Play recherche FILM et Trigger exécute la même capacité lors d'un dégât Life. Les tests couvrent le choix privé et la restauration de l'état suspendu; un scénario interséries reprend ensuite le flux de dégâts.

La traduction française enregistrée pour ces profils est `non_official_review_required`; la certification moteur porte sur le texte anglais officiel, les caractéristiques normalisées, les définitions et les comportements testés. Pour OP01-006, le lecteur de texte Bandai affiche `-` pour la puissance; le profil local utilise 0 comme valeur imprimée, une normalisation de données signalée dans la provenance.

## Ce qui manque pour élargir

Pour chaque nouvelle révision : texte officiel et traduction clairement étiquetée, FAQ/errata, définition DSL de toutes ses capacités et restrictions, test de refus, tests d'interaction et preuve d'exécution dans un deck réglementairement légal. Un numéro reconnu ou une mécanique déclarable ne suffit pas.
