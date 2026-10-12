# Plan d'exécution — moteur universel des capacités

## Ordre et lots

1. Audit des états réels et publication de `ABILITY_COVERAGE_MATRIX.md` / `ABILITY_REGISTRY.md`.
2. Brancher les fenêtres combat confirmées au scheduler actuel; tests d'attaque, Blocker, suspension et confidentialité.
3. Finir le pipeline des événements et opérations de combat; connecter les fenêtres `WHEN_ATTACKED` et réponse adverse seulement après vérification des règles/version.
4. Introduire progressivement les opérations génériques de mouvement et de pioche dans le DSL, chaque ajout accompagné de refus, idempotence, zone et projection.
5. Modéliser une Life endommagée et Trigger comme continuation JSON, avec révélation au bon joueur et reprise sans double résolution.
6. Compiler les Counter Events et coûts seulement à partir de définitions revues; garder le sous-ensemble Blast Breath documenté jusqu'à généralisation testée.
7. Développer évaluateur commun caractéristiques et durées; cycles non supportés refusés explicitement.
8. Tester des cartes vérifiées multi-séries puis classer le catalogue par couverture sans certification automatique.
9. Tests complets, TypeScript, ESLint, `git diff --check` et build exclusivement en copie isolée.

## Règles d'exécution

- Pas de branche par numéro de carte/série, de texte de carte interprété, ni de callback persistant.
- Aucun traitement non supporté ne devient un effet vide.
- Un test synthétique prouve seulement le chemin technique qu'il exerce.
- Une carte reste non certifiée tant que toutes ses capacités et restrictions ne sont pas intégralement vérifiées.
- Le workspace contient des modifications non commitées préexistantes; aucune restauration/reset/commit ne sera utilisé.

## État courant

- Audit documentaire et registre créés.
- `WHEN_ATTACKING` et `ON_BLOCK` déclaratifs raccordés aux événements confirmés et au scheduler existant; choix et reprise JSON couverts par tests ciblés.
- Restent les autres fenêtres, Trigger, DSL générique restante, cartes officielles multi-séries, conversions et validations finales. Voir `UNIVERSAL_ABILITY_ENGINE_CHECKPOINT.md`.
