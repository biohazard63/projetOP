# Catalogue Mugiwara — bilan local du 10 octobre 2026

## Mise à jour après réception de `carteJson/nouvelle`

### Import complet dans la base locale demandé ensuite

**Restriction de produits demandée :** la page Boosters affiche exclusivement les codes numériques OP, OP…-EB…, EB et PRB. La galerie Extensions conserve tous les produits. Le service serveur rend ST, promotions et autres produits indisponibles et refuse une nouvelle ouverture de ces familles avec `NOT_A_BOOSTER` (403), même par appel direct. Aucun taux de tirage ni enregistrement de carte modifié. Les fixtures d’intégration ont été adaptées aux codes OP numériques pour conserver les scénarios d’idempotence, concurrence, droits et rollback.

Vérifications de cette restriction : **53/53 tests unitaires PASS**, **13/13 tests d’intégration isolés PASS**, TypeScript, ESLint des fichiers concernés et build production **PASS**. Preuves `booster-products-unit.log`, `booster-products-integration.log`, `booster-products-build.log`. Lecture locale : 59 extensions, 20 produits dans les familles de boosters autorisées, 39 autres produits tous indisponibles à l’ouverture. Les anciens reçus et l’historique restent consultables sans nouvelle attribution.

**Correction de visibilité dans Extensions / Boosters :** 13 CardSet créés dans la base locale avec `releaseDate=NULL` et 1 041 nouvelles cartes reliées par `setCode`. Migration additive `20261010190000_nullable_set_release_date`, testée sur la base isolée puis exécutée localement. Dates existantes conservées ; aucune date inventée. Les 8 réimpressions qui avaient déjà un autre `setCode` conservent leur produit d’origine (4 OP-13, 3 OP14-EB04, 1 ST-31) ; leurs appartenances multiples restent dans le maître. Le modèle Card à setCode unique ne les expose pas encore dans les deux fiches d’extension. Aucune règle de tirage modifiée, aucune donnée joueur modifiée (hash identique). Preuves : `register-new-sets-local.json`, `register-new-sets-test.json`, `new-sets-catalog.json`. Une présence dans la galerie n’autorise pas à remplacer silencieusement les raretés manquantes : l’ouverture reste bloquée lorsque les pools ne satisfont pas les règles existantes.

Sur **localhost:5432/cardgame uniquement**, les 1 049 variantes fournies sont toutes représentées : **1 041 nouvelles cartes ajoutées** (948 lors du premier import, puis 93), **8 variantes déjà existantes conservées**. Total Card : **4 074**. Une nouvelle prévisualisation donne 0 insertion et 1 049 variantes présentes. Les hashes des données joueurs et des cartes préexistantes sont contrôlés dans les transactions ; aucune carte préexistante ni référence joueur modifiée.

Migration minimale `20261010180000_nullable_card_cost` : `Card.cost` devient nullable. Le SQL `DROP NOT NULL` a été testé sur PostgreSQL isolé puis exécuté directement avec `prisma db execute` sur la base locale autorisée ; aucun `migrate deploy`, reset ou migration de production. L’exécution directe ne crée pas une entrée dans `_prisma_migrations` : réconcilier l’historique avant tout déploiement futur, après examen des migrations historiques.

L’option `--all-source` de `scripts/catalog/import-new-local.ts` ajoute les fiches manquantes depuis les JSON fournis, en conservant leurs noms, textes, illustrations et valeurs numériques. Les types/couleurs sont normalisés vers les codes internes attendus ; les coûts absents restent NULL, pas zéro. Les fiches déjà attribuées ne sont pas réécrites. Les produits inconnus restent dans `Card.set`, avec `setCode=NULL` faute de CardSet et de date de sortie fiable. **La création des CardSet et leur ouverture en booster restent à traiter séparément** ; aucun taux ni date inventé.

