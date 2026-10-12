# M2.5 — capacités automatiques de combat

**Verdict : PARTIAL.**

`ATTACK_DECLARED` et `BLOCKER_ACTIVATED` sont des événements publics confirmés, mais ils ne sont pas branchés au scheduler M1.5D pour de nouveaux timings de combat. Le DSL/runtime n'exécute donc pas encore les capacités `When Attacking`, `On Block` ou `When Attacked`. Les conditions et cascades ne sont pas déclarées jouables.

Le noyau conserve le passage immédiat à la fenêtre Blocker lorsqu'aucun effet ne suspend le combat. Aucun état d'étape Attack vide n'est ajouté. Voir Comprehensive Rules §7-1-1.

**Tests :** le test historique de déclaration et de reprise passe; aucun scénario de carte réelle `When Attacking` ou `On Block` n'a été exécuté dans M2.5. **PASS** pour non-régression; **NOT_TESTED** pour l'exécution des capacités automatiques.
