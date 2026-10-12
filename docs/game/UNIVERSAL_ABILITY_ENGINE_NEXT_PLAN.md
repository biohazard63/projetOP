# Plan — capacités Main et primitives universelles

## Objectif

Étendre le runtime existant à des activations Main exécutables, traiter les deux Events OP06-017/018 depuis leur texte officiel, puis ajouter des primitives déclaratives sûres de mélange, recherche, révélation et déplacement.

## Architecture observée

- `core/game.ts` reste le point d'entrée unique des commandes et de l'idempotence.
- `effects/runtime.ts` possède déjà l'interpréteur, les choix suspendus et `SEARCH_TOP_DECK`.
- `effects/operations.ts` contient le pipeline partagé des coûts et déplacements.
- `cards/officialAbilities.ts` garde les définitions déclaratives versionnées.
- `tests/game-m2a.test.ts` contient le banc d'intégration officiel et les traces.

## Étapes testables

1. Ajouter des tests rouges pour les fenêtres Main hors combat et l'activation d'une capacité `[Activate: Main]`; vérifier refus hors phase, mauvais contrôleur, coût et limite Once Per Turn.
2. Étendre le DSL sans toucher aux identifiants de cartes du noyau : sélecteur de champ own/opponent, condition de puissance actuelle, branche conditionnelle et coûts facultatifs typés.
3. Ajouter une commande idempotente d'activation d'Event `[Main]`: paiement du coût imprimé, mise au Trash face visible selon §2-7-3, puis résolution par continuation commune. Refuser une commande en combat ou hors Main.
4. Déclarer les modes Main OP06-017/018 et réutiliser le Trigger/Couter déjà présent. La FAQ OP06-018 autorise deux cibles différentes; §8-3-1-4 implique qu'un coût d'activation facultatif refusé annule aussi l'effet après `:`.
5. Étendre les primitives versionnées pour shuffle (PRNG sérialisé), search/reveal (choix privés), et mouvement contrôlé entre zones; préserver les définitions v1.0–v1.2 existantes.
6. Ajouter les tests d'interactions, reprises JSON, confidentialité et profils interséries disponibles localement; ne certifier une carte que si chaque texte obligatoire est compilé et testé.
7. Mettre à jour la matrice, le registre, les preuves et le rapport. Vérifier suite, typecheck, lint, build isolé et diff-check.

## Références réglementaires consultées

- Comprehensive Rules 1.2.1 : §§2-7-3, 6-5-3/4, 8-3-1-3/4, 8-4-1/2, 8-4-4 et 10-2-2/3.
- OP06 card list : OP06-017 et OP06-018, texte/cost/type.
- OP06 FAQ : OP06-018 permet de donner les deux bonus à des cartes différentes.

## Risques à traiter explicitement

- Une capacité d'Event depuis la main ne peut pas être modélisée comme une capacité de permanent : l'Event est payé puis mis au Trash avant la résolution (§2-7-3); son instance doit rester référencée après changement de zone pendant les choix suspendus.
- Le coût optionnel de OP06-017 est un coût d'activation avant `:`; décliner signifie que l'effet après `:` ne s'active pas (§8-3-1-4). Corriger toute ancienne fixture Counter qui prétend le contraire.
- Les primitives search/shuffle doivent conserver l'ordre et consommer le PRNG autoritaire seulement au moment requis; aucune sélection secrète ne doit fuiter via les options ou erreurs.
- OP06-017/018 ne sont pas certifiées tant que leurs modes Counter/Trigger/Main requis ne sont pas tous couverts.
