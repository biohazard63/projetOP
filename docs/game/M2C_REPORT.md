# M2C — rapport d'exécution

**Verdict : PARTIAL.** Les dégâts simples au Leader et la défaite après une attaque reçue à zéro Life sont implémentés. Trigger, Banish, Double Attack, dégâts multiples et résolution interrompue ne le sont pas.

## Réalisé

- Une attaque gagnante contre un Leader enlève le Life supérieur. Sans Trigger déclaré comme pris en charge, la carte va face cachée en main et aucun identifiant n'est publié.
- Une carte Life retirée par le combat est comptabilisée dans les invariants ; les projections des adversaires n'en révèlent pas l'identité.
- La perte du dernier Life ne termine pas la partie. Une attaque gagnante ultérieure alors que le Life est déjà à zéro produit `LEADER_DAMAGED_AT_ZERO_LIFE` et arrête les actions.
- Les transitions demeurent déterministes et réutilisent l'état de bataille existant.

## Règles et preuves

Bandai Comprehensive Rules 1.2.1, §§7-1-4, 8-6-2-1, 9-2 et 10-1-5, [PDF officiel](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=). Les tests vérifient une blessure sans fuite d'identifiant, cinq blessures jusqu'à Life 0 sans défaite, puis la défaite au coup suivant.

## Limites

Les Trigger ne sont ni révélés ni proposés car le catalogue de test ne fournit pas de programmes Trigger certifiés. Aucune carte comportant un Trigger déclaré ne doit être présentée comme jouable par ce noyau. Banish et Double Attack sont absents ; la puissance des dégâts reste d'une blessure par combat gagnant.
