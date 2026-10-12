# M0 — Matrice de couverture et conformité

Contrôle du 10 octobre 2026. PASS concerne les données et spécifications, jamais une exécution de partie.

| Numéro | Variantes locales | Caractéristiques / texte | FAQ et errata consultés | Effets typés | Exécution |
|---|---:|---|---|---|---|
| OP01-010 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| OP01-012 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| OP01-018 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| OP01-023 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| P-012 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| P-015 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| P-016 | 2 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| ST01-001 | 1 | PASS | PASS | giveRestedDon — PASS | NOT_TESTED : moteur non implémenté |
| ST01-003 | 1 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| ST01-006 | 9 | PASS | PASS | blocker — PASS | NOT_TESTED : moteur non implémenté |
| ST01-007 | 6 | PASS | PASS | giveRestedDon — PASS | NOT_TESTED : moteur non implémenté |
| ST01-008 | 3 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| ST01-009 | 2 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |
| ST01-010 | 3 | PASS | PASS | Absence vérifiée — PASS | NOT_TESTED : moteur non implémenté |

Les références exactes, dates, textes originaux et traductions provisoires sont dans `cardgame/src/game/cards/reviewedCards.ts`. Une absence d’entrée individuelle dans une FAQ ne constitue pas une FAQ nouvelle : elle est consignée comme telle.

ST01-001 et ST01-007 : choix de zéro ou un DON!! épuisé, une fois par tour ; les DON!! attachés sont exclus. Nami peut être la cible de son propre effet. ST01-006 : Blocker devra être résolu dans la fenêtre dédiée au blocage, avec épuisement du Personnage. Aucun interpréteur de texte libre.

Les 11 autres définitions ont une absence de texte d’effet et de Trigger vérifiée. Les noms et formulations FR restent non officiels (`non_official_review_required`). Les codes de traits et attributs restent canoniques pour le moteur.

## Couverture transversale

| Contrôle | Résultat | Preuve |
|---|---|---|
| Vie explicite des 139 Leaders / 284 variantes | PASS | `evidence/leader-life.json` et test réel |
| Multicolore, alias, illustration distincte | PASS | `tests/game-m0.test.ts` |
| Null / zéro, valeurs manquantes, conflits | PASS | `tests/game-m0.test.ts` |
| Limite par numéro entre illustrations | PASS | test de composition |
| Restrictions actives, futures, paires, expiration | PASS | tests de ruleset daté |
| Exemple : 1 Leader + 50 cartes principales | PASS (composition) | `evidence/m0-preparation.json` |
| Autorisation de jouer avec effets non implémentés | PASS : refus attendu | 3 UNSUPPORTED_EFFECT dans la préparation |
| Partie complète, DON deck et transitions | NOT_TESTED | Prévu M1–M3 |
| Conformité compétitive Standard | BLOCKED | Région / format / blocs à sélectionner |
| Collections, decks, boosters en base | NOT_TESTED | Aucune base connectée ou modifiée |
| Appareils physiques PC / iOS / Android / tablette | NOT_TESTED | Aucune interface créée |
