# Simulateur One Piece TCG — audit et conception

Date : 10 octobre 2026. Statut : conception, aucune conformité de jeu certifiée.

Avancement ultérieur : [M0 — rapport et preuves](M0_REPORT.md), [matrice de couverture](M0_COVERAGE.md). Les constats d'audit ci-dessous décrivent l'état initial ; les corrections de Vie sont séparées du maître et de Prisma.

11/10/2026 : [M1 — noyau de préparation](M1_REPORT.md) implémenté séparément de `/game`. La préparation s'arrête à l'entrée de Recharge ; la boucle des premiers tours reste à développer.

11/10/2026, suite : [M1.5 — boucle de phases et actions de base](M1_5_REPORT.md). Le même noyau supporte `BASIC_TURNS`, sans combat ni capacités. Le périmètre M1 `SETUP_ONLY` reste disponible.

## Périmètre et références

Le document demandé existe dans `cardgame/docs/ONE_PIECE_TCG_RULES.md`, et non initialement dans `docs/`. Il a été lu intégralement ; ses prescriptions sont conservées. Le catalogue, le scraper, les types, services de jeu, routes d'attaque/effets, validations des decks, persistance et PWA ont été examinés. Aucun scraper, moteur, interface ou schéma actif modifié. Aucune base consultée ou modifiée.

