# Plan /play — présentation des combats

Périmètre : composants et adaptateurs de présentation uniquement. Aucun changement du moteur, des règles, du service, de l’IA, des contrats réseau ou des données.

1. Réutiliser les événements confirmés et leurs séquences; figer uniquement les faces légalement connues. Durées centralisées, Counter Character distinct d’Event. Ne pas inventer la cible d’une ancienne attaque lorsque la réponse serveur ne la conserve pas.
2. Remplacer la file limitée à 24 éléments par un reducer de présentation dédupliqué, indépendant du serveur, annulable et remis à zéro au changement de partie. Passer l’animation courante ou la séquence ne doit envoyer aucune commande.
3. Retirer l’attente des animations avant ADVANCE_PHASE; ajouter une vitesse rapide persistante. Les décisions et la version affichées restent celles du serveur.
4. Afficher Counter/Trigger/K.O. plus longtemps, avec face réelle et bonus uniquement lorsqu’exposés; flèche de combat courant entre les cartes visibles, sans changement de géométrie. Libellés français naturels.
5. Tests de la file, confidentialité et événements réels par PlayService en mémoire. Navigateur sur /play hydraté avec API de test en mémoire : aucune écriture dans la base active. Captures bureau/mobile, interruption, réduction d’animations, décisions accessibles.
6. TypeScript, lint, tests ciblés et globaux; rapport et limites. Aucun commit, push ou déploiement.

Réserve : les séquences des événements de capacités sont distinctes de celles du journal principal. Ne pas les entrelacer comme une chronologie réglementaire; annoncer la capacité dans un récapitulatif de mise à jour. Les puissances d’une réponse groupée sont des valeurs de fin de mise à jour, pas des puissances historiques reconstruites.
