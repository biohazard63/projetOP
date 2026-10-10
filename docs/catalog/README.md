Le catalogue reconstruit est généré localement dans `cardgame/data/onepiece/`. Ces fichiers ne sont pas publiés dans Git : ils contiennent des archives dont les droits de redistribution restent à vérifier et un snapshot de catalogue local. Les fichiers historiques restent à leurs emplacements initiaux.

Depuis `cardgame/` :

```bash
npm run catalog:audit               # fichiers + PostgreSQL LOCAL, transaction READ ONLY
npm run catalog:audit -- --files-only
npm run catalog:sync                # fusion des archives, pas de réseau, pas d'import
npm run catalog:translate           # glossaire + mémoire + références FR provisoires
npm run catalog:validate
npm run catalog:import:dry-run      # SELECT uniquement sur PostgreSQL LOCAL
node scripts/scrape-onepiece-fr.js --list-sets
```

Le dernier `--list-sets` affiche les groupes historiques locaux, pas une liste officielle actuelle. La découverte distante et les téléchargements exigent une autorisation de reproduction réellement obtenue auprès de la source. Le drapeau `--authorized-source` enregistre la déclaration de l'opérateur ; il n'accorde aucun droit. Ne pas l'utiliser simplement pour supprimer le blocage.

Avec une autorisation vérifiée :

```bash
node scripts/scrape-onepiece-fr.js --authorized-source --list-sets
node scripts/scrape-onepiece-fr.js --authorized-source --sync-new --dry-run
node scripts/scrape-onepiece-fr.js --authorized-source --set OP-01,EB-01 --update-existing --dry-run
```

Après examen du rapport, retirer `--dry-run` applique uniquement les exports et téléchargements locaux. Aucun de ces appels ne fait un import Prisma. `--all`, `--all-sets`, `--lang=en` et `--en` sont conservés ; l'anglais explicite est un choix d'opérateur, sinon le français est préféré. `--delay` vaut 1500 ms, minimum 1000 ; `--retries` vaut 2 tentatives supplémentaires, maximum 3. `Retry-After` est respecté jusqu'à 60 s, au-delà l'opération échoue et doit être reprise plus tard. Les réponses 400/401/403/404 ne sont pas répétées. Aucun contournement de restriction, CAPTCHA ou authentification.

La sélection et les modales du site sont traitées par Playwright. Les détails de toutes les cartes sont actuellement intégrés au DOM, y compris les pages masquées. Si le nombre extrait ne correspond pas au total annoncé, l'extension n'est pas remplacée : une évolution vers une pagination serveur devra être prise en charge explicitement. Un échec FR ne provoque pas de basculement silencieux de tout le catalogue en anglais. Le secours EN sert aux extensions absentes de la découverte FR ; les archives EN restent conservées.

Les tests CLI acceptent `--fixture FILE` contenant `sets` et `cards`, explicitement synthétiques. `--dry-run` ne télécharge pas les images et ne modifie ni le catalogue ni les exports. Le script fourni initialement est conservé intégralement dans `evidence/scrape-onepiece-fr.original.js.txt`.

Le fichier `catalog/current.json` désigne une génération immuable, contenant les fichiers `FAMILLE/CODE/cards.json`, `variants.json`, `extensions.json` et `master-catalog.json`. Le maître est reconstruit à partir des fichiers de la génération. Les copies `catalog/master-catalog.json` et `catalog/extensions.json` facilitent l'inspection. Les générations précédentes ne sont pas supprimées. Les écritures JSON sont atomiques et les reconstructions sérialisées par un verrou local. Une collecte partielle fusionne les variantes et appartenances antérieures.

Les identités sont séparées : numéro officiel (`OP01-001`), variante (`OP01-001::standard` ou `OP01-001::_p1`), édition (`OP01-001::_p1@PRB-01`). Le suffixe d'illustration provient du nom de fichier officiel lorsqu'il est exploitable, sinon de l'identifiant historique. La langue et les paramètres de cache URL ne créent pas une nouvelle variante. Les identifiants anciens restent dans `legacyIds`. Les appartenances portent leurs codes de rareté observés : une différence entre éditions est conservée et signalée. Une même clé peut conserver plusieurs illustrations localisées ; aucune image historique n'est écrasée.

La mémoire utilise SHA-256 de `champ + NUL + original`. Les valeurs `original`, `fr`, `translationStatus`, `source` et `originals` restent disponibles. `official` signifie provenance explicite depuis une fiche du catalogue FR dans les archives ; ce statut n'accorde aucun droit de redistribution. Une URL d'image FR seule ne suffit pas. `validated` exige une validation effectivement enregistrée. Le glossaire et les réutilisations par numéro sont `machine` et à réviser. Les inconnues restent `null`, sans fallback anglais présenté comme français.

Importer une mémoire revue :

```bash
npm run catalog:translate -- --memory-file /chemin/memoire.json
```

Un service de traduction **local** peut être configuré explicitement :

```bash
npm run catalog:translate -- --translation-endpoint http://127.0.0.1:9999/translate --limit 50
```

Contrat : POST JSON `{field, original, sourceLanguage, targetLanguage, preserve, provisional}`, réponse `{fr}`. Aucun service distant ou payant n'est invoqué automatiquement. Les traductions produites sont toujours `machine`. Un contrôle conservateur préserve l'ordre des nombres signés, DON!!, références de cartes et traits entre accolades. Il peut refuser une traduction correcte qui reformule ces éléments ; il ne garantit pas les conditions sémantiques ou les négations. Une révision humaine reste nécessaire. Une mémoire provisoire ne peut pas remplacer une mémoire validée de priorité supérieure.

Simulation isolée uniquement :

```bash
DATABASE_URL='postgresql://op_test:op_test_local_only@127.0.0.1:55432/op_boosters_test' npm run test:catalog:integration
DATABASE_URL='postgresql://op_test:op_test_local_only@127.0.0.1:55432/op_boosters_test' npm run test:catalog:full-import
DATABASE_URL='postgresql://op_test:op_test_local_only@127.0.0.1:55432/op_boosters_test' npm run catalog:import:test
```

Ces identifiants sont exclusivement ceux de la fixture locale existante. L'écriture CLI refuse toute autre destination. Les tables `Catalog*` sont un staging ; elles ne remplacent pas `Card`. Les transactions et un verrou PostgreSQL sérialisent les imports concurrents. Le reçu par empreinte rend le rejeu idempotent ; un échec annule entièrement l'import, la relance reprend sans attribution ni double création. Les conflits d'alias sont laissés sans nouvelle correspondance automatique. Les identifiants des joueurs ne sont jamais réécrits.

Le schéma proposé est `schema-proposal.prisma`, validé mais **hors du dossier de migrations actives**. Le SQL additionnel se trouve dans `cardgame/scripts/catalog/schema.sql`. Aucune migration ou importation de production n'a été réalisée. Ne pas utiliser les anciens `import:sets:reset` ou imports globaux pour ce format maître.
