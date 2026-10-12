# M2B — rapport d'exécution

**Verdict : PARTIAL.** La fenêtre Blocker et les Counter Characters fonctionnent dans le sous-ensemble déclaré. Les Counter Events, leurs coûts DON!!, leurs effets et les capacités On Block n'ont pas été implémentés.

## Réalisé

- Après déclaration, le défenseur reçoit la fenêtre BLOCKER et peut passer ou activer un Character portant une déclaration `blocker` relue.
- Un seul Blocker peut être activé par bataille. Il doit être prêt, appartenir au défenseur et être distinct de la cible. Il est reposé et devient la cible.
- La fenêtre COUNTER permet de jouer plusieurs Characters depuis la main, chacun une fois, avec valeur Counter numérique connue, et de cibler un Leader ou Character propre.
- Chaque Counter Character est révélé/défaussé une fois ; le bonus est lié à l'instance et à sa génération, puis appliqué seulement si elle reste la cible du combat.
- Les étapes et les choix de cible sont des données sérialisables dans `BattleState`. Les commandes répétées héritent de l'idempotence de `applyCommand`.

## Règles et preuves

Bandai Comprehensive Rules 1.2.1, §§7-1-2 et 7-1-3, ainsi que [FAQ ST-01 à ST-04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=). Le test ciblé utilise les définitions relues ST01-006 Tony-Tony Chopper (Blocker) et ST01-003 Karoo (Counter 1000) : redirection, repos, bonus, résolution.

## Limites

Aucun Counter Event n'est offert comme action légale. Aucun paiement de coût Counter Event ou DON!! −X n'est simulé. On Block et autres effets de réponse ne sont pas capturés. Les capacités supplémentaires d'une carte Counter ne sont pas activées lorsqu'elle est utilisée depuis la main. Cela reste un sous-ensemble de test, pas un combat complet.
