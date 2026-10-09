# Ouverture de booster non confirmée en production

## Constat

L’utilisateur signale : « Ouverture non confirmée. Réessayez avec la même clé pour récupérer votre résultat. » Le texte exact vient du handler serveur `src/lib/boosters/http.ts`, pour une exception imprévue avec réponse HTTP 500. Le navigateur conserve volontairement la même clé pour éviter un second crédit. Ce message seul ne permet pas de conclure qu’aucune carte n’a été enregistrée.

Les logs antérieurs indiquaient seulement « Opération booster échouée », sans code exploitable. Aucune URL de production ni erreur serveur détaillée n’est disponible à ce stade. La production n’a pas été testée et son problème n’est **pas déclaré résolu**.

## Hypothèse à confirmer

Le modèle utilise désormais idempotencyKey, creditedAt, resultSnapshot et rulesSnapshot. La migration `20261009120000_secure_booster_openings` a été appliquée à la base locale, mais aucune application à une base de production n’est attestée. Le script vercel-build fait prisma generate et next build, sans migration. Générer Prisma Client ne modifie pas le schéma distant.

Un schéma dépourvu de ces colonnes produit bien P2022, reproduit sur PostgreSQL isolée. P2021 correspond à une table absente et P2022 à une colonne absente : [référence officielle Prisma](https://docs.prisma.io/docs/orm/reference/error-reference). Ce sont des pistes, pas une preuve de la cause réelle en production. Connexion, pool ou transaction interrompue peuvent également provoquer le message générique.

## Corrections locales

- `failure.ts` classe les erreurs Prisma de schéma, connexion et transaction, avec message explicite conservant la clé d’ouverture.
- `http.ts` journalise uniquement une référence UUID, une catégorie et un code Prisma validé. Ni exception brute, ni stack, requête SQL, email, mot de passe, URL ou méta Prisma ne sont exposés. La référence retournée permet de retrouver le log serveur correspondant.
- Les erreurs métier gardent leurs codes et statuts. Les erreurs opérationnelles restent récupérables avec la même clé. Aucun abandon automatique d’une intention, aucune attribution dans le navigateur, aucun changement du tirage ou du modèle économique.
- `scripts/checkBoosterDatabase.ts` inspecte les quatre colonnes, les index uniques de clé d’ouverture et de positions, et la migration enregistrée. Toute inspection s’effectue dans une transaction SET TRANSACTION READ ONLY. Le rapport indique local/remote sans afficher l’hôte ou les identifiants. Il ne modifie rien et ne lance aucune migration. Ce contrôle ciblé ne remplace pas un diff Prisma complet.

## Diagnostic à effectuer sur la vraie destination

Obtenir l’URL de production et les logs de POST /api/booster/open. Sur un environnement disposant déjà des variables sécurisées de **la base utilisée par la production**, depuis cardgame :

```bash
node --import tsx scripts/checkBoosterDatabase.ts
```

Un PASS sur le .env local ne valide pas la production. Si la cible n’est pas celle du déploiement, ne pas en déduire la cause de l’incident.

Si des colonnes ou index manquent, examiner l’historique complet des migrations et obtenir une sauvegarde avant de proposer une application de migration à la production. Ne pas lancer migrate deploy aveuglément : il applique toutes les migrations en attente. Une base créée auparavant par db push peut nécessiter un baseline examiné. Aucun reset, db push forcé ou modification de données n’a été exécuté. Aucun automatisme de migration ajouté au build.

Après correction confirmée et autorisée de la vraie destination, utiliser « Réessayer cette ouverture » pour récupérer le reçu avec la clé conservée ; ne pas créer arbitrairement une nouvelle opération.

## Preuves

Les fichiers sont dans `evidence/production-diagnostic/`.

| Contrôle | État | Preuve |
|---|---|---|
| Tests unitaires | PASS | unit.log : 32/32, dont schéma/connexion/transaction et confidentialité |
| Tests PostgreSQL isolée | PASS | integration.log : 13/13 |
| Reproduction réelle d’un schéma sans migration | PASS | integration.log : P2022 classé DATABASE_SCHEMA_OUTDATED, zéro ouverture dans le schéma fixture |
| Concurrence, rollback et idempotence | PASS | Suite intégration existante rejouée |
| TypeScript | PASS | typescript.log, sortie 0 |
| ESLint | PASS | eslint.log : 0 erreur, 99 avertissements existants |
| Build de production local | PASS | build.log, sortie 0 |
| Schéma de la base habituelle locale | PASS | local-schema.json : colonnes et index présents, migration enregistrée |
| Cause exacte de l’incident en production | BLOCKED | URL/logs ou inspection de la vraie base manquants |
| Ouverture réelle en production | NOT_TESTED | Aucune ouverture de test sur une base réelle |
| Nouveau handler HTTP avec erreurs injectées | NOT_TESTED | Classification unit-testée et moteur réellement testé ; pas de nouvelle injection HTTP |

Toutes les écritures des tests sont limitées à `127.0.0.1:55432/op_boosters_test`, vérifié avant connexion. La reproduction crée un nouveau schéma fixture incomplet, conservé pour inspection ; aucune table existante n’est supprimée ou altérée. Le serveur local a été arrêté pendant le build puis relancé dans le Terminal séparé sur le port 3000 avec le .env habituel. Aucun déploiement, push, reset ni mutation de production.
