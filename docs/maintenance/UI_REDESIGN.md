# Refonte premium de l’interface One Piece TCG

## Résultat et référence

Branche : `feature/premium-collector-ui`, créée depuis `feature/boosters-complete` (abd265e), afin de conserver la remise en état et le système transactionnel de boosters. Aucun push, fusion ou déploiement. Les `.DS_Store` préexistants et l’image fournie sont conservés.

La référence principale est maintenant **`cardgame/public/images/maquette OP.png`**, fournie pendant le travail et réellement examinée. La structure reprise comprend : barre latérale, navigation bleue, surfaces marine presque noire, contours bleus, boutons jaunes dorés, bannière illustrée, quatre statistiques, bande de cartes récentes, progression des extensions, sélection de boosters en carrousel, classeur avec filtres latéraux, fiche détaillée, quantités de deck et historique.

La bannière utilise l’illustration déjà présente `banniere.png`. La tentative de création d’une nouvelle illustration via le skill imagegen a été refusée par le service et n’a produit aucun fichier. Ce n’est donc pas une reproduction pixel par pixel de l’illustration de la maquette. Les valeurs, dates, comptes et cartes de la maquette ne sont jamais copiés comme données réelles. Les niveaux, événements, échanges et succès non implémentés ne sont pas présentés comme disponibles.

## Phase A : audit et plan appliqué

Rapports `docs/maintenance/` et `docs/boosters/` lus. Aucun AGENTS.md trouvé. Inspection : layouts globaux et privés, Navbar, accueil statique, collection, deck builder, decks, cartes/modales, boosters, APIs cards/sets/collection/decks/favoris/historique, configuration des images, schéma Prisma et validation des decks.

Constats : marges et fonds imbriqués ; animation globale des grilles ; absence de statistiques personnelles sur l’accueil ; historique limité à la page d’ouverture ; validation client du deck différente de la validation serveur. Le catalogue `/api/cards` était conservé 24 heures en mémoire, masquant les cartes fraîchement importées.

Plan réalisé : B système visuel et navigation ; C pages réutilisant les APIs ; D démonstration isolée puis moteur CSS 3D connecté après confirmation transactionnelle ; E tests unitaires, PostgreSQL isolée, Chrome desktop/tablette/mobile et build de production.

Réutilisation : NextAuth, Prisma, APIs privées, service de tirage et d’idempotence, BoosterArtwork et Next Image, normalizeCardColors, validateDeck, Radix Dialog et useAudio. **Aucune dépendance ajoutée ou mise à jour ; aucun changement du schéma ou migration Prisma ; aucun module de combat ou multijoueur modifié.**

## Architecture et fonctionnalités

- `collector.css` : variables centralisées, composants visuels, responsive, focus, erreurs, états vides et chargement. Les anciennes animations génériques sont limitées à leur classe dédiée.
- `Navbar` : navigation latérale desktop, recherche globale par nom/identifiant, menu mobile avec fermeture sur navigation et Escape, profil et identité existante Mugiwara.
- `components/collector` : primitives, cartes, détail Radix, galerie d’extension, classeur partagé et préférences locales par utilisateur.
- `lib/collector` : calcul des exemplaires et uniques, progression par extension/variantes, effets visuels selon les métadonnées réelles, contrôles d’ajout au deck et statistiques.
- `/api/collector` : statistiques privées obtenues dans une transaction de lecture RepeatableRead ; identité de session uniquement ; réponses private/no-store ; aucune attribution de cartes.
- `/home` : vrai total d’exemplaires, uniques, progression, decks personnels, ouvertures enregistrées, extensions disponibles et cartes rares. Les decks templates sans propriétaire ne sont pas comptés comme decks personnels.
- `/boosters` et `/boosters/[code]` : carrousel, galerie, détails, cartes, raretés, progression et disponibilité fournie par le serveur. Les extensions vides ou incomplètes restent explicites.
- `/collection` : filtres extension/rareté/couleur/type, recherche globale, tris, favoris, cartes possédées/manquantes, variantes, grille/liste, pagination de 36 cartes, quantités et détails.
- `/deck-builder` : recherche dans la collection, leader, couleurs et quantités, favoris, 50 cartes hors leader, quatre exemplaires par numéro de base, sauvegarde/création/modification ; statistiques de coût, type et couleur. `/decks` conserve activation, modification et suppression avec confirmation.
- `/history` : historique privé paginé, vignettes, détail de résultat enregistré et nouvelles cartes/doublons ; exclusivement GET pour la consultation.
- `/profile` : compte réel, statistiques, préférences locales d’animation, effets et densité, commande sonore existante et déconnexion.

### Cinématique universelle

