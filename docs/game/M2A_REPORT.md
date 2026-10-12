# M2A — rapport d'exécution

**Verdict : PARTIAL.** Le noyau possède un contexte de bataille JSON, des commandes versionnées et idempotentes, les attaques contre Characters reposés, la comparaison des puissances calculées, le KO en combat et le pont vers le pipeline M1.5D lorsque le runtime 1.2.0 est présent. Le support des effets « When Attacking », Rush et des restrictions d'attaque reste absent ; ces cas sont refusés ou non déclarés jouables.

## Réalisé

- `BattleState | null` intégré à `GameState`; les sauvegardes historiques sans le champ sont restaurées avec `battle: null`.
- `DECLARE_ATTACK` et `RESOLVE_BATTLE` traversent `applyCommand`, ses validations, son journal de commandes et son idempotence.
- Le premier tour d'un joueur ne propose pas d'attaque. L'attaquant doit être actif, présent et prêt ; un Character joué ce tour est refusé.
- Une cible légale est le Leader adverse ou un Character adverse reposé. Les Blocker/Counter forment depuis M2B les fenêtres précédant Damage.
- Les puissances sont lues par `evaluateCharacteristics` au moment de Damage. Une égalité permet le KO.
- Pour un Character, le KO conserve les DON attachés épuisés dans la Cost Area. Avec le runtime M1.5D, le KO passe par `confirmBattleKO`, enregistre l'opération et alimente ON_KO / ON_CHARACTER_KO ; sans runtime, le noyau applique le mouvement de règle sans effet.

## Règles et preuves

Bandai Comprehensive Rules 1.2.1, §§6-5-6-1 et 7-1-1, 7-1-4, contrôlées dans [le PDF officiel](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=). Les tests M2 ciblés couvrent le premier tour, l'attaque contre Character, l'idempotence, la sérialisation et le KO. La suite complète après l'ensemble des changements M2 est consignée dans [m2-final-tests.log](evidence/m2/m2-final-tests.log).

## Limites

Aucune capacité de déclaration d'attaque, fenêtre de déclenchement « When Attacking », Rush, règle de restriction spécifique, annulation de bataille ou fin prématurée après déplacement de source n'est implémentée. Les définitions de texte libre ne sont pas interprétées. Aucune carte n'est certifiée jouable par M2A.
