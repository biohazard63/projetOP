# Installation et démarrage sur Mac Apple Silicon

Utiliser Node 22 LTS (testé : 22.22.2), npm 10 et Docker Desktop. Dans le dépôt :

```bash
cd cardgame
npm ci
npx prisma validate
npm run typecheck
npm run lint
npm test
npm run build
```

npm ci génère le client Prisma via postinstall sans modifier la base. Le premier build télécharge Inter depuis Google Fonts : un accès réseau est nécessaire. Les moteurs Prisma darwin-arm64 ont été validés.

Configurer `.env` sans le committer : DATABASE_URL, NEXTAUTH_SECRET et NEXTAUTH_URL. Ne jamais appliquer db push/reset ou migrate sur une base inconnue. Les providers Google/GitHub exigent des credentials valides ; EMAIL_SERVER est la variable attendue pour SMTP et non les seules variables HOST/PORT. Les tests ont désactivé ces services externes.

## Environnement de test strictement isolé

Le conteneur créé durant cette mission s'appelle op-recovery-postgres, PostgreSQL 16, port local 55432, base op_recovery_test. Le mot de passe ci-dessous est uniquement celui de la fixture locale, jamais un secret existant. Si le conteneur existe déjà, le démarrer plutôt que relancer docker run.

```bash
docker start op-recovery-postgres
export DATABASE_URL='postgresql://op_test:op_test_local_only@127.0.0.1:55432/op_recovery_test'
export NEXTAUTH_SECRET='recovery-local-test-only-secret-2026'
export NEXTAUTH_URL='http://localhost:3007'
export AUTH_TRUST_HOST=true
export GOOGLE_CLIENT_ID='' GOOGLE_CLIENT_SECRET='' GITHUB_ID='' GITHUB_SECRET='' EMAIL_SERVER='' CAPTCHA_PROVIDER=''
node --import tsx tests/seed-recovery.ts
npm run dev -- --hostname 127.0.0.1 --port 3007
```

Pour une nouvelle installation, créer un conteneur neuf avec `docker run --name op-recovery-postgres -e POSTGRES_USER=op_test -e POSTGRES_PASSWORD=op_test_local_only -e POSTGRES_DB=op_recovery_test -p 127.0.0.1:55432:5432 -d postgres:16-alpine`, puis appliquer `npx prisma migrate deploy` uniquement avec l'URL isolée ci-dessus. L'historique versionné correspond au schéma. Le seed refuse toute autre base/port/hôte.

Dans un second terminal, définir la même DATABASE_URL puis `npm run test:functional`. Le test utilise Chrome à son chemin standard macOS, crée des comptes example.test, teste les API et la navigation desktop/mobile et écrit /tmp/op-functional.json. Il refuse une URL de base différente. Vérifier que le serveur 3007 est bien celui lancé avec cette base isolée. Les comptes de test restent dans cette base pour inspection.

Pour un lancement normal après configuration vérifiée : `npm run dev` puis http://localhost:3000. Pour un lancement de production local : `npm run build && npm start` ; les cookies de session sont Secure en NODE_ENV=production, donc utiliser HTTPS pour tester l'authentification de ce mode.

Aucun script de suppression, import reset ou restauration n'est nécessaire au démarrage. Les anciens alias backup/restore pointaient sur des fichiers absents et ont été retirés. Ne pas traiter leur mention dans l'ancien README comme une garantie de sauvegarde.

Le conteneur de test n'est pas supprimé. `docker stop op-recovery-postgres` permet de libérer ses ressources en conservant les données. Aucun push ni déploiement n'est inclus.
