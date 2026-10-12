# Points à résoudre avant implémentation

10 octobre 2026. Aucun point ci-dessous ne doit être comblé par une règle inventée.

1. **Vie des Leaders absente** : 284 variantes sans Vie dans le maître ; Card Prisma n'a pas ce champ. Identifier sources locales ou export autorisé puis préserver cette valeur via adaptateur. Ne pas utiliser 5 par défaut.
2. **Format et région** : définir le format de départ, sa date, la politique du numéro de bloc et les restrictions applicables. L'annonce du 24/09 a une application future le 12/10. Sources : [restrictions officielles](https://en.onepiece-cardgame.com/news/restriction.html), [index FR](https://fr.onepiece-cardgame.com/rules/). Aucun choix métier requis pour poursuivre les tests du noyau générique.
3. **FAQ par carte** : index consulté, PDF individuels pas encore tous contrôlés. En particulier, arbitrer les textes provisoires et conflits d'errata avant d'admettre une carte. [FAQ FR](https://fr.onepiece-cardgame.com/rules/faq/).
4. **Sémantique des effets** : compléter les scénarios des sections 8/9/10, fenêtres concurrentes, changements de zone, remplacements, usages par instance et objets temporaires. Aucune règle universelle de pile LIFO à présumer. [PDF FR v1.2.1](https://fr.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20260828=).
5. **Exhaustivité** : 74 groupes locaux ne prouvent pas que toutes les extensions officielles sont présentes. Familles, réimpressions et alias doivent rester distincts. Pas de nouvelle collecte non autorisée.
6. **Déconnexion/délais** : politique produit à définir, distincte des règles de carte. Ne pas déclarer automatiquement perdant après un timeout technique non spécifié.
7. **Hébergement WebSocket** : client présent, serveur absent du code inspecté ; choisir plus tard un hébergement persistant et une stratégie d'état partagé. Pas de déploiement demandé.
8. **Mobile réel** : performances, zoom, safe areas et reprise iOS/Android restent à tester une fois l'interface autorisée. Support de l'orientation ne doit pas être une condition de jeu.

Ne pas annoncer des tests PASS pour ces points tant que leurs scénarios ne sont pas exécutés. Maintenir numéro de carte, référence, cas, état de couverture et résultat du test dans une matrice de conformité au prochain jalon.

## Avancement M0 — 10/10/2026

Le point 1 est résolu dans les données préparées pour le moteur : 139 numéros / 284 variantes avec Vie officielle explicite, aucune valeur par défaut. Le maître et Prisma restent inchangés. Preuves : `evidence/leader-life.json`.

Le point 3 est contrôlé pour 14 définitions uniquement ; la formulation française est signalée comme non officielle à relire. Le point 2 reste ouvert pour une certification compétitive ; un ruleset non compétitif daté borne les tests M0. Aucun effet n'est activé sans gestionnaire implémenté.

Consulter [le rapport M0](M0_REPORT.md) et [la matrice de couverture](M0_COVERAGE.md) pour distinguer données vérifiées, spécifications et exécution encore absente.

## Avancement M1 — 11/10/2026

La procédure de préparation a été vérifiée dans les Comprehensive Rules v1.2.1, sections 5-1 et 5-2 : décision premier/second distincte, mulligan ordonné, Vie après les deux décisions et ordre inversé du prélèvement. Aucun cas ambigu relevé pour ce sous-ensemble ; voir [M1_REPORT.md](M1_REPORT.md).

Restent exclus : effets de début de partie / construction non implémentés, boucle de tour, certification compétitive et transport. Une éventuelle convention tournoi imposant le choix du premier joueur nécessitera un ruleset explicite ; le noyau actuel suit la procédure générale. Le PRNG 32 bits livré est destiné aux tests locaux ; le hasard de production reste un travail du service autoritaire, sans exposer la graine.

## Avancement M1.5 — 11/10/2026

La boucle sans capacités est implémentée dans le même noyau : voir [M1_5_REPORT.md](M1_5_REPORT.md). Le contrôle du PDF officiel v1.2.1 confirme la défaite par deck vide lui-même, sans attendre une pioche impossible. La limite de Personnages et les retours de DON!! associés sont couverts.

Les Lieux de test sont synthétiques ; le catalogue M0 n'inclut pas encore de vrai Lieu sans effet vérifié. Combat, capacités et victoire complète restent ouverts. Le support d'une carte avec capacité optionnelle connue permet seulement les actions de base ; aucun effet permanent ou obligatoire inconnu ne peut être ignoré pour admettre son deck.
