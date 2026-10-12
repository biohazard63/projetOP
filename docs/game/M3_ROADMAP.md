# M3 — plan d’exécution

## CURRENT STATE — 2026-10-12 (clôture)

**COMPLETE** pour M3-1 à M3-5 : voir `M3_REPORT.md`. `npm test` 314/314, typecheck PASS, lint 0 erreur (99 avertissements), build isolé PASS, partie complète de référence reproductible (`evidence/m3/full-game-trace.json`). Aucun `PLAYABLE_VERIFIED` ajouté. L'état « PARTIAL » ci-dessous décrit la reprise du matin, conservé pour l'historique.

### Historique — reprise du matin

État après les changements locaux du lot M3 : **PARTIAL**. Quatre tests ciblés dans `cardgame/tests/game-m3.test.ts` passent; `npm run typecheck` et `npm run lint` passent (0 erreur, 99 avertissements). `git diff --check` passe sur les fichiers suivis et les documents de handoff ont passé un scan des espaces blancs; les sources moteur non suivies ne sont pas couvertes. La suite complète post-M3, le build post-M3, un deck violet légal Blast Breath et une partie complète ne sont pas testés. Aucun nouveau `PLAYABLE_VERIFIED`. Le transfert complet et les tâches restantes sont décrits sous `docs/handoff/`.

Référence constatée le 12 octobre 2026 : 265/265 tests PASS (`/private/tmp/m3-baseline.log`). Modifications préexistantes conservées; aucun changement de base, interface, catalogue, commit ou déploiement.

1. Counter Events : ajouter un profil déclaratif opt-in, conserver les profils historiques pour les sauvegardes; exécuter le programme via l’interpréteur et les choix existants. Séparer paiement imprimé, coût facultatif et effet. Tester refus initial, interruption après paiement, reprise et zéro cible.
2. Recherche : filtres déclaratifs, contrôle des continuations et déplacements; tests de confidentialité, recherches successives et absence de candidat. Ne pas généraliser les déplacements vers Life/terrain sans procédure appropriée.
3. Cartes : vérifier textes/FAQ/errata de Blast Breath et des nouveaux candidats; conserver un statut restrictif en l’absence de deck légal ou d’interaction vérifiée.
4. Intégration : scénarios interséries et partie par commandes publiques depuis setup, sans mutation des zones dans ce scénario.
5. Vérification : suite historique et nouveaux tests, TypeScript, ESLint, build isolé, diff; matrice, traces et checkpoint unique.

Arbitrage : les extensions déclaratives restent opt-in; les définitions et sauvegardes historiques ne sont pas réécrites. Aucun statut PLAYABLE_VERIFIED supplémentaire sans preuve.
