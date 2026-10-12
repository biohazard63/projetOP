Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Certification de jouabilité

| Statut | Condition | Autorisation runtime |
|---|---|---|
| PLAYABLE_VERIFIED | Caractéristiques/texte/FAQ/errata contrôlés, toutes clauses compilées, primitives présentes, tests/interaction gates PASS dans ruleset/version précis | Oui dans périmètre certifié, jamais tous formats par extrapolation |
| DATA_VALID_EFFECT_PENDING | Données réglementaires suffisantes ; traduction/IR/interpréteur/tests encore absents | Non |
| UNSUPPORTED_MECHANIC | Données valides, au moins primitive/fenêtre requise absente | Non, nommer ce qui manque |
| AMBIGUOUS_RULE | Sens, ordre, durée ou interaction non arbitrés par sources disponibles | Non pour périmètre affecté |
| INVALID_DATA | Identité/champ/conflit/texte indispensable incomplet | Non |

Statut par `(number, revision, rulesetHash, engineVersion, primitiveManifestHash)` avec dossier de preuves, date/relecteur/sourcehashes. Une carte peut avoir plusieurs blockers : diagnostic conserve tous, statut principal INVALID_DATA puis AMBIGUOUS_RULE puis UNSUPPORTED_MECHANIC puis PENDING, sans effacer le détail.

Certification distincte de disponibilité en collection, propriété, admissibilité dans un deck sauvegardé, légalité de composition et exécution. Ne pas supprimer les cartes historiques non certifiées ; empêcher leur lancement automatique avec message précis. Pas de transformation carte inconnue→vanilla.

## Situation M0/M1 réelle

14 définitions relues (11 sans effet, trois avec specs), 33 illustrations, 29 IDs du snapshot. Vie Leaders vérifiée dans sidecar ≠ toutes capacités Leaders contrôlées. Deux effectKinds M0, zéro handler d'effet ; M1.5 accepte seulement leurs actions de base sous scope BASIC_TURNS et garde automaticPlayReady=false. Ce mode laboratoire ne vaut pas PLAYABLE_VERIFIED ni partie officielle complète.

Même les 11 cartes vanilla ne sont pas globalement certifiées : combat, symbol Counter et victoire par dégâts ne sont pas implémentés. Un ruleset qui ajoute un string dans capabilities ne peut pas ouvrir l'accès. M0 restrictedWindow10–12/10/2026 n'est pas une certification Standard actuelle générale.

## Porte de certification

1. Aucune caractéristique inconnue indispensable ; originales conservées, noms/traits alias validés.
2. Absence d'effet explicitement relue ou couverture de toutes clauses y compris Trigger/construction/zone.
3. Compilation déterministe et chaque primitive versionnée présente.
4. Tests capacité : conditions/coûts/choix zéro/interruption/présence/durée/cible ; FAQ applicables.
5. Intégration avec phases/combat/contrôles règles/évaluateur/projections et interactions représentatives.
6. Tests de deck selon date/région/format, exclusions connues documentées.
7. Evidence hash + signature de validation humaine/CI ; pas auto-certification depuis texte français ou rareté.

Une mise à jour textuelle invalide le certificat de la nouvelle révision jusqu'à revue. Ancien certificat/pins conservés pour relecture. Unknown primitive/missing bundle en restauration donne refus explicite et snapshot intact.

## Situation après M1.5B

Deux primitives synthétiques s'exécutent désormais. Cela n'ajoute aucune carte PLAYABLE_VERIFIED : bindings de carte réelle, Blocker et capacités M0 restent inactivables, automaticPlayReady=false. Le statut de collection/deck n'est pas modifié. Voir [M1_5B_REPORT.md](M1_5B_REPORT.md).
