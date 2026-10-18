# Administration étendue — proposition à valider

## Objectif

Permettre au propriétaire de gérer les principales fonctions existantes depuis `/admin`, au lieu de modifier des fichiers ou la base manuellement. Continuer sur l’environnement local uniquement, avec `sateprod@gmail.com` autorisé par la configuration existante. Aucun déploiement ou changement Neon.

## Navigation proposée

Une navigation interne commune : Vue d’ensemble, Joueurs, Cartes, Extensions et boosters, Économie, Parties, Signalements, Historique des modifications. Sur mobile, les filtres restent accessibles et les tableaux défilent dans leur propre cadre.

## 1. Vue d’ensemble et joueurs

- Compteurs réels : comptes, cartes du catalogue, ouvertures, parties, signalements à traiter.
- Recherche de joueur par nom/email, pagination et fiche individuelle.
- Fiche : profil, solde et mouvements de Berrys, progression, badges, collection, decks, ouvertures et parties.
- Ajustement positif ou négatif des Berrys avec motif, aperçu du solde résultant et écriture dans le registre existant. Refus d’un solde négatif, verrou par joueur et identifiant de requête pour éviter les doubles crédits.
- Correction ciblée des quantités de cartes avec motif et aperçu avant/après. Réutiliser les validations existantes ; ne pas recréer les collections ni les decks.
- Consultation des sources de progression. Les niveaux/badges calculés restent cohérents avec leurs métriques ; leur édition arbitraire directe n’appartient pas à cette première livraison.

## 2. Catalogue de cartes

- Recherche et filtres par extension, rareté, type et variante.
- Fiche complète avec image, identifiants exacts, textes, coût, puissance, Counter, attribut, famille et indicateurs alternative/parallèle/spéciale.
- Édition ciblée des informations du catalogue avec aperçu avant/après, validation et motif. Les identifiants servant aux collections et historiques restent stables.
- Depuis un signalement, accès à la carte actuelle et comparaison avec les informations jointes au moment du problème.
- Afficher séparément les informations du catalogue et la prise en charge par le moteur. Corriger un indicateur de variante ne certifie pas une carte et ne modifie pas automatiquement son effet dans `/play`.
- Les historiques d’ouverture restent des preuves du tirage réalisé ; les corrections du catalogue sont tracées séparément.

## 3. Extensions et boosters

- Liste des extensions, informations produit, disponibilité et diagnostic des règles de tirage.
- Édition du nom, de la description et de l’illustration de l’extension.
- Consultation des profils et catégories de tirage ; présentation lisible des règles existantes, avec validation avant tout changement.
- Pour une modification de tirage, montrer les pools concernés et refuser les profils impossibles avec les cartes disponibles. Conserver la provenance des règles ; ne jamais présenter un taux de simulation comme officiel.
- Historique des ouvertures filtrable par joueur/extension/date, avec cartes, variantes annoncées et paiements associés.

## 4. Économie

- Éditeur des prix booster/display, de la bourse initiale, du trésor quotidien, des récompenses et plafonds de parties, et des valeurs de revente.
- Gestion des événements temporaires : libellé, dates et multiplicateurs.
- Les paramètres sont enregistrés et versionnés en base ; le JSON actuel fournit les valeurs initiales. Les achats, récompenses et écrans doivent tous lire la même configuration active.
- Aperçu du changement avant validation. Pas de crédit rétroactif automatique lorsque la bourse initiale change.
- Toute modification indique sa date d’effet et son auteur.

## 5. Parties et signalements

- Liste des parties et statistiques, filtre joueur/statut/date/niveau du bot.
- Diagnostic à partir des vues et actions visibles ; ne jamais envoyer le GameState brut, les graines ou les zones cachées au navigateur.
- Conserver le traitement existant des signalements, ajouter les liens de navigation vers la carte, l’ouverture ou le joueur concerné.
- Ne pas modifier une partie active depuis un éditeur de JSON. Les corrections du moteur continuent à passer par des définitions revues et des tests.

## 6. Traçabilité et accès

- Chaque action d’administration conserve l’auteur, la cible, la date, le motif et les valeurs avant/après pertinentes.
- Les écritures et leur trace sont atomiques ; pagination et recherche côté serveur.
- Vérification de la session et de l’autorisation sur chaque API, validation des entrées, protection Origin et contrôle des conflits de modification.
- Exclure des réponses et des traces les mots de passe, secrets, jetons OAuth et états cachés de jeu.
- Pas de suppression massive ou d’effacement d’historique dans cette première livraison.

## Ordre de réalisation proposé

1. Navigation, vue d’ensemble, recherche et fiches joueurs.
2. Ajustements de Berrys/collection et journal des actions.
3. Catalogue et correction des erreurs de variantes, reliés aux signalements.
4. Économie, extensions, règles de boosters et historique des ouvertures.
5. Consultation des parties et contrôles de cohérence.

## Données et vérifications

Des migrations additives seront nécessaires pour la configuration versionnée et le journal d’administration. Elles seront préparées et relues avant application locale ; l’autorisation précédente concernait seulement la migration des signalements.

Tests attendus : refus des non-administrateurs, pagination/filtres, écritures traçables et sans doublon, solde jamais négatif, conservation des historiques, refus des configurations invalides, cohérence entre prix affiché et facturé, conflits d’édition, formulaires mobiles. Les tests qui écrivent utilisent uniquement des données et une base de test autorisées. Préserver les modifications moteur en cours et les preuves existantes.

Statut : proposition, aucun développement de cette extension ni nouvelle migration appliquée à ce stade.
