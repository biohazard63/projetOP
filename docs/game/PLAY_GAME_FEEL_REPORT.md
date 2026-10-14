# Présentation de /play — 14 octobre 2026

## Changements

Présentation uniquement : aucun changement du moteur, des règles, des définitions, de Prisma ou des contrats API dans ce lot.

- File visuelle dédupliquée par partie et événement, sans troncature ; captures des illustrations déjà légalement visibles. Nettoyage des timers, arrêt des animations, mode rapide, réduction des mouvements et maintien à l’écran.
- Phases automatiques indépendantes des animations décoratives. Les décisions continuent à utiliser les actions du serveur.
- Durées centralisées : Counter, K.O., Trigger et résultat du combat à 2 500 ms à la demande de l’utilisateur. Personnage Counter et Event Counter ont des présentations distinctes.
- Flèche du combat courant ; résultat explicite à partir des conséquences confirmées et des puissances publiées dans la dernière fenêtre connue. Un résultat insuffisamment documenté reste « Combat terminé » ou « Cible préservée », sans vainqueur inventé.
- Vocabulaire français, inspection avec délai de sortie et panneau accessible au pointeur. Reconnaissance des deux graphies `DON!! −1` / `DON!! -1` dans l’indication UI existante ; les coûts restent validés par le serveur.
- Dos `/images/card-back.jpg` ; agrandissement des piles Deck, Défausse, DON!! Deck, Vie et Stage ; main desktop dimensionnée selon son espace et les rotations de l’éventail.
- Surface non défilable par le focus ; cartes de main paysage redimensionnées pour rester dans leur zone.
- Sélecteur limité aux Starter Decks de l’API : grille, recherche, difficulté, choix explicite puis lancement, statistiques repliables. Aucun deck personnel ou de laboratoire supprimé.
- 27 choix actuels, 25 Leaders uniques mis en cache depuis les URLs du projet. Manifest d’images avec provenance et SHA-256 ; ce manifest ne contient aucune définition réglementaire.

## Modules

`PlayApp`, `Board`, `anim`, `labels`, `model`, page `/play` et `play.css` modifiés. `DeckPicker`, `BattleArrow`, `combatPresentation`, `presentationTiming`, `presentationQueue`, `usePresentationQueue` créés. Script de cache `scripts/game/cache-play-leaders.ts`, illustrations et tests UI ajoutés.

## Preuves réellement exécutées

Preuves dans `docs/game/evidence/play-game-feel/`.

- Tests ciblés présentation + géométrie : 13/13 PASS après correction d’un import React nécessaire au rendu SSR du runner tsx.
- Suite complète : 779/780 PASS au dernier passage exhaustif (`full-tests-final.log`). Le seul échec était ce rendu SSR du nouveau sélecteur ; corrigé et retesté dans la suite ciblée. Ne pas présenter cela comme un nouveau passage exhaustif 780/780.
- TypeScript PASS ; lint : 0 erreur, 99 avertissements existants.
- Build dans `/private/tmp/starter-audit-build.0hjvj8` PASS ; aucun build dans le `.next` du serveur local.
- Chrome automatisé : Counter Personnage, deux Counters, défense gagnante, Event Counter, maintien/reprise, passage d’animation, décisions accessibles, mode réduit et géométrie stable PASS. Parties créées et commandes validées par `PlayService` et `MemoryGameRepository`, APIs navigateur interceptées, aucune écriture en base.
- Sélecteur : desktop 1440×900 et mobile 390×844 PASS ; les 27 portraits chargés, uniquement les ST affichés, recherche et lancement réel en mémoire.
- Géométrie : 1920×1080, 1440×900, 1366×768, paysage 844×390 PASS ; journal sans redimensionnement, main visible, absence de défilement global et ouverture des actions de carte. Captures inspectées.

Les premiers journaux en échec sont conservés : test SSR, timing du runner et captures ayant repéré un déplacement par le focus. Les fichiers `*-final`, `tests-commit.log` et résultats JSON identifient les corrections vérifiées.

## Limites

- Chrome paysage/tactile testé ; Safari sur iPhone physique NOT TESTED.
- Les événements du noyau et du runtime d’effets ont des horloges distinctes : leur ordre global ne peut pas être reconstruit fidèlement. Les capacités et variations de puissance complémentaires restent des résumés de la vue, pas une chronologie inventée.
- Une attaque entièrement résolue dans une réponse groupée peut ne plus exposer sa cible initiale ni ses puissances historiques. La présentation conserve un résultat générique dans ces cas.
- Le dernier scénario navigateur Event confirme la carte utilisée ; ne pas confondre cette preuve avec la couverture de tous les paiements facultatifs et Events du catalogue.
- Les images d’autres cartes conservent le chargement actuel du projet. Le cache local de ce lot concerne les Leaders de sélection uniquement.
- Le manifest d’images doit être régénéré lorsqu’un nouveau Leader est proposé. Une illustration introuvable est signalée par un dos avec libellé explicite ; aucune fausse image de Leader n’est créée.

Aucun push, déploiement, migration ou écriture de données utilisateur. Les autres fichiers locaux et captures de l’utilisateur restent hors du commit de présentation.
