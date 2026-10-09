# Ouverture de booster non confirmée en production

## Constat

L’utilisateur signale : « Ouverture non confirmée. Réessayez avec la même clé pour récupérer votre résultat. » Le texte exact vient du handler serveur `src/lib/boosters/http.ts`, pour une exception imprévue avec réponse HTTP 500. Le navigateur conserve volontairement la même clé pour éviter un second crédit. Ce message seul ne permet pas de conclure qu’aucune carte n’a été enregistrée.

Les logs antérieurs indiquaient seulement « Opération booster échouée », sans code exploitable. L’utilisateur a fourni l’URL `https://projet-op.vercel.app` et le relevé de la requête, mais pas encore l’exception serveur détaillée. Son problème n’est **pas déclaré résolu**.

### Relevé reçu et contrôles publics

POST /api/booster/open, 9 octobre 2026 à 20:50:57 Europe/Paris, HTTP 500, request bfhh4-1791571857150-b370de9a3c95, déploiement dpl_FsgZ7VR3ayJYzS6aLDxedoP9k51Y sur main. Runtime Node 24.x, exécution 2,06 s, pare-feu autorisé. La durée ne montre pas une interruption par dépassement du temps maximal Vercel. Node 24 respecte les engines du package (>=22 <25).

La référence distante origin/main contient la fusion de la refonte (3bf891b) et le handler générique, mais pas le correctif local f5fdbeb. L’origine Git ne permet pas à elle seule de certifier le SHA du déploiement Vercel.

Contrôles **GET uniquement et anonymes** à 20:53 : /api/cards 200 avec 3033 cartes ; ST-28 contient 15 cartes (L 1, UC 4, C 6, R 2, SR 2). /api/sets 200. /api/booster, /api/booster/history et /api/collector retournent 401. La connexion de lecture et les protections anonymes fonctionnent. Ces contrôles ne vérifient ni les colonnes des reçus, ni le droit d’écriture, ni la transaction. « Aucune API externe » dans le relevé Vercel ne permet pas de conclure à l’absence de connexion PostgreSQL TCP. Aucun POST ni cookie d’utilisateur utilisé.

## Hypothèse à confirmer

Le modèle utilise désormais idempotencyKey, creditedAt, resultSnapshot et rulesSnapshot. La migration `20261009120000_secure_booster_openings` a été appliquée à la base locale, mais aucune application à une base de production n’est attestée. Le script vercel-build fait prisma generate et next build, sans migration. Générer Prisma Client ne modifie pas le schéma distant.

Un schéma dépourvu de ces colonnes produit bien P2022, reproduit sur PostgreSQL isolée. P2021 correspond à une table absente et P2022 à une colonne absente : [référence officielle Prisma](https://docs.prisma.io/docs/orm/reference/error-reference). Ce sont des pistes, pas une preuve de la cause réelle en production. Connexion, pool ou transaction interrompue peuvent également provoquer le message générique.

## Corrections locales

- `failure.ts` classe les erreurs Prisma de schéma, connexion et transaction, avec message explicite conservant la clé d’ouverture.
- `http.ts` journalise uniquement une référence UUID, une catégorie et un code Prisma validé. Ni exception brute, ni stack, requête SQL, email, mot de passe, URL ou méta Prisma ne sont exposés. La référence retournée permet de retrouver le log serveur correspondant.
- Les erreurs métier gardent leurs codes et statuts. Les erreurs opérationnelles restent récupérables avec la même clé. Aucun abandon automatique d’une intention, aucune attribution dans le navigateur, aucun changement du tirage ou du modèle économique.
- `scripts/checkBoosterDatabase.ts` inspecte les quatre colonnes, les index uniques de clé d’ouverture et de positions, et la migration enregistrée. Toute inspection s’effectue dans une transaction SET TRANSACTION READ ONLY. Le rapport indique local/remote sans afficher l’hôte ou les identifiants. Il ne modifie rien et ne lance aucune migration. Ce contrôle ciblé ne remplace pas un diff Prisma complet.

## Diagnostic à effectuer sur la vraie destination

Obtenir les lignes de console de POST /api/booster/open ou inspecter le schéma de sa base. Sur un environnement disposant déjà des variables sécurisées de **la base utilisée par la production**, depuis cardgame :

```bash
node --import tsx scripts/checkBoosterDatabase.ts
```

Un PASS sur le .env local ne valide pas la production. Si la cible n’est pas celle du déploiement, ne pas en déduire la cause de l’incident.

À défaut d’accès au script, dans l’éditeur SQL de la base réellement utilisée par Vercel, ce SELECT ne lit que les métadonnées :

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'BoosterOpening'
  AND column_name IN ('idempotencyKey', 'creditedAt', 'resultSnapshot', 'rulesSnapshot');
```

Quatre lignes sont attendues pour le schéma public standard. Un autre schéma dans l’URL de connexion nécessite de sélectionner ce schéma ; ne jamais partager l’URL ou ses identifiants. Une absence de colonne doit être confirmée sur la bonne destination avant toute migration.

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
| Catalogue public et protection des APIs privées en production | PASS | public-readonly-check.json : 2 GET 200 et 3 GET 401 |
| Cause exacte de l’incident en production | BLOCKED | Exception serveur ou inspection du schéma de la vraie base manquante |
| Ouverture réelle en production | NOT_TESTED | Aucune ouverture de test sur une base réelle |
| Nouveau handler HTTP avec erreurs injectées | NOT_TESTED | Classification unit-testée et moteur réellement testé ; pas de nouvelle injection HTTP |

Toutes les écritures des tests sont limitées à `127.0.0.1:55432/op_boosters_test`, vérifié avant connexion. La reproduction crée un nouveau schéma fixture incomplet, conservé pour inspection ; aucune table existante n’est supprimée ou altérée. Le serveur local a été arrêté pendant le build puis relancé dans le Terminal séparé sur le port 3000 avec le .env habituel. Aucun déploiement, push, reset ni mutation de production.
