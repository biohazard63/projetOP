# M1.5 — Boucle de tour et actions de base

11 octobre 2026. Le même noyau M1 prend désormais en charge les phases et les actions de base. **Le gameplay complet n'est pas livré : combat, capacités et victoire par dégâts ne sont pas implémentés.**

Documents consultés : M1_REPORT, SIMULATOR_ARCHITECTURE, M0_COVERAGE et le cahier des règles situé réellement dans `cardgame/docs/ONE_PIECE_TCG_RULES.md`. Branche conservée : `maintenance/catalog-rebuild` ; les modifications non committées précédentes restent présentes.

## Règles et couverture

Source contrôlée : [Bandai, Comprehensive Rules v1.2.1, 28/08/2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), consultée le 11/10/2026.

| Règle implémentée | Référence | État |
|---|---|---|
| Recharge du terrain et retour/redressement des DON!! attachés | 6-2-3/4 | PASS |
| Pioche, exception du premier joueur au premier tour | 6-3 | PASS |
| DON!! : deux normalement, un au premier tour du premier joueur ; restant zéro/un | 6-4 | PASS |
| Paiement exact avec DON!! actifs ; Personnages/Lieux actifs | 2-7, 3-7-5, 3-8-4, 6-5-3 | PASS |
| Maximum cinq Personnages, choix explicite du remplacement | 3-7-6 | PASS |
| Un Lieu ; remplacement de l'ancien | 3-8-5 | PASS |
| Attachement aux Leader/Personnages ; bonus durant leur tour | 6-5-5-1/3 | PASS |
| Retour épuisé des DON!! quand un Personnage quitte le terrain | 6-5-5-4 | PASS |
| Fin de Principale, puis Fin et transfert du tour | 6-5-2-1, 6-6-1-4 | PASS |
| Deck vide : défaite au traitement des règles, même après la dernière pioche | 1-2, 9-1, 9-2-1-2 | PASS |
| Vie vide seule : aucune défaite | 1-2, 9-2 | PASS (fixture) |
| Pioche/Vie/main adverse privées ; terrain/défausse/DON publics | 3 | PASS |

Le remplacement est une défausse de règle, pas un KO. La nouvelle carte est révélée avant la défausse et son entrée en jeu. Les coûts et cibles sont validés avant toute transition acceptée. Les tests renvoient aux sections concernées.

## Utilisation du même moteur

```ts
import { createGame, applyCommand, getLegalActions, projectState } from './core'

const state = createGame({ ...validatedInput, scope: 'BASIC_TURNS' })
const actions = getLegalActions(state, actorEstablishedByServer)
// À chaque phase automatique : ADVANCE_PHASE, par le joueur actif.
// En Principale : PLAY_CARD, ATTACH_DON ou END_MAIN.
// Les enveloppes contiennent id, actorId et expectedVersion.
```

`scope: 'SETUP_ONLY'` reste la valeur par défaut pour préserver les usages et snapshots M1. `BASIC_TURNS` active les nouvelles transitions dans **la même fonction `applyCommand`** ; le fichier `turns.ts` est son auxiliaire, pas un deuxième moteur.

- `ADVANCE_PHASE` traite la phase courante puis passe à la suivante ; en Fin, transmet le tour et entre en Recharge.
- `PLAY_CARD` prend `instanceId`, une liste exacte `donIds` et `replaceId` (null si aucun choix). Lorsque cinq Personnages sont présents, un remplacement valide est obligatoire. Pour un Lieu, null déclenche le remplacement de l'unique Lieu existant.
- `ATTACH_DON` prend des DON!! actifs et distincts de la zone de coût et une cible Leader/Personnage appartenant au joueur actif. Les DON!! attachés ne peuvent pas payer un coût.
- `END_MAIN` entre en Fin ; il ne saute pas la phase suivante.

`getLegalActions` fournit les cartes abordables, les DON!! éligibles et les choix de remplacement/cible. Une autre carte, une cible étrangère, un coût incomplet, une ressource épuisée ou un doublon sont refusés à l'application, même si le client modifie le descripteur.

Les compteurs de tours sont par joueur, indépendants de l'ordre de choix. Les instances conservent leurs identifiants ; chaque déplacement incrémente la génération de zone. `playedOnTurn` conserve le tour d'arrivée pour les contrôles de combat futurs. Aucun combat n'est implicitement autorisé par ce champ.

La puissance projetée est calculée à partir de la valeur imprimée et des DON!! attachés pendant le tour du contrôleur. Elle n'est pas persistée comme une modification arbitraire de la définition. Au changement de joueur, ce bonus disparaît naturellement. Les DON!! restent attachés jusqu'à la Recharge de leur contrôleur ou à la sortie de leur cible.

## Effets et points d'extension

Les effets optionnels connus de M0 (`giveRestedDon`, `blocker`) restent **inactivables**. Leur présence ne déclenche aucun comportement obligatoire dans les phases livrées ; la boucle peut donc dérouler les seules actions de base avec ce sous-ensemble contrôlé. Les cartes à effets de construction, permanents, automatiques, de début de partie ou Trigger non couverts restent refusées à la création. Une déclaration de capacité dans le ruleset n'ajoute pas de gestionnaire.

Les frontières de phases restent explicites et sérialisables. Le futur résolveur devra pouvoir suspendre la progression pour traiter les effets obligatoires avant de poursuivre. Aucun placeholder n'est présenté comme un gestionnaire fonctionnel. Fin ne supprime pas de cartes en main ni ne réinitialise arbitrairement les ressources : aucun modificateur d'effet n'est introduit dans ce sous-ensemble.

