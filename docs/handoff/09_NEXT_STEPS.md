# 09 — Prochaines étapes opérationnelles

Priorités au 12 octobre 2026, après la clôture de M3 (`docs/game/M3_REPORT.md`). Aucune étape ci-dessous n'est commencée.

## P0 — Préserver le travail

Le moteur, les tests et les preuves de M1 à M3 ne sont pas suivis par Git. Avant tout nouveau lot, le propriétaire du dépôt doit décider de leur mise sous contrôle de version : commit sur une branche dédiée. Cette opération demande une autorisation explicite.

## P1 — Certification de cartes (M4 proposé)

1. **Définir le modèle de certification par révision.** Chaque révision porte sa propre preuve ; une certification n'est jamais héritée par clonage. Voir le test `M3-1` sur les révisions.
2. **Certifier d'abord les cartes du deck violet et du deck rouge de M3.** Pour chacune : texte, FAQ et errata relus ; toutes les capacités et restrictions exécutables ; tests positifs et négatifs ; scénarios réels. Les cartes sans effet sont les candidates naturelles.
3. **Kaido ST04-001.** Retrouver la question FAQ ST04-016 illisible et le cas « Life adverse à 0 » de la FAQ ST04-001 dans une partie réelle (le test unitaire est impossible par mutation, l'invariant Life l'interdit).

## P2 — Dette technique ciblée

- **Voie Counter legacy** : aligner `payments` et le contrôle `MOVE_DON` du DON!! −1, ou la retirer au profit des profils déclaratifs. Cela demande une décision, car les sauvegardes historiques en dépendent.
- **Parties M0/M1 sans registre** : exiger un exécuteur pour `giveRestedDon`, ou documenter l'interdiction de ces scopes en jeu.
- **Invariant `PRIVATE_INSTANCE_IN_PUBLIC_EVENT`** : à généraliser avant toute carte qui renvoie en main une carte citée publiquement.
- **Ruleset M3** : renouveler la fenêtre de restrictions (`m3-reviewed-subset-2026-10-12`) à chaque mise à jour Bandai.

## P3 — Intégration interface

Seulement sur demande : un adaptateur serveur autoritaire de `/game` vers le moteur pur (`createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame`), sans jamais exposer `GameState`. Préserver le mobile et la PWA, les collections et les decks existants. Aucune migration Prisma sans plan ni autorisation.

## Axe collection (indépendant)

Ouverture de boosters mobile, swipe, cartes rares et monnaie : aucun travail fait pendant M3. Un audit séparé des tests navigateur (`*.browser.mjs`) reste à mener avant toute évolution.
