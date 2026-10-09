# Reconnexion à la base PostgreSQL existante

L'utilisateur a demandé, après validation des boosters sur une base isolée, de reconnecter l'application à sa base habituelle. Cette opération remplace le blocage de migration indiqué dans le rapport initial.

## Vérifications et sauvegarde

- DATABASE_URL existante chargée depuis cardgame/.env, sans afficher sa valeur ni les secrets. Aucun .env.local ou fichier .env.development ne la remplace.
- Base locale, port 5432, PostgreSQL 16.4 Postgres.app.
- Historique Prisma : les 16 migrations précédentes terminées, aucune migration échouée. Pas de baseline à inventer.
- Prisma migrate diff en lecture seule : uniquement les quatre colonnes BoosterOpening, les deux index et les deux FK prévus par la migration des boosters. Aucun autre changement de schéma.
- Sauvegarde pg_dump 16 en format custom, archive vérifiée avec pg_restore --list. Aucune restauration exécutée.
- Copie persistante privée dans `cardgame/.local-backups/one-piece-db-backup-2026-10-09T11-17-41-979Z.dump`, 444616 octets, permissions 0600, dossier privé et exclu de Git. Une copie initiale se trouve également dans /private/tmp. Ne jamais publier l'archive : elle contient les données de la base.

## Migration appliquée

`npx prisma migrate deploy` a appliqué seulement `20261009120000_secure_booster_openings`. Les colonnes nullable préservent les anciennes lignes ; les nouvelles contraintes protègent les références. Aucun reset, suppression, seed, import ou changement de collection.

Comparaison de chaque table avant/après : nombre de lignes et empreinte déterministe du contenu des colonnes existantes. **30 tables identiques**, hors table technique de migrations. Le schéma correspond maintenant exactement à prisma/schema.prisma (migrate diff --exit-code =0). Preuve : evidence/database-reconnection.json, sans aucune donnée de compte ni URL de connexion.

Données présentes : 3 utilisateurs, 3033 cartes, 46 extensions, 3622 lignes UserCard, 105 decks, 9588 DeckCard, 94 versions de decks. Ouvertures historiques : 0. Les tests n'ont créé ni compte, ni booster, ni ouverture dans cette base.

## Application démarrée

Le serveur connecté à la base isolée a été arrêté. Le Terminal séparé a été relancé avec `npm run dev -- --port 3007` et les variables DATABASE_URL/secret de session fournies par .env, sans les overrides de test. AUTH_URL/NEXTAUTH_URL restent sur http://localhost:3007 pour ce serveur local. .env n'est pas modifié.

Des sessions locales temporaires, non consignées et limitées à 120 secondes, ont permis de vérifier en lecture seule les API avec des comptes existants ; aucun mot de passe ni compte modifié. Catalogue : 46 extensions, historique et collection : HTTP 200. Vérification supplémentaire d'une collection non vide : voir evidence/reconnection-collection.json. Aucune ouverture réelle déclenchée pour tester.

L'application utilise désormais les comptes et collections habituels. Les cookies de la session de test précédente sont invalides avec le secret habituel : se reconnecter avec son compte existant. Les 18 extensions incompatibles avec leurs règles restent annoncées indisponibles ; reconnecter la base ne change pas leurs règles.

## Adresse locale rétablie pour Google OAuth

Le premier redémarrage sur localhost:3007 surchargeait l'adresse initialement configurée (localhost:3000) et générait `http://localhost:3007/api/auth/callback/google`. L'utilisateur a ensuite signalé une erreur Google redirect_uri_mismatch.

Le serveur a été remis sur **http://localhost:3000**, dans le même Terminal, avec NEXTAUTH_URL issue de .env et sans override AUTH_URL/NEXTAUTH_URL du port de test. Base, secrets et identifiants OAuth inchangés. Le flux sign-in local a été interrogé sans suivre la redirection Google : callback généré vérifié **http://localhost:3000/api/auth/callback/google**, PASS. Preuve : evidence/google-callback.json. Connexion Google complète : NOT_TESTED, elle nécessite le consentement de l'utilisateur.

Google exige une correspondance exacte avec une URI de redirection autorisée du client OAuth (protocole, hôte, port, chemin et slash). Si l'erreur persiste sur le port 3000, vérifier dans Google Cloud Console l'autorisation exacte de `http://localhost:3000/api/auth/callback/google` pour le client utilisé par .env. Aucun accès ni modification de Google Cloud Console n'a été effectué. Référence officielle : https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch.
