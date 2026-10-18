# Signalements de cartes et bugs — plan d’implémentation

Objectif validé : signaler depuis `/play` et les ouvertures de boosters, joindre toutes les informations affichées de la carte et le contexte, puis traiter les signalements dans une liste privée avec quatre statuts.

Architecture : formulaire partagé dépliable dans les fiches de cartes et les écrans concernés ; API authentifiée ; table Prisma dédiée avec instantanés JSON filtrés ; page privée `/admin/reports` protégée par `REPORT_ADMIN_EMAILS`. Aucun envoi externe, changement automatique de carte ou accès à un état de jeu caché.

Travail dans le checkout actuel pour conserver le serveur local et les changements utilisateur. Ne pas toucher aux modifications moteur existantes. Aucun commit, déploiement ni application de migration sans demande explicite.

- [x] Contrats validés et tests : filtrage des instantanés, taille, catégories, propriété des parties/ouvertures, permissions administrateur, idempotence.
- [x] Persistance : modèle Prisma, migration SQL additive préparée uniquement, client local régénéré.
- [x] API de création, liste privée paginée et mise à jour des statuts ; aucune donnée publique.
- [x] Formulaire avec informations de carte visibles, raccourci « Cette carte n’est pas une alternative », description, confirmation et erreur récupérable.
- [x] Intégration aux détails de carte et bugs généraux de `/play`/boosters ; liste privée et filtres.
- [x] Tests ciblés, typecheck, lint et navigateur avec API simulées ; documenter la configuration et la migration restant à autoriser.

Vérification : 12 tests ciblés réussis ; typecheck et lint ciblé réussis ; schéma Prisma valide. Navigateur mobile avec API simulées : envoi depuis une carte booster et /play, informations jointes, raccourci variante, erreur récupérable et réessai. Revue : conservation des textes réellement affichés et de la puissance effective ajoutée avec tests.

Activation restante : migration non appliquée, aucune base réelle modifiée. `REPORT_ADMIN_EMAILS` à renseigner avant accès à la liste privée. Aucun commit ni déploiement.

## Extension demandée : tableau d’administration

- [x] Entrée `/admin`, protection serveur partagée, ancien chemin `/admin/reports` conservé.
- [x] Lien Administration dans la barre latérale et le menu mobile, visible seulement après vérification de l’accès.
- [x] Compteurs des résultats par statut ; filtres origine/type ; recherche serveur carte/joueur/description ; tableau paginé, détails et traitement.
- [x] Contrôles de filtres : 13 tests unitaires au total ; typecheck et lint ciblé réussis.
- [x] Revue indépendante : aucun problème important relevé.
- [x] Test navigateur sur serveur isolé, données simulées, garde serveur réel, mobile et changement de statut.

Aucune adresse administrateur réelle ajoutée et aucune migration appliquée. Adresse demandée à l’utilisateur.