`CinematicOpening` utilise le visuel du booster choisi, CSS 3D, lumière bleue/dorée, reflet, séparation du sommet, particules et éventail de dos de cartes. Durée indicative 3,4 secondes. La révélation progressive utilise les véritables résultats ; effets configurables commune/rare/super/secret/holographique à partir de rarity et des flags isAltArt/isParallel/isSpecial.

Aucun WebGL ou téléchargement vidéo. Nettoyage des timers et listeners. « Passer l’animation », « Tout révéler », préférence utilisateur et prefers-reduced-motion. L’animation ne fait aucune requête d’attribution : elle commence après génération, transaction et reçu côté serveur. Une sécurité de durée permet de sortir de l’animation en cas d’interruption. SessionStorage conserve l’intention et la progression ; une ouverture terminée n’empêche plus la sélection d’une nouvelle extension depuis la galerie.

`/opening-demo` est une démonstration isolée avec métadonnées de test clairement identifiées et illustrations existantes. Aucune écriture de collection ou tirage réel.

## Validation réellement exécutée

Les mutations automatisées utilisent **uniquement** PostgreSQL 16 isolé `127.0.0.1:55432/op_boosters_test`. Les suites vérifient cette destination avant de créer les fixtures. Aucun reset. Aucun test d’ouverture n’a été exécuté sur la base habituelle pour cette refonte.

| Contrôle / fonctionnalité | Résultat | Preuve |
|---|---|---|
| Audit et plan | PASS | Inventaire et architecture ci-dessus |
| TypeScript | PASS | `evidence/ui/typescript.log`, sortie 0 |
| ESLint | PASS | `evidence/ui/eslint.log`, 0 erreur, 99 warnings hérités |
| Build de production Next 15.5.27 | PASS | `evidence/ui/build.log`, sortie 0 |
| Tests unitaires | PASS | 28/28, `evidence/ui/unit.log` |
| Transactions PostgreSQL boosters | PASS | 11/11, `evidence/ui/integration.log` |
| Régression API et navigateur boosters | PASS | 15/15, `evidence/ui/boosters-regression-results.json` |
| Nouvelle recette UI dans le build compilé | PASS | 21/21, `evidence/ui/functional-results.json` |
| Identité, session persistante, pages privées, déconnexion | PASS | Recette UI ; login credentials sur fixtures |
| Statistiques réelles / données privées | PASS | Vue d’ensemble comparée aux agrégats ; tentative userId étranger ignorée |
| Recherche, filtres, favoris et persistance | PASS | Recette UI ; catalogue fraîchement importé visible |
| Cartes manquantes et fiche immersive | PASS | Recette UI ; Radix/Escape et variantes |
| Carrousel et extension vide | PASS | Recette UI ; bouton absent pour OP-EMPTY |
| Deck complet, sauvegarde, modification et activation | PASS | Réponse PUT 200, 2 versions, cookie d’activation, isolation utilisateur |
| Suppression de deck | PASS | Annulation puis confirmation ; collection inchangée |
| Double clic et rejouement concurrent | PASS | Un reçu, un crédit ; tests PostgreSQL et HTTP |
| Réponse perdue après commit / retry | PASS | Même idempotencyKey, crédit conservé une fois |
| Refresh pendant l’animation | PASS | Un seul POST et un reçu ; progression reprise |
| Sélection d’une autre extension après ouverture terminée | PASS | Nouvelle extension sélectionnée, aucun crédit supplémentaire |
| Historique privé / consultation sans récompense | PASS | GET uniquement, quantités inchangées, propriétaire étranger 404 |
| Desktop 1440, tablette 820 et mobile 390 px | PASS | Navigation et 6 pages, absence de débordement, scroll ; captures |
| Scroll tactile des cartes | PASS | Régression Chrome/CDP mobile |
| Animations réduites, skip, tout révéler | PASS | Recettes UI et démonstration |
| Erreur réseau et retry | PASS | Simulation 503 puis récupération |
| Erreurs JavaScript | PASS | Aucune sur les parcours testés |
| Démonstration avec mouvement normal | PASS | `evidence/ui/demo-validation.json`, aucun POST API |
| Base habituelle / images après redémarrage | PASS | `evidence/ui/original-database-check.json`, lecture seule |
| Comparaison visuelle pixel par pixel | NOT_TESTED | Structure examinée, illustration différente |
| OAuth Google complet après refonte | NOT_TESTED | Configuration conservée ; fixtures credentials uniquement |
| Safari/iOS/Android physiques | NOT_TESTED | Chrome et viewports simulés uniquement |
| Audit accessibilité exhaustif / lecteurs d’écran | NOT_TESTED | Contrôles clavier et labels testés, pas de certification |
| Validation complète banlist et règles spéciales | BLOCKED | Contrôles absents dans l’architecture actuelle |

### Premiers échecs et corrections de recette

