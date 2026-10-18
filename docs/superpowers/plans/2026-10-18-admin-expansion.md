# Administration étendue — plan d’exécution

Spécification validée par « vasy feux » : `docs/superpowers/specs/2026-10-18-admin-dashboard-expansion.md`. Exécution directement dans le checkout courant pour préserver le serveur local et les modifications moteur de l’utilisateur. Aucun commit ni déploiement ; migrations préparées, pas appliquées sans autorisation explicite.

- [x] Contrats d’administration, filtres, permissions et tests de validation.
- [x] Modèles/migration de paramètres versionnés et journal atomique des actions.
- [x] API de lecture : vue d’ensemble, joueurs/fiches, cartes, extensions, ouvertures, parties (sans état caché), journal.
- [x] Écritures validées : Berrys, collection, cartes, extensions, règles de boosters et économie ; motifs, idempotence, comparaison avant/après et contrôle de concurrence.
- [x] Intégration de l’économie configurée à tous les calculs effectifs (prix, portefeuille, récompenses, revente).
- [x] Navigation et interfaces d’administration, recherches, détails, formulaires avec aperçu avant confirmation, liens depuis les signalements.
- [x] Tests ciblés, typecheck, lint, essais navigateur avec données simulées, revue et compte rendu de la migration à autoriser.

Vérification : suites ciblées 58/58 puis 13/13 après corrections ; typecheck et lint ciblé réussis ; navigateur isolé avec données simulées : vue d’ensemble desktop/mobile, compteurs, graphique, filtres, statut et refus non-admin réussis. Revue sans blocage majeur. Migration admin_workspace préparée, non appliquée. Aucun commit ni déploiement.

Activation autorisée par « vasy » : migration admin_workspace appliquée uniquement à localhost:5432/cardgame après sauvegarde protégée et vérifiée ; Prisma régénéré ; tables et vue d’ensemble contrôlées en lecture seule.
