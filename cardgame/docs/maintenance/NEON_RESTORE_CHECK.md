# Vérification Neon avant restauration complète

Date : 2026-10-10T15:31:23.580Z

## Résultat : BLOCKED pour la restauration complète

La connexion et la comparaison en lecture seule ont réussi. Aucun changement en production. La sauvegarde locale a déjà été restaurée avec succès dans une base isolée : 31 tables, 4 074 cartes, comptages identiques à la source et empreinte du fichier vérifiée.

Neon possède déjà 31 tables et des données utilisateur différentes. Une restauration complète telle quelle rencontrerait des conflits ; remplacer les tables ferait perdre des données de production. Aucune commande de nettoyage, reset, migration ou import n'a été exécutée sur Neon.

| Table | Sauvegarde locale | Neon |
|---|---:|---:|
| Card | 4074 | 3033 |
| CardSet | 59 | 46 |
| User | 3 | 22 |
| Account | 2 | 10 |
| UserCard | 3643 | 3604 |
| Deck | 105 | 88 |
| DeckCard | 9588 | 1624 |
| BoosterOpening | 8 | 0 |

## Écarts de schéma

Dix différences de colonnes détectées :

- BoosterOpening : idempotencyKey, creditedAt, resultSnapshot, rulesSnapshot absents de Neon. Leur absence peut provoquer les erreurs de l'API actuelle ; aucune requête d'ouverture n'a été lancée pour confirmer cette hypothèse.
- Card.cost et CardSet.releaseDate sont obligatoires sur Neon et facultatifs dans la sauvegarde.
- GameState : deux colonnes DON absentes et deux colonnes booléennes sur Neon devenues tableaux JSON dans la sauvegarde. Ne pas convertir ces données aveuglément.

Seize tables ont un contenu différent. Les nombres de lignes ne prouvent pas à eux seuls quels identifiants sont absents ou communs. Les 1 041 cartes et 13 extensions supplémentaires doivent encore faire l'objet d'une comparaison par identifiant avant import. La vérification a comparé les colonnes et les empreintes du contenu, sans audit complet des index, contraintes ou séquences.

## Procédure recommandée

1. Sauvegarder Neon avant toute écriture.
2. Restaurer cette sauvegarde dans une nouvelle base locale isolée.
3. Préparer les migrations additives indispensables aux boosters et les deux changements de nullabilité ; réconcilier l'historique Prisma sans lancer aveuglément toutes les migrations locales.
4. Simuler l'ajout des cartes/extensions absentes par identifiants stables, sans importer les utilisateurs, comptes, collections, decks, favoris, historiques ou données de jeu locaux.
5. Vérifier les références et les empreintes des données utilisateur avant/après, ainsi que les ouvertures transactionnelles et rejouées.
6. Présenter cette simulation pour validation avant les migrations et l'import de production.

## Preuves

Script exécuté : scripts/catalog/check-neon-backup.ts via npx tsx, avec une variable de connexion non imprimée. Deux transactions RepeatableRead explicitement READ ONLY. Rapport privé : .local-backups/neon-compatibility-20261010.json (comptages, empreintes et différences de colonnes ; aucune ligne utilisateur exportée).

## Remplacement autorisé et réalisé

Date : 2026-10-10T15:35:22.470Z. Après le contrôle initial, l'utilisateur a explicitement demandé de supprimer les données Neon, mettre à jour les tables et ajouter la sauvegarde complète.

- Sauvegarde Neon avant remplacement : .local-backups/neon-before-replacement-20261010.dump, privée et exclue de Git.
- Test de retour arrière : restauration dans cardgame_neon_rollback_20261010, nouvelle base locale isolée. PASS. Le dump PostgreSQL 17 a été converti en SQL pour PostgreSQL 16 local en retirant uniquement SET transaction_timeout = 0 ; archive originale inchangée.
- Empreinte SHA256 de la sauvegarde locale : PASS.
- Restauration Neon : pg_restore --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error. Code de sortie 0. Aucun déploiement ni push.
- Contrôle après restauration en lecture seule : 31 tables ; aucune différence de colonnes ni d'empreinte de contenu avec la base locale de référence. 4 074 cartes, 59 extensions, 3 utilisateurs. PASS.
- Les anciennes données Neon ont été remplacées, conformément à l'autorisation ; elles restent dans la sauvegarde de retour arrière.
- Les quatre colonnes BoosterOpening manquantes sont maintenant présentes. Une ouverture réelle via le site déployé n'a pas été testée afin de ne pas attribuer de récompense pendant le contrôle.
- L'historique Prisma est celui de la sauvegarde locale ; les deux changements de nullabilité précédemment appliqués manuellement restent à réconcilier avant de futures migrations automatiques. Ne pas lancer migrate deploy sans vérifier cet historique.
- Preuve privée après restauration : .local-backups/neon-after-replacement-20261010.json.
