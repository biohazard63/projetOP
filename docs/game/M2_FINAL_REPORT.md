# M2 — rapport final

**Verdict global : PARTIAL.** Le sous-ensemble exécutable comprend la déclaration d'attaque, un combat contre Character ou Leader, les fenêtres Blocker/Counter Character, un KO en combat relié au scheduler M1.5D, les dégâts simples de Life et la défaite au coup reçu à Life zéro. M2 n'est pas un simulateur complet et ne doit pas être présenté comme tel.

## Vérifications réellement exécutées

| Vérification | Résultat |
|---|---|
| Suite complète Node/tsx | **PASS — 242/242**, 234 historiques et 8 tests M2 |
| M2 tests ciblés | **PASS — 8/8** |
| TypeScript `npx tsc --noEmit` | **PASS** |
| ESLint `npm run lint` | **PASS — 0 erreur, 99 avertissements existants** |
| Build de production isolé | **PASS** — copie temporaire sans `.env*`; recompilation autorisée réseau après échec DNS sandbox |
| Tests sur navigateurs/appareils | **NOT_TESTED** — aucun UI changé |
| Counter Events / Trigger | **NOT_TESTED** — non implémentés |

Les journaux sont sous `docs/game/evidence/m2/`; le résultat de build est décrit dans [m2-final-build.md](evidence/m2/m2-final-build.md).

## Fonctionnalités

- **État/sauvegarde :** `battle` sérialisable ; restauration historique sans champ ; commandes via `applyCommand`; vues de combat publiques et données Life privées.
- **Combat :** attaques autorisées contre Leader ou Character reposé après le premier tour du joueur ; Characters du tour interdits faute de support Rush.
- **Réponses :** un Blocker explicitement déclaré, plusieurs Counter Characters numériques, un passage par fenêtre.
- **Résolution :** comparaison via l'évaluateur central ; KO contre Character ; dégâts simples au Leader.
- **Effets :** confirmation d'un KO de combat par le pipeline M1.5D quand son runtime 1.2.0 est présent ; test de suspension/reprise ON_KO synthétique.
- **Victoire :** deck vide existant et dommage au Leader à Life zéro.

## Fichiers M2 concernés

- Noyau : `cardgame/src/game/core/types.ts`, `combat.ts`, `game.ts`, `invariants.ts`, `index.ts`.
- Intégration M1.5D : `cardgame/src/game/effects/runtime.ts` et `operations.ts`.
- Tests : `cardgame/tests/game-m2a.test.ts` (8 scénarios couvrant les sous-ensembles M2A–M2D).
- Rapports : `docs/game/M2_COMBAT_ROADMAP.md`, `M2A_REPORT.md`, `M2B_REPORT.md`, `M2C_REPORT.md`, `M2D_REPORT.md` et ce rapport.
- Preuves : `docs/game/evidence/m2/`, dont le registre, les traces JSON et les journaux de validation.

## Non implémenté ou non certifié

- Counter Events et coûts alternatifs/coûts DON!! −X.
- Trigger acceptés/refusés, zone hors-jeu temporaire et cascades de Trigger.
- Double Attack, Banish, Rush, Blocker/On Block avec capacités, When Attacking.
- Cibles/attaquants déplacés pendant les fenêtres, annulations et fin prématurée réglementaire.
- Remplacements simultanés, KO multiples, coûts partiellement interrompus dans Counter Event.
- Conditions de tournoi/banlist et certification générale des cartes.
- Démonstration complète avec plusieurs cartes réelles interséries.

Le comportement inconnu n'est pas inféré à partir du texte anglais/français et aucune carte ayant une capacité obligatoire non couverte n'est certifiée jouable.

## Règles de référence

Les décisions contrôlées renvoient au [Comprehensive Rules 1.2.1 de Bandai](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20251017=), §§6-5-6, 7-1, 8-3, 8-6, 9-2 et 10-1. Les détails de Blocker utilisent la [FAQ officielle ST-01 à ST-04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=). Les tests sont une preuve d'exécution du sous-ensemble, pas une certification exhaustive des règles.

## Recommandation suivante

Avant toute interface, finir un jalon de conformité des fenêtres de combat : effets automatiques à l'attaque/Blocker, Counter Event avec coûts versionnés, Trigger avec choix privé et reprise, puis Double Attack/Banish uniquement après ruling vérifié. Construire ensuite des scénarios réels complets et une matrice de cartes certifiées. M3 n'a pas commencé.
