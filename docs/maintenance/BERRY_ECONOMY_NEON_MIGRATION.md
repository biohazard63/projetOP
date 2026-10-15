# Migration Neon : économie en Berrys et displays virtuelles

Migration concernée : `cardgame/prisma/migrations/20261015180000_berry_economy`.

## Ce que fait la migration

La migration ajoute des éléments et ne supprime rien. Elle ne modifie aucune donnée existante.

| Ajout | Détail |
|---|---|
| Colonne `User.berries` | Entier, `0` par défaut, avec la contrainte `User_berries_non_negative` (solde ≥ 0). |
| Table `BerryTransaction` | Journal des Berrys. Clé unique `(userId, idempotencyKey)`. |
| Table `VirtualDisplay` | Displays virtuelles de 24 boosters. L'index partiel `VirtualDisplay_open_per_set_key` autorise une seule display ouverte par joueur et par extension. |
| Colonnes `BoosterOpening.displayId`, `displayIndex`, `berryTransactionId` | Nullables. Les anciennes ouvertures gardent `NULL`. |

La bourse de départ (10 000 ฿) n'est pas versée par la migration. Le code la verse à la première consultation du solde, une seule fois par compte grâce à la clé `starter-grant`.

## Ordre obligatoire

Le build Vercel (`vercel-build` : `prisma generate && next build`) **n'applique aucune migration**. Le code de ce commit lit `User.berries` et les nouvelles tables. Si ce code est déployé sur une base non migrée, la connexion et l'ouverture des boosters échouent.

1. Appliquer la migration sur Neon.
2. Vérifier le schéma.
3. Seulement ensuite, pousser ou fusionner le code sur la branche que Vercel déploie en production.

## Déjà vérifié

- Base vierge isolée `op_berries_test` (127.0.0.1:55433), avec le catalogue restauré depuis `cardgame-full-20261010-171422.dump` : les 26 migrations s'appliquent.
  - Tests `tests/berries.integration.ts` : 11/11.
- Base isolée `op_boosters_test` (127.0.0.1:55432) : migration appliquée, `tests/boosters.integration.ts` 21/21.
- Base locale `cardgame` (localhost:5432), le 15 octobre 2026 :
  - sauvegarde `cardgame/.local-backups/local-before-berries-20261015-174234.dump` ;
  - `prisma migrate deploy` : seule `20261015180000_berry_economy` était en attente, elle est appliquée ;
  - `verify-economy-schema.ts` : `economy schema present`.

## Procédure sur Neon

Utiliser l'URL **directe** de Neon (hôte sans `-pooler`) pour `migrate deploy` et `pg_dump`. Prisma Migrate pose un verrou consultatif PostgreSQL, que le pooler PgBouncer ne gère pas correctement. Ne jamais afficher l'URL ni la copier dans un rapport.

```bash
cd cardgame
export NEON_DIRECT_URL='…'   # à saisir dans le terminal, ne pas committer

# 1. État avant migration (lecture seule)
DATABASE_URL="$NEON_DIRECT_URL" npx prisma migrate status
DATABASE_URL="$NEON_DIRECT_URL" npx tsx scripts/economy/verify-economy-schema.ts
#    Attendu : « Following migration have not yet been applied: 20261015180000_berry_economy »
#    et « RESULT: economy migration not applied yet ».
#    Si d'autres migrations sont en attente, s'arrêter et les examiner avant de continuer.

# 2. Sauvegarde complète (pg_dump de la même version majeure que le serveur ou plus récent)
pg_dump -Fc -f ".local-backups/neon-before-berries-$(date +%Y%m%d-%H%M%S).dump" "$NEON_DIRECT_URL"
pg_restore -l .local-backups/neon-before-berries-*.dump | grep -c "TABLE DATA"   # doit lister les tables

# 3. Migration
DATABASE_URL="$NEON_DIRECT_URL" npx prisma migrate deploy

# 4. Vérification
DATABASE_URL="$NEON_DIRECT_URL" npx prisma migrate status            # « Database schema is up to date! »
DATABASE_URL="$NEON_DIRECT_URL" npx tsx scripts/economy/verify-economy-schema.ts   # « RESULT: economy schema present »

unset NEON_DIRECT_URL
```

5. Déployer le code, puis vérifier en production avec un compte de test :
   - la pastille de solde affiche 10 000 ฿ ;
   - un booster débite 1 000 ฿ ;
   - le trésor du jour crédite une seule fois ;
   - le profil affiche la bourse.

## Retour arrière

- **Avant le déploiement du code** : la migration est additive et le code actuellement en production ignore les nouvelles colonnes et tables. On peut donc la laisser en place, sans risque.
- **Après le déploiement**, si un problème survient : revenir au déploiement Vercel précédent. La base migrée reste compatible avec l'ancien code.
- **Restauration complète** : seulement en dernier recours, depuis le dump de l'étape 2. Elle efface les ouvertures et les Berrys enregistrés depuis.

## Réglages après la mise en production

Les montants et les événements se modifient dans `cardgame/src/lib/economy/economy.json`, puis il faut redéployer. Cela ne demande aucune migration.
