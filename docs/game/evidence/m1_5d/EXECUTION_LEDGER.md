# Execution ledger — docs/game/M1_5D_IMPLEMENTATION_PLAN.md

Ruling: exécution dans le checkout demandé, branche maintenance/catalog-rebuild ; snapshot des sources dans /private/tmp/mugiwara-m15d-original, build isolé. Aucun commit global du noyau non suivi préexistant.
Pre-flight: tâches 1→2/3/4 partagent contrats ; même runtime et même applyCommand, schémas versionnés. Tâche 5 consomme les états/traces réels.
Réserves : remplacements multiples et KO multiples refusés ; coût interrompu distinct d'une erreur technique.

## Clôture des cinq étapes — 11 octobre 2026

1. Contrats/versions/capture : implémentés, validation et compatibilité historique testées.
2. Ordonnanceur : lots initiaux/cascades, ordre par contrôleur et choix JSON testés ; sources capturées, générations et reprises vérifiées.
3. Paiements/opérations : repos source/DON et séquences couverts ; distinction initialement impossible/interrompu/erreur technique vérifiée. Unification complète des anciens chemins non réalisée : verdict PARTIAL.
4. Cartes réelles : Caribou, Usopp, Sabo et interaction Shanks exécutés. Sabo une victime ; plusieurs remplacements et KO groupés refusés. Aucune certification PLAYABLE_VERIFIED.
5. Vérifications : 34/34 ciblés, 234/234 complets, tsc sortie0, lint sortie0 (0 erreur/99 avertissements), build isolé sortie0, génération/relecture traces sortie0. Voir fichiers final-*.log et final-source-hashes.json.

Revue indépendante : trois régressions corrigées et testées RED/GREEN (paiement PLAY_CARD interrompu, limite automatique par tour, restauration file falsifiée). Couverture complémentaire : puissance de base/courante, deuxième victime et tour de Sabo, source invalide et nouvelle génération. Deux fixtures corrigées après échecs réels ; aucun refus réglementaire retiré pour rendre les tests verts.

Arbitrages : aucune exécution de coût alternatif/défausse/déplacement ni de KO multivictime ; aucune priorité de remplacement inventée. La sélection automatique des DON d'un coût REST_DON de laboratoire ne vaut pas couverture générale. Anciens chemins LittleOars/retours DON et traçabilité exhaustive restent à unifier. Les checkboxes originales du plan sont une spécification historique ; ce ledger et le rapport distinguent les livraisons des éléments non couverts.

Aucun push, déploiement, migration ni changement DB/UI/métier. M2 non commencé.
