# Points restants

| Point | État | Suite nécessaire |
|---|---|---|
| Migration de la base existante | PASS | Reconnexion demandée ensuite par l’utilisateur : base locale PostgreSQL 16.4 sauvegardée, migration additive appliquée, contenu des 30 tables existantes identique avant/après. Voir RECONNECTION.md. |
| 18 extensions incompatibles avec leurs règles | BLOCKED | Examiner imports et modèle de slots par extension ; absence UC/R peut être légitime pour ST/EB. Aucun fallback ni carte inventée. Liste dans catalog-availability.json. |
| Taux physiques/officiels | NOT_TESTED | Aucun taux officiel revendiqué. Obtenir des sources fiables et décider du modèle de simulation avant toute nouvelle configuration. |
| Anciennes chances de variantes/DON/types | BLOCKED | Leur signification n'est pas assez précise pour les traduire en contraintes simultanées. Champs conservés et avertissement affiché ; format v1 disponible. |
| Anciens crédits d'ouverture | BLOCKED | Absence de preuve transactionnelle. Historique lisible, aucune attribution rétroactive automatique. Une éventuelle réconciliation exige une analyse des données. |
| Images distantes du catalogue réel | NOT_TESTED | Navigateur testé avec images locales synthétiques. Config Next existante conservée ; contrôler les hébergeurs réels avant de conclure sur leur disponibilité. |
| Safari/iOS et Android physiques | NOT_TESTED | Desktop/mobile testés dans Chrome macOS, viewport 390×844 et mouvement réduit. Compléter sur appareils réels. |
| Stockage navigateur refusé, crash complet avant réponse | NOT_TESTED | Code de tolérance et historique serveur présents ; rafraîchissement et réponse perdue réellement testés. Ajouter un scénario navigateur de stockage totalement refusé si nécessaire. |
| Test de charge soutenu / plusieurs machines | NOT_TESTED | Verrou et unicité PostgreSQL partagés, tests concurrents réels sur une machine. Aucun quota métier ajouté à la simulation gratuite. Évaluer une limitation de débit distribuée en cas de publication. |
| Suite fonctionnelle globale maintenance | NOT_TESTED | Seuls ses scénarios de boosters ont été adaptés au nouveau contrat. Non rejouée pour respecter l'exclusion explicite des modules de jeu. Exige une base de test avec la nouvelle migration. |
| Dépendances transversales / warnings legacy | Hors périmètre | Aucune dépendance modifiée ; avertissements du code existant conservés sans désactiver les contrôles. Voir docs/maintenance. |

Les scripts initBoosters/testBoosters/simulateDrops n'importent plus configureSetRules et ne déclenchent plus de reconfiguration implicite. initBoosters affiche un aperçu en lecture seule ; son option --apply n'est permise que sur op_boosters_test. Les autres scripts d'import/configuration anciens n'ont pas été lancés : ils doivent être examinés avant écriture sur une base réelle.

Aucun déploiement, fusion, push, reset, suppression de base ou modification du code de combat/multijoueur. Les fixtures et les ouvertures synthétiques sont conservées dans la base isolée, sans restauration ni effacement de données existantes.

Validation finale : npm ci/build/TypeScript/tests réussis ; ESLint 0 erreur et 109 avertissements legacy. npm ci signale toujours **12 vulnérabilités élevées** des dépendances transversales déjà recensées dans docs/maintenance/DEPENDENCIES.md. Pas de nouvelle dépendance, pas de mise à jour ni d'audit fix forcé dans cette phase boosters.