`automaticPlayReady` reste false. Les résultats terminaux disponibles sont limités à `EMPTY_DECK`, avec joueurs perdants et gagnant éventuel. Zéro Vie n'est pas traité comme une défaite. Aucun système général de dégâts/victoire n'a été ajouté.

## Confidentialité et fiabilité

Les projections comprennent les cartes publiques, attachements/cibles, ressources actives/épuisées et compteurs. Seul le propriétaire voit sa main. Deck et Vie ne sont jamais dévoilés, même à leur propriétaire ; la graine, le registre d'instances et les commandes privées restent exclus.

Les événements de pioche ne portent aucun identifiant caché. Les identifiants d'événements publics sont autorisés seulement pour révélations, mises en jeu, défausses et attachements, et doivent correspondre à des instances publiques. Un snapshot violant cette règle est refusé. Le résultat terminal est public.

Les commandes sont validées strictement, copiées avant application et indexées par acteur/clé. Le rejeu exact ne paie pas une seconde fois, ne repioche pas et ne repasse pas le tour. Réutiliser une clé avec une autre intention ou une version périmée est refusé. La comparaison ne dépend pas de l'ordre des clés JSON.

Ces garanties sont celles du noyau pur. Autorisation de l'acteur, concurrence entre écritures et persistance transactionnelle restent à réaliser dans le service serveur. Le PRNG 32 bits reste destiné aux essais locaux, pas à des tirages secrets en production.

## Validation exécutée

Depuis `cardgame/` :

```bash
npm run test:game:m1-5
npm test
npx tsc --noEmit
npx eslint src/game/core tests/game-m1-5.test.ts
npm run lint
```

`npm run build` est exécuté dans la copie actualisée `/private/tmp/mugiwara-managed-build-pwwqpcx8`, avec les dépendances locales et sans `.env` de production. Le serveur local et le `.next` du dépôt restent préservés.

| Contrôle | Résultat final | Preuve |
|---|---|---|
| Tests M1.5 | PASS — 17/17 | `evidence/m1_5/unit.log` |
| Suite globale (M0/M1/M1.5 et existant) | PASS — 115/115, zéro échec ou skip | `evidence/m1_5/tests.log` |
| TypeScript | PASS — sortie 0 | `typecheck.log`, `validation.json` |
| ESLint noyau/tests | PASS — aucun avertissement | `core-lint.log` |
| ESLint application | PASS — 0 erreur, 99 avertissements existants | `lint.log` |
| Production build | PASS — sortie 0 | `build.log` |
| Git diff --check | PASS | `validation.json` |
| Intégration HTTP/PostgreSQL, appareils physiques | NOT_TESTED | Hors périmètre, aucun branchement |

Les tests couvrent les deux ordres de jeu, transitions, premiers tours, DON!! restants/épuisés, coûts insuffisants ou falsifiés, limite de terrain, remplacement du Lieu, attachements, Recharge, puissance, commandes répétées, confidentialité, sérialisation et déterminisme.

Deux tests d'intégration du **noyau** traversent toute l'API : une boucle de quinze tours avec jeu de cartes/attachements/relecture JSON, puis une partie de passes atteignant réellement l'épuisement du deck, exclusivement par commandes légales. Ce ne sont pas des tests d'intégration DB ou UI.

Fixtures explicitement synthétiques : Stage OP99-998, coût zéro et Vie zéro. Aucun Stage sans effet n'a été ajouté au catalogue officiel M0 : sa mécanique générique est testée, mais son intégration à un vrai catalogue de Lieux nécessite des définitions et capacités vérifiées. Les instantanés arrangés pour certains cas limites préservent les 122 instances. Un premier test tentait de sélectionner une quatrième carte déjà située en Vie ; la fixture a été corrigée pour sélectionner uniquement les cartes disponibles, sans modifier le tirage.

## Fichiers créés/modifiés

- `cardgame/src/game/core/types.ts` : intentions, périmètre, résultat et métadonnée d'arrivée.
- `cardgame/src/game/core/game.ts` : dispatch, validation stricte, légalités et projection.
- `cardgame/src/game/core/invariants.ts` : conservation sur toutes les phases, terrain, attachements et résultats.
- Nouveau `cardgame/src/game/core/turns.ts` : actions et transitions auxiliaires du noyau.
- Nouveau `cardgame/tests/game-m1-5.test.ts` : 17 tests unitaires/scénarios d'intégration pure.
- `cardgame/package.json` : commande `test:game:m1-5`, aucune dépendance ajoutée.
- Documentation : ce rapport, suivi dans l'architecture et les questions ouvertes, preuves `docs/game/evidence/m1_5/`.

Les fichiers M0/M1 et les modifications utilisateur ont été conservés. Aucun scraper, modèle Prisma, import, API, composant, collection, booster, coin ou deck sauvegardé n'est modifié. Aucun push, commit, migration ou déploiement.

## Non implémenté et prochaines étapes

1. Combat : éligibilité d'attaque, fenêtres, blocage, Counter, égalité et dégâts. Le marqueur de tour d'arrivée est prêt, les attaques restent refusées.
2. Effets : coûts spéciaux, cibles, continuations, remplacements, Trigger, durées et ordre de résolution. Ne pas admettre les capacités automatiques tant que leurs tests officiels ne passent pas.
3. Victoire complète : dégâts à Vie vide, effets de victoire/défaite, concession et autres cas applicables. Seule la condition deck vide est traitée.
4. Catalogue : vrais Lieux/événements et cartes supplémentaires avec définitions relues ; certification de format/région/blocs et restrictions actualisées après la fenêtre M0.
5. Service autoritaire, hasard sûr, stockage et transport ; puis présentation unique PC/mobile/tablette. Les tests sur appareils restent NOT_TESTED.

Le jalon M1.5 valide une boucle de phases et des actions de base, pas une certification de gameplay complet.