Compatibilité de compilation : le convertisseur existant de GameBoard accepte les Leader/DON sans coût et refuse explicitement une autre carte au coût inconnu ; aucun développement du moteur de combat. Le catalogue et les fiches n’attribuent pas de coût artificiel aux cartes.

Preuves : `new-local-all-applied.log`, `new-local-all-after.log`, test isolé `nullable-cost-integration.log` **1/1 PASS**, tests unitaires `nullable-cost-unit.log` **51/51 PASS**. Sauvegarde locale des cartes avant chaque ajout dans les rapports ignorés `data/onepiece/reports/local-backup-before-new-*.json`.

Prévisualisation demandée ensuite : `scripts/catalog/preview-app.ts` a inséré **3 786 fiches dans Card sur la base de test isolée** (4 000 lignes avec les fixtures préexistantes), sans mise à jour de carte existante ni écriture dans les tables des joueurs. L’application locale est lancée avec DATABASE_URL surchargée pour ce processus seulement ; `.env` n’est pas modifié. Les extensions sans date connue utilisent une date technique 1970 explicitement signalée en description, uniquement pour satisfaire le modèle de test. Aucune configuration de tirage ajoutée. Preuve : `evidence/app-preview.json`. Cette étape remplace la mention « pas encore intégré aux tables actives » pour la base de test uniquement.

Les chiffres de cette section remplacent le bilan initial conservé ci-dessous. Les 13 fichiers fournis contiennent **1 049 observations**, fusionnées sans collecte réseau : **1 041 variantes supplémentaires et 729 numéros supplémentaires**. Les huit observations restantes enrichissent des variantes déjà connues.

- Maître : **2 667 numéros, 4 179 variantes, 74 groupes, 4 821 associations**, dont 485 variantes présentes dans plusieurs groupes.
- Export français compatible Card : **3 786 variantes / 2 523 numéros**, contenant des libellés ou traductions provisoires signalés.
- Champs textuels présents avec français disponible : **4 033 variantes**.
- **393 variantes bloquées**, avec motifs pouvant se recouper : 93 coûts obligatoires inconnus, 157 conflits numériques et des textes manquants. Aucun coût inventé pour rendre une fiche importable.
- **301 champs sans français**, dont les 18 noms de groupes historiques. Le détail est dans `evidence/catalog-summary.json`.
- Reçus : OP-13, OP-16, OP-17, ST-29 à ST-36, ainsi que **OP14-EB04 et OP15-EB04**. Les deux produits combinés sont conservés sous les codes fournis, sans découpage arbitraire des réimpressions EB04.
- **PRB-02 et EB-03 restent absents** des fichiers fournis.
- Correction du lecteur : les dossiers imbriqués sont reconnus ; aucune extension artificielle `nouvelle` créée.
- Sources originales non modifiées ; données des joueurs et production non touchées.

Validation structurelle **PASS**, TypeScript **PASS**, tests unitaires **51/51 PASS** après fusion. Preuves : `new-files-sync.log`, `validate.log`, `typescript.log`, `unit.log`, `new-files-inventory.json`. Le test complet sur base isolée et la conversion Card sont consignés dans `new-files-full-import.log`. Les anciens chiffres et tests ci-dessous décrivent le bilan avant ces nouveaux fichiers ; le build précédent ne valide pas à lui seul le nouveau jeu de données.

Test du maître enrichi sur PostgreSQL isolé : **2/2 PASS** (`new-files-full-import.log`). Les 4 179 variantes ont été importées deux fois dans le stockage de préparation ; les tables actives et celles des joueurs sont inchangées. Les 3 786 propositions Card ont été insérées avec Prisma puis annulées. Aucun import dans les tables actives de l’application.

## Bilan initial avant réception des nouveaux fichiers

## Résultat concret

Le maître local contient **1 938 numéros distincts et 3 138 variantes**, provenant de 19 800 observations dans 54 fichiers, dont un snapshot local de 3 033 cartes et 46 groupes CardSet. Aucune production consultée ou modifiée.

