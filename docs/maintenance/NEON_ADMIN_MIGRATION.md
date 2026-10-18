# Activation des signalements et de l’administration sur Neon

Préparée le 18 octobre 2026. **Non exécutée sur Neon.** L’autorisation de préparer ces fichiers et de créer le commit ne vaut pas autorisation de modifier la base distante ou de déployer.

## Contenu à appliquer

Dans cet ordre, les migrations Prisma existantes ajoutent uniquement les tables et index nécessaires :

1. `cardgame/prisma/migrations/20261018120000_issue_reports/migration.sql` : `IssueReport`, index, clé étrangère vers `User`.
2. `cardgame/prisma/migrations/20261018180000_admin_workspace/migration.sql` : `AdminSetting`, `AdminAuditLog` et index.

Aucun compte, solde, catalogue ou paramètre économique n’est réécrit. L’absence de ligne dans `AdminSetting` conserve les réglages économiques actuels. Les droits administrateur sont déterminés par la configuration serveur, pas par une modification de compte.

## Avant exécution

- Obtenir l’autorisation d’appliquer les migrations à la base Neon visée.
- Sauvegarder cette base et vérifier la sauvegarde ; consigner sa référence hors du dépôt si elle contient des informations privées.
- Utiliser la connexion **directe** PostgreSQL de la bonne base et du bon environnement, avec TLS. Fournir `DATABASE_URL` au processus de migration depuis le gestionnaire de secrets ; ne pas la committer ni la publier dans les logs. Le schéma de ce projet lit `DATABASE_URL` ; une variable `DIRECT_URL` seule ne le remplace pas.
- Exécuter les commandes depuis `cardgame/`, avec les dépendances installées. Ne pas utiliser le `.env` local comme cible de production par accident.

```sh
npx prisma validate
npx prisma migrate status
```

`migrate status` peut retourner un code non nul lorsqu’il signale des migrations en attente. Lire le résultat : les seules migrations en attente attendues sont celles listées ci-dessus, ou un sous-ensemble si l’une est déjà appliquée. **Si une autre migration est en attente, si l’historique diverge ou si une migration a échoué, arrêter et examiner la situation avant toute écriture.** L’état de Neon n’a pas été consulté pendant cette préparation.

## Application après ces contrôles et autorisation

```sh
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
```

Attention : `migrate deploy` applique **toutes** les migrations en attente ; le contrôle préalable est obligatoire. Il utilise les fichiers versionnés et enregistre leurs checksums dans `_prisma_migrations`. Ne pas utiliser `prisma db push`, `migrate reset` ou `migrate dev` sur cette base. Ne pas exécuter les SQL à la main en parallèle de `migrate deploy`.

Configurer `REPORT_ADMIN_EMAILS=sateprod@gmail.com` dans l’environnement serveur concerné, sans préfixe `NEXT_PUBLIC_`. Le compte doit se connecter avec cette adresse. Ne modifier aucune variable OAuth existante. La mise à disposition de la nouvelle version de l’application nécessite une autorisation de déploiement distincte ; `vercel-build` génère Prisma et construit l’application, mais **n’applique pas** les migrations.

## Contrôles après activation

- `prisma migrate status` confirme les deux migrations appliquées et aucune migration en attente.
- Avec le compte administrateur, `/api/admin/overview` répond 200 et contient `writesReady: true` ; `/admin` affiche la vue d’ensemble.
- Avec un compte ordinaire, l’API admin refuse l’accès. Aucun secret ni état de jeu autoritaire ne doit figurer dans les réponses.
- Les pages joueurs, cartes, extensions, économie et signalements se chargent. Tout essai d’écriture réelle doit être autorisé et utiliser un compte de test identifié.

Si l’application doit être remise à la version précédente, conserver ces tables additives et restaurer la version de code approuvée. Ne pas supprimer de tables ni de données de signalements ou d’audit sans autorisation explicite. Une restauration de sauvegarde est une opération distincte à valider.

## État local déjà vérifié

Les deux migrations ont été appliquées à `localhost:5432/cardgame` après autorisation et sauvegarde. La vue d’ensemble locale lit les nouvelles tables et confirme `writesReady: true`. Cela ne constitue pas une vérification de la base Neon.