Sources vérifiées en ligne : [index officiel FR](https://fr.onepiece-cardgame.com/rules/), [règles complètes FR v1.2.1, 28/08/2026](https://fr.onepiece-cardgame.com/pdf/rule_comprehensive.pdf?20260828=), [règles EN v1.2.1](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [FAQ FR par extension](https://fr.onepiece-cardgame.com/rules/faq/), [restrictions datées](https://en.onepiece-cardgame.com/news/restriction.html). La première tentative du PDF FR sans paramètre a échoué ; le lien issu de l'index FR fonctionne. Ne pas redistribuer les PDF ou les illustrations dans le dépôt.

Constats normatifs vérifiés :

| Sujet | Référence | Conséquence de conception |
|---|---|---|
| Vie vide | 1-2, 9-2 | Zéro Vie seul n'est pas une défaite ; il faut des dégâts supplémentaires |
| Deck vide | 1-2, 9-2 | Vérification aux points de traitement des règles |
| Mise en place | 5-2 | Mulligan complet unique ; Vie dépendant du Leader |
| Premiers tours | 6-3, 6-4, 6-5-6 | Exceptions pioche/DON pour premier joueur ; pas de combat au premier tour de chacun |
| Combat | 7-1 | Étapes attaque, blocage, contre, dégâts ; égalité favorable à l'attaquant |
| DON attachés | 6-5-5 | Bonus pendant le tour de leur contrôleur |
| Effets | 8, notamment 8-6 | Ordonnancement dédié, pas une pile LIFO universelle |
| Mots-clés | 10 | Inclure Initiative : Personnage et Imblocable |

Cette table est une synthèse limitée, pas une spécification exhaustive. Les cas complexes doivent conserver leurs références précises et des scénarios vérifiés avant implémentation. L'annonce du 24 septembre 2026 comporte une modification applicable le 12 octobre : ne pas appliquer automatiquement une restriction future au ruleset du 10 octobre. Les FAQ individuelles n'ont pas toutes été lues.

## Audit des données

Mesure directe du fichier maître actuel, avec SHA-256 : `DATA_AUDIT.json`.

- 2 667 numéros, 4 179 variantes, 74 groupes ; 485 variantes multigroupes.
- Aucune clé de variante dupliquée ; cela ne prouve pas l'absence de conflits sémantiques.
- Coût présent sur 4 086 variantes, puissance sur 3 376, Counter sur 2 408.
- 284 variantes de Leader : **aucune Vie renseignée**. Aucun numéro de bloc renseigné sur les 4 179 variantes.
- 3 664 variantes avec un effet français non vide. L'absence de texte peut être légitime ; ce chiffre n'est pas une mesure de conformité des effets.
- Parmi les effets dont l'original existe : 2 186 étiquetés official, 1 553 review_required, 58 machine. Ce sont les statuts stockés, non une certification indépendante.

`scripts/scrape-onepiece-fr.js` délègue à `scripts/catalog/sync-cli.ts`. Playwright dans `scraper.ts` extrait déjà `life`, `block`, textes FR/EN, traits, attributs, Counter, images et contexte produit. `core.ts` sait conserver life/block : les lacunes observées portent sur les données historiques, pas une preuve de panne du sélecteur actuel. Aucune collecte nouvelle nécessaire à cet audit. Les anciens exports et traductions ne constituent pas un programme exécutable.

`Card` Prisma ne possède pas life/block, utilise des chaînes pour couleurs/Counter/traits et un setCode unique. Les relations utilisateurs s'appuient sur Card.id : conserver ces IDs. Ne pas exploiter une variante d'illustration comme une nouvelle règle de jeu. La rareté et les probabilités des boosters ne pilotent pas le moteur.

### Données indispensables avant M0

| Donnée | Adaptation prévue | Gestion d'un manque |
|---|---|---|
| Numéro canonique et nom de règles | Distinguer identité réglementaire, impression et alias de nom | Conflit explicite, aucune fusion arbitraire |
| Catégorie, couleurs, attributs, traits | Codes internes et tableaux ; libellés FR séparés | Refus d'admission de la définition ambiguë |
| Vie du Leader | Entier issu d'une source vérifiée | Pas de valeur 5 par défaut ; deck non admis |
| Coût, puissance, Counter | Valeurs typées selon catégorie, préserver null distinct de 0 | Pas de conversion silencieuse |
| Texte, déclenchement, errata | Texte original et version effective | Révision requise si contradiction |
| Numéro de bloc, format, restrictions et dates | Données du ruleset, indépendantes de l'illustration | Format compétitif indisponible si incomplet |
| Effets structurés | Registre par numéro + révision | Carte signalée non prise en charge |

## Audit du moteur existant

| Fichier/module | Constat concret | Traitement prévu |
|---|---|---|
| `src/types/game.ts` | Player/PlayerState divergent ; Vie compteur vs cartes ; couleur unique ; fonctions execute dans effets et pile | Définir un seul état sérialisable sans importer React/Prisma |
| `src/hooks/useGame.ts` | INITIAL_LIFE_POINTS=5 ; mélange par sort(Math.random) ; transitions locales | Conserver l'interface actuelle ; ne pas réutiliser ses transitions comme autorité |
| `src/components/game/GameBoard.tsx` | Détection des mots-clés par includes de texte anglais | Remplacer via adaptateur de définitions validées au futur raccordement |
| `src/lib/game/combatService.ts` | canAttack limité à présence/actif/hasAttacked ; executeAttack résout directement | Extraire les fenêtres de décision et légalités |
| `src/app/api/game/attack/route.ts` | Requiert phase BATTLE ; déclare victoire dès lifePoints<=0 ; accepte playerId client ; retourne état complet ; sauvegarde même utilisateur dans les deux places | Ne pas exposer ce parcours comme multijoueur officiel ; auditer acteurs/projections/concurrence avant raccordement |
| `cardEffectsService.ts` | Combinaisons de démonstration card-1/card-2 ; expiration des buffs incomplète | Ne pas intégrer ces bonus à un ruleset officiel |
| `gameSimulationService.ts` | Stratégies scriptées ; commentaire Counter sans coût DON | Démonstration distincte ; pas référence de règles |
| `counterService.ts` | Date.now/Math.random et fonctions dans pile | Identités stables et hasard injecté |
| `gamePersistenceService.ts` | Snapshots JSON, Vie numérique ; pas de révision de commande observée dans save | Adaptateur futur avec projection et contrôle de version |
| `src/lib/deckValidation.ts` | Leader, couleurs, 50 cartes, quatre copies déjà contrôlés ; restrictions datées/effets construction absents | Réutiliser la normalisation, compléter la validation selon format |
| Réseau | socket.io-client présent ; aucun serveur WebSocket trouvé dans le code inspecté | Préparer un contrat, pas annoncer du multijoueur opérationnel |
| PWA | Manifest standalone/orientation any ; cache public strict dans sw.js | Conserver ; ne pas cacher les états privés de partie |

Constats statiques, pas des tests de parties exécutés. Ne pas supprimer brutalement ces modules : isoler progressivement leurs usages derrière un adaptateur. Le moteur conforme à construire ne doit pas contaminer les collections, decks sauvegardés ou tirages.

## Architecture proposée, dans la même application

Reprendre l'arborescence `src/game/` prévue dans le cahier des charges. Pas de second projet frontend, pas de framework supplémentaire au stade de conception.

```text
src/game/
  core/       état, instances, zones, invariants, hasard injecté
  cards/      adaptateur catalogue → définitions admises, registre par numéro
  rulesets/   version règles/errata/FAQ/format/restrictions à date
  actions/    validation des commandes et choix
  phases/     progression du tour et points de traitement
  combat/     sous-étapes et décisions de défense
  effects/    opérations typées, conditions, durées, remplacements
  tests/      scénarios référencés, propriétés, relecture
src/lib/game/ adaptateurs historiques, application serveur et persistance
```

Noyau TypeScript pur : ni DOM, ni React, ni navigateur, ni Prisma, ni WebSocket. Les textes et images ne sont pas chargés à chaque transition. Une définition immuable est liée à un numéro/révision ; l'instance porte instanceId, definitionId, propriétaire, contrôleur, zone, état, attachements et génération de zone. Les modificateurs sont séparés des valeurs imprimées ; leurs durées ont des bornes explicites. Main, Vie et decks sont des zones ordonnées ; la Vie ne se réduit jamais à un entier.

État : schemaVersion, rulesetId, révision des définitions, version monotone, joueurs, joueur actif, tour global et tours par joueur, phase, sous-étape, combat éventuel, choix en attente, résolutions en attente, résultat et état du générateur aléatoire. Les objets temporaires autorisés par les effets disposent de leur propre état ; ne pas forcer tout objet dans une zone à chaque instant.

```ts
// Contrats proposés, non implémentés.
applyCommand(state, command, definitions, ruleset): Accepted | Rejected
getLegalActions(state, actorId, definitions, ruleset): ActionDescriptor[]
projectState(state, viewerId): PlayerView
```

ActionDescriptor fournit type, label, paramètres/cibles permis et raison de refus ; il ne matérialise pas toutes les combinaisons d'une main. Le client transmet une intention. Le serveur déduit l'acteur de la session, valide la commande sur l'état courant puis produit le nouvel état et les événements. Aucun état complet ni définition d'effet fournis par le client ne sont acceptés.

### Effets propres aux cartes

Registre `numéro → révision → EffectDefinition[]`, sans identifiants d'illustration. Métadonnées : timing, conditions, coût d'activation typé, caractère optionnel, sélecteurs, choix, opérations ordonnées, durée, limite d'usage, références FAQ/errata et statut de couverture.

Commencer avec quelques opérations réutilisables : déplacement, pioche, épuisement/redressement, DON, modification de puissance/coût, KO, restriction d'action et recherche avec choix. Les coûts ne sont pas limités au DON ; prévoir repos, défausse et retour DON. Les branches « si/puis », destinations et choix sont explicites et testés. Les effets nécessitant une opération spéciale restent de petites fonctions du registre côté code, jamais du texte exécuté, avec contexte déterministe et tests dédiés.

Une résolution suspendue conserve une continuation sérialisable et un ChoiceRequest (id, acteur, options autorisées, minimum/maximum, visibilité). Les limites d'utilisation portent sur la bonne instance et portée. Lors d'un changement de zone, vérifier la durée/identité applicable à partir des règles. Le résolveur traite les points réglementaires et effets simultanés avec ordonnancement vérifié ; il n'utilise pas par défaut une pile de type Magic.

Chaque carte admise doit avoir un test positif, un test de coût/condition impossible, un test de choix/cible invalide, ses interactions et ses cas FAQ. Même une carte sans effet doit être admise explicitement avec caractéristiques vérifiées. Carte inconnue ou effet non couvert : refus de lancement en mode automatisé, pas un effet silencieusement ignoré. Un éventuel mode manuel futur devra être clairement séparé de la conformité automatique.

### Serveur, persistance et WebSocket

Enveloppe de commande : gameId, commandId, expectedVersion, type et paramètres validés ; acteur établi par session. Déduplication `(gameId, actorId, commandId)`, hash du contenu (même clé/autre contenu = conflit), transaction et verrou ou compare-and-swap sur version. Deux commandes concurrentes ne peuvent pas appliquer le même état obsolète. Snapshot versionné + journal ordonné, définition/ruleset figés pour la partie ; migration additive future séparée de cet audit. Hasard initialisé côté serveur et rejouable ; ne jamais exposer la graine ou l'ordre des decks aux clients.

Projection par joueur : cartes publiques, compteurs de zones adverses, sa propre main et seules informations révélées permises. Logs, erreurs et messages WebSocket doivent eux aussi être projetés. Reconnexion par dernière version reçue avec rattrapage filtré ou snapshot filtré. Heartbeat, authentification, contrôle de participation, limitations de requêtes et accusés de réception. Perte de connexion n'autorise pas une action hors tour ni une défaite inventée : politique de délai/abandon à spécifier. HTTP et WebSocket appellent le même service. Prévoir un serveur persistant adapté pour WebSocket ; ne pas supposer qu'une fonction Next.js éphémère suffit. Aucun nouveau serveur déployé ici.

## Compatibilité mobile : exigences d'architecture

Une seule base Next.js/React/TypeScript pour Windows/macOS/Linux navigateur, Android/iPhone et tablettes Android/iPad. Le moteur et les API sont identiques sur tous les appareils. L'orientation modifie la présentation, jamais les règles.

Menus en portrait ; plateau optimisé paysage sans verrouillage obligatoire (notamment iOS). Portrait utilisable avec zones compactes et inspection de carte, invitation facultative à pivoter. Safe areas et hauteur dynamique ; plateau dimensionné par espace disponible sans déformation des cartes. Tactile via Pointer Events, souris et clavier ; sélection puis action/choix avec boutons explicites. Drag-and-drop facultatif seulement. Actions essentielles atteignables avec cibles de 44 px, focus visible et alternatives aux gestes.

Inspection agrandie/zoom et texte lisible sans déplacer les cartes du jeu. Afficher uniquement les cartes publiques/autorisées dans l'inspection. Animations cosmétiques, interrompables, avec prefers-reduced-motion ; aucun effet de jeu dépendant d'une animation. État autoritaire/reconnexion survivent à la mise en arrière-plan mobile.

Budget proposé à mesurer : interactions locales visibles <100 ms et animation proche de 60 fps sur smartphone de milieu de gamme, bundle/usage mémoire suivis sans seuil fictivement validé. Réduire les mises à jour React à la projection modifiée ; optimiser/précharger seulement les illustrations visibles. Aucun WebGL obligatoire. PWA installable sur navigateurs compatibles, cache des assets publics ; jeu en ligne indisponible hors connexion avec reprise explicite. Ne pas promettre de publication sur les stores.

## Feuille de route et portes de validation

| Étape | Livrable | Tests requis avant étape suivante |
|---|---|---|
| M0 Données | Adaptateur, quelques définitions complètes, ruleset daté ; récupérer Vie autorisée sans changer inutilement scraper | Alias/variantes, multicolore, null/0, Vie manquante refusée, errata, copies entre illustrations, restrictions actives/futures/paires |
| M1 Noyau | Instances et zones, mise en place, tours sans interface | Conservation des instances, sérialisation, mulligan unique/ordre, Vie du Leader, deux premiers tours, DON restant, même graine mêmes événements |
| M2 Combat | Ressources, fenêtres et victoire | Paiements, cibles, cartes jouées/Rush, blocage, counters payants, égalité, buffs expirés, dernière Vie vs dégâts à Vie vide, deck vide, double défaite |
| M3 Effets | Choix, modificateurs, remplacements, déclenchements | Simultanéité, condition devenue invalide, paiements optionnels, zéro cible, once-per-turn, KO vs défausse, Trigger/Banish/Double Attack et nouveaux mots-clés |
| M4 Première partie sans UI | Deux decks constitués exclusivement de définitions couvertes | Partie entièrement scriptée, relecture JSON, invariants après chaque événement, scénarios FAQ par carte ; couverture publiée |
| M5 Service autoritaire | Persistance et protocole HTTP/WebSocket | Auth/acteurs, données cachées, requêtes concurrentes, rejeu/conflict, rollback, reconnexion, reprise après arrière-plan |
| M6 Présentation future | Plateau responsive unique et PWA | Parcours tactile/souris/clavier, zoom, portrait/paysage, safe areas, performance réelle, cache et versions |

Tests unitaires Node/TypeScript avec les outils existants ; tests d'invariants et générateur déterministe sans ajouter une dépendance par principe. Intégration PostgreSQL exclusivement isolée ; doubles commandes/échec transaction. Playwright Chromium, Firefox et WebKit pour future UI, complétés par Safari iPhone/Android réels si disponibles. Matrice : 360×800, 375×667, 390×844, 430×932 et paysage inversé ; 768×1024/iPad paysage ; 1280×800 et 1440×900. Émulation WebKit ne vaut pas validation sur iPhone réel.

Première cible : un petit ensemble explicite de cartes vérifiées, pas toutes les 2 667 identités à la fois. Déterminer cet ensemble après contrôle des données Vie et des FAQ. Aucun choix automatique de cartes incomplètes. Tests du noyau utilisables avant toute interface et indépendants du viewport.

## Validation de cet audit

Inventaire local : PASS (comptage direct et empreinte dans DATA_AUDIT.json). Consultation des PDF FR/EN v1.2.1 et index FAQ/restrictions : PASS ; contrôle exhaustif de toutes les FAQ/errata : NOT_TESTED. Conformité du simulateur existant : non démontrée, anomalies statiques documentées. Tests de nouvelles règles, partie complète, WebSocket et appareils physiques : NOT_TESTED (conception seulement). Aucune migration/import/collecte/déploiement.

Contrôles réellement exécutés après rédaction : `node --import tsx --test tests/catalog.test.ts tests/pwa-policy.test.ts tests/collector.test.ts` : **23/23 PASS** (tests existants catalogue, decks/collection et cache PWA, pas tests de conformité du moteur). Validation JSON de l'inventaire et existence des chemins documentaires : PASS. `git diff --check` : PASS pour les fichiers suivis ; les nouveaux documents ont également été contrôlés pour espaces de fin de ligne. Build non relancé : changements exclusivement documentaires et inventaire, aucune modification de code.