**2 835 variantes, correspondant à 1 839 numéros distincts, sont convertibles au modèle Card actuel avec des textes français disponibles.** Toutes incluent au moins un champ provisoire (notamment les libellés du glossaire), conservé avec son statut dans le maître. Ce chiffre signifie compatibilité de données, pas disponibilité déjà intégrée dans l’application ni autorisation de publication des illustrations.

| Élément | Résultat |
|---|---:|
| Produits historiques à code numéroté | 43 |
| Groupes supplémentaires / alias historiques à examiner | 18 |
| Numéros distincts | 1 938 |
| Variantes | 3 138 |
| Variantes supplémentaires au-delà des numéros | 1 200 |
| Variantes présentes dans plusieurs groupes | 480 |
| Associations variante-extension conservées | 3 772 |
| Variantes dont les champs textuels présents disposent de français | 2 989 |
| Variantes convertibles sans conflit numérique identifié | 2 835 |
| Variantes bloquées | 303 |
| Variantes avec français incomplet | 149 |
| Variantes présentant des conflits numériques bloquants | 156 |

Les motifs se recoupent : ne pas additionner leurs nombres. Aucun identifiant ancien ambigu détecté dans les références consolidées. Les quatre observations sans identité exploitable sont conservées en quarantaine.

## Extensions demandées supplémentaires

**OP-13, OP-14, OP-15, OP-16, OP-17, PRB-02, EB-03, ST-29, ST-30, ST-31, ST-32, ST-33, ST-34, ST-35, ST-36** : aucune variante trouvée dans le maître ou les archives locales examinées. Ces **15 extensions demandées sont manquantes localement**. Leur nombre attendu de cartes et leurs variantes restent inconnus : aucun chiffre inventé.