Le premier run UI a détecté des attentes trop précoces sur les transitions Radix, des labels de select manquants et des illustrations avec noms identiques. Les labels accessibles et alt incluant le code ont été corrigés ; les tests attendent la fin de transition et vérifient le cookie réel d’activation. Une URL relative de test hors contexte baseURL a également été corrigée.

Un ancien processus Next.js utilisant le même dossier .next a entraîné des réponses HTML et un cache de développement incohérent. Les processus ont été arrêtés et les dossiers de compilation déplacés dans /private/tmp, sans suppression de fichiers utilisateur. La recette finale s’est déroulée dans le build de production local.

La modification de deck a initialement expiré sur waitForURL attendant tous les téléchargements. Le PUT était bien 200. Le test attend désormais domcontentloaded puis les éléments et réponses pertinents ; il vérifie les versions persistées et l’activation. **Résultat final : 21 PASS, 0 FAIL.** Ne pas confondre ces premiers échecs avec la recette finale.

## Base habituelle et lancement local

L’application a été relancée dans le Terminal séparé, port **3000**, avec le fichier .env original et sans override de la base de test. Le contrôle de lecture seule retrouve 3 utilisateurs, 3033 cartes, 46 extensions, 5 ouvertures et 105 decks au total. Les comptes et agrégats restent identiques avant/après ; aucun POST API. Les statistiques personnelles correspondent aux données. Les 36 images de cartes testées sont chargées, aucune cassée, aucune erreur JavaScript.

Captures : `actual-dashboard-desktop.png`, `actual-collection-desktop.png`, `actual-collection-mobile.png` montrent la base réelle en lecture seule. Les autres captures montrent des fixtures de test ; leurs nombres ne sont pas des statistiques de l’utilisateur.

```bash
cd /Users/quentin/Documents/GitHub/projetOP/cardgame
npm run dev -- --port 3000
```

Accueil : http://localhost:3000/home ; boosters : /boosters ; ouverture : /booster-opening ; classeur : /collection ; decks : /decks ; historique : /history ; profil : /profile ; démonstration : http://localhost:3000/opening-demo.

Pour installer sur un autre poste avec les variables requises déjà configurées : npm ci puis npm run dev. Le fichier .env, ses secrets et ses valeurs ne sont pas inclus dans les preuves.

## Commandes de validation

Exécutées depuis cardgame :

```bash
npm test
npm run typecheck
npm run lint
npm run test:boosters:integration
npm run build
npm run start -- --port 3007
npm run test:boosters:browser
node tests/ui.browser.mjs
```

Les trois commandes de tests intégration/navigateur/UI reçoivent explicitement le DATABASE_URL isolé. Le serveur local 3007 et le build utilisent également cette base, un secret de test et une URL locale de test ; CAPTCHA_PROVIDER est vide uniquement dans ce processus. Ne jamais copier ces overrides dans le .env habituel. Le test UI nécessite Chrome installé dans /Applications/Google Chrome.app. Ne pas lancer deux serveurs utilisant simultanément le même dossier .next, ni un build pendant un serveur dev actif.

Git diff --check passe. La liste des fichiers créés/modifiés est dans `evidence/ui/changed-files.txt`. Le rapport et les preuves sont versionnés avec les changements de code ; les captures originales et .DS_Store du propriétaire ne sont pas ajoutées aux commits.

## Limites et prochaine phase

- Banlist, règles spéciales et contrôle serveur de propriété des decks restent incomplets ; l’interface l’indique. Les restrictions de propriété de l’interface sont conservées, mais ne constituent pas une garantie serveur.
- Les « dernières cartes obtenues » utilisent UserCard.createdAt : date de première entrée en collection, pas date d’ajout du dernier exemplaire. Les reçus d’ouverture fournissent les véritables dates et nouveaux/doublons lors du tirage.
- Préférences d’affichage conservées dans ce navigateur, par utilisateur. Le son conserve la préférence navigateur du service existant ; aucune synchronisation compte ajoutée.
- Les extensions non documentées conservent les règles du service existant et l’image configurée ou de remplacement. Les intitulés/catalogues proviennent de la base ; les assets manquants demandent un enrichissement des données.
- Le catalogue entier est encore téléchargé pour les filtres client, mais seulement 36 cartes sont rendues par page (12 dans le builder). Une pagination/filtration serveur pourrait être envisagée si le catalogue croît fortement.
- Dépendances inchangées : l’ancien audit final conserve 12 alertes élevées (chaînes Auth/Nodemailer, ESLint et Prisma). Pas de nouvel audit npm dans cette phase ; ne pas annoncer une sécurité globale sans réserves.
- La cinématique CSS est légère ; l’illustration de bannière et les effets ne reproduisent pas chaque détail peint de la maquette. Retouches artistiques et validation utilisateur restent utiles.
- Tests réels Safari/mobile, accessibilité complète, OAuth et performance à charge restent à réaliser. Combat, matchmaking, IA, paiement et échanges restent hors périmètre.
