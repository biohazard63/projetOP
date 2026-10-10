# Unicité des cartes dans un booster — 2026-10-10

Aucun numéro officiel répété dans une nouvelle ouverture, même entre illustrations alternatives. OP01-001 et OP-01-001_p1 partagent l’identité OP01-001. Pour les identifiants non officiels, le code (ou l’id) sans suffixe _pN est utilisé. Une carte déjà possédée reste éligible : aucun filtrage fondé sur la collection.

Les tirages restent côté serveur, les reçus existants ne sont pas recalculés. Les nouvelles ouvertures archivent le générateur version 2 et le mode sans remise par numéro.

## Vérification

- PASS : 57 tests unitaires, dont unicité, variantes, poids nuls, pools qui se chevauchent, aucun remplacement de rareté et probabilités d’un slot sur 40 000 simulations.
- PASS : 15 tests d’intégration dans op_boosters_test uniquement : persistance, 10 requêtes concurrentes de même clé, rejeu, 8 clés différentes concurrentes, rollback, historique privé, absence de crédit si les numéros sont insuffisants.
- PASS : TypeScript et ESLint ciblé.
- PASS : 200 simulations sans écriture pour chacune des 18 extensions disponibles ; 3 594 résultats, aucun numéro répété.
- BLOCKED : six compositions impossibles refusées sans attribution : OP-13 (3), OP-16 (1), OP-17 (1), OP14-EB04 (1). Les profils génériques concernés nécessitent un équilibrage explicite. Les choix de rareté ne sont pas retirés ou repondérés silencieusement.
- NOT_TESTED : nouvelle compilation de production et parcours navigateur pour cette modification serveur ; interface inchangée.

Commandes : npm test ; DATABASE_URL=<base isolée> npm run test:boosters:integration ; npx tsc --noEmit ; npx eslint sur les cinq fichiers TypeScript modifiés. La simulation lit PostgreSQL local dans une transaction READ ONLY puis tire en mémoire. Aucune ouverture en production, migration, modification du catalogue, attribution réelle, push ou déploiement.

Preuves : evidence/no-duplicates-unit.txt, evidence/no-duplicates-integration.txt et evidence/no-duplicates-catalog.json.


Suite : MANAGED_PROFILES.md documente les profils complets validés, avec 9 500 simulations sans les refus rencontrés dans le profil historique. Compilation et parcours navigateur ont depuis été réellement exécutés. Le profil historique reste actif tant que les nouveaux taux ne sont pas approuvés et enregistrés.