Collecte **BLOCKED** jusqu’à identification d’un export/API autorisé ou d’une autorisation réellement obtenue pour les contenus officiels. La restriction de reproduction figure sur le [catalogue officiel français](https://fr.onepiece-cardgame.com/cardlist/). Aucun téléchargement de ces produits exécuté. Le drapeau technique `--authorized-source` ne constitue pas une autorisation du titulaire des droits.

Le périmètre complet des autres extensions manquantes reste **NOT_TESTED**, faute de manifeste exhaustif autorisé. ST-22 est un trou de séquence historique, pas une preuve suffisante de contenu manquant.

## Français et illustrations

Les statuts portent sur des **champs**, pas sur des cartes : 7 809 champs de provenance officielle FR archivée, 0 validés humainement, 10 709 provisoires/glossaire, 6 210 à vérifier. Une provenance officielle n’accorde pas un droit de redistribution.

Il reste **308 champs sans français** : 137 effets, 142 capacités, 11 déclencheurs et 18 noms de groupes historiques. Effet et capacité peuvent reproduire le même texte : ce ne sont pas 290 règles distinctes. Les originaux restent conservés. Les réutilisations FR et le glossaire sont appliqués sans transformer une traduction provisoire en officielle. Les règles ambiguës n’ont pas été inventées ou remplacées silencieusement.

Toutes les variantes ont une référence d’image distante. **3 138 variantes n’ont pas de fichier d’illustration local relié vérifiable** ; cela ne signifie pas que 3 138 URLs sont cassées. Disponibilité distante **NOT_TESTED**, aucune nouvelle collecte. 63 fichiers image locaux examinés et 590 risques historiques de collision de noms signalés. Les anciennes images sont conservées.

## Fichiers et compatibilité Prisma

- `cardgame/data/onepiece/catalog/master-catalog.json` : maître, généré depuis les fichiers par extension, variantes et réimpressions conservées.
- `cardgame/data/onepiece/reports/readiness.json` : liste exacte des fiches bloquées et motifs.
- `cardgame/data/onepiece/reports/prisma-cards.json` : 2 835 propositions au format Card Prisma, identifiants existants préservés, appartenances multiples conservées séparément.
- `cardgame/data/onepiece/translations/` : mémoire, glossaire, textes manquants et à vérifier.
- `docs/catalog/evidence/catalog-summary.json` : chiffres et codes détaillés.
- `docs/catalog/schema-proposal.prisma` et `cardgame/scripts/catalog/schema.sql` : proposition additive de stockage du catalogue, testée uniquement en base isolée.

Le modèle Card actuel n’exprime qu’un setCode. L’export préserve celui des cartes existantes et n’affecte pas arbitrairement un produit aux nouvelles cartes. Les appartenances multiples sont portées par le catalogue séparé. Les codes internes de type/couleur restent ceux attendus par les validations existantes ; les libellés français sont dans le maître. Aucun changement du schéma Prisma actif ni des règles de boosters.

La proposition de tables Catalog est un stockage de préparation : l’application ne le lit pas encore. L’import testé du maître ne met pas à jour les tables actives Card, collections, decks ou ouvertures.

## Tests effectivement exécutés

| Vérification | État | Preuve dans `evidence/` |
|---|---|---|
| Tests unitaires application et catalogue : 51/51 | PASS | unit.log |
| Intégration isolée : 6/6, reprises, concurrence, rollback, références joueurs | PASS | integration.log |
| Maître importé deux fois en stockage Catalog isolé, tables actives inchangées | PASS | full-import.log, full-import.json |
| Export FR inséré avec Prisma Card puis annulé : 2 835 lignes | PASS | full-import.log, deuxième test |
| Validation structurelle du maître | PASS | validate.log |
| TypeScript | PASS | typescript.log |
| ESLint scripts et tests catalogue | PASS | catalog-eslint.log |
| ESLint application | PASS avec 99 avertissements existants | eslint.log |
| Compilation production locale | PASS | build.log |
| Extraction Playwright sur DOM synthétique : 5 contrôles | PASS | playwright-fixture.json |
| CLI sur fixtures : 6 contrôles, export partiel et dry-run | PASS | cli-fixture.json |
| Collecte réelle des 15 nouvelles extensions | BLOCKED | requested-extensions.json |
| Affichage du nouveau maître dans l’application | NOT_TESTED | Aucun branchement aux tables actives |
| Exhaustivité mondiale et fonctionnement des images distantes | NOT_TESTED | Aucune collecte autorisée exécutée |

Le test d’export neutralise les relations setCode dans la base synthétique qui ne contient pas les produits réels ; les relations du vrai export restent à prévisualiser avant intégration. Les hashes des tables protégées sont identiques avant/après l’import complet. Aucun reset de base exécuté.

## Étapes nécessaires pour intégrer

1. Fournir une source autorisée pour les 15 produits demandés ; fusionner les exports sans remplacer le maître par un export partiel.
2. Traduire les 149 variantes incomplètes et arbitrer les 156 variantes aux valeurs numériques contradictoires à partir de sources fiables.
3. Examiner les 18 alias et 59 différences de rareté entre éditions, ainsi que les droits d’utilisation des images.
4. Valider le mapping des identifiants et produits, puis brancher la lecture du catalogue / des appartenances sur l’application en local. Conserver les IDs Card existants.
5. Rejouer collections, decks et ouvertures sur une copie de test avant toute proposition d’import des tables actives.
6. Toute migration ou import de production reste soumis à une validation distincte. Rien n’a été poussé ou déployé.

Commandes locales sans collecte et sans import :

```bash
cd cardgame
npm run catalog:sync
npm run catalog:translate
npm run catalog:validate
npm run catalog:ready
```

`catalog:import:dry-run` effectue des lectures sur PostgreSQL local uniquement. Les exports générés et le snapshot restent exclus de Git ; les sources historiques originales ne sont pas supprimées.
