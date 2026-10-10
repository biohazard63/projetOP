# Mugiwara TCG V2 — audit et plan mobile-first

Date : 10 octobre 2026. Phase 0 uniquement : inspection, diagnostic et plan avant modifications majeures.

## Référence et protection

Référence visuelle effectivement examinée : [maquette clair/sombre](mugiwara-v2-reference.png), 1536 × 1024, copie de public/images/MaquetteOP.png. Conserver les originaux. Reprendre le héros Luffy, les boutons or, le carrousel à trois boosters, les statistiques compactes, les miniatures horizontales, le détail immersif et les cinq onglets inférieurs. Le thème clair utilise des surfaces ivoire et un accent corail indépendant du thème marine. Ne pas reproduire les statistiques, niveaux, récompenses ou nombres de cartes fictifs de la maquette.

Branche inspectée : feature/premium-collector-ui, HEAD 68401bc ; divergence avec sa référence distante (2 commits locaux, 4 distants). Aucune fusion automatique : inspecter ces commits avant une future intégration. Aucun fichier suivi modifié au début ; fichiers utilisateur non suivis : deux maquettes et .DS_Store. Ne pas les écraser. Aucune modification de main, aucun push, déploiement, reset ou migration de production durant cet audit.

## Constats techniques

Stack du package : Next 15.5.27, React 19.1.9, Prisma 6.19.3, NextAuth 5 beta.32, Tailwind 4, ESLint 9. Node local 22.22.2 respecte engines >=22 <25 ; production signalée Node 24. next.config.js actif : images officielles optimisées via même origine, API no-store, service worker no-cache. Les vérifications TypeScript ne sont pas désactivées.

| Parcours | Existant réutilisable | Écart V2 / fichiers concernés |
|---|---|---|
| Navigation et thèmes | Sidebar desktop, recherche, next-themes | providers.tsx force sombre et désactive système ; Navbar.tsx sans barre inférieure ; layout.tsx sans viewport-fit cover ; collector.css contient des couleurs fixes et des surcharges |
| Accueil | Données réelles via /api/collector, héros, cartes récentes, progression | src/app/home : composition mobile trop longue ; prioriser action, trois statistiques et carrousels |
| Boosters | Catalogue sécurisé, disponibilité, artwork, sélection et recherche | src/app/boosters/page.tsx : tous les codes et grande grille ; ajouter familles issues des données, carrousel compact, recherche et sélection persistante |
| Ouverture | Service serveur unique, reçu atomique, verrou utilisateur, unicité clé, récupération ; cinématique CSS 3D et démonstration isolée | BoosterExperience : intention sessionStorage perdue après fermeture complète ; CinematicOpening : départ automatique, pas de toucher pour ouvrir ni glissement tactile |
| Collection | Catalogue filtré, pagination 36, grille mobile deux cartes, quantité et favoris réels | CatalogueGrid : filtres permanents ; ajouter bottom sheet, famille, URL partagée et conservation des filtres |
| Fiche carte | CardDetail Radix, données réelles, variantes, favoris, accès deck | Grande fiche mobile, zoom et navigation entre cartes ; conserver alternatives clavier et boutons |
| Deck builder | Catalogue possédé, sauvegarde, leader, couleurs, copies et validation partagée | src/app/deck-builder/page.tsx : trois panneaux empilés ; remplacer présentation mobile par Catalogue / Mon deck, statistiques secondaires et ratios cohérents |
| Historique | API privée paginée et reçu en lecture seule | src/app/history : liste compacte, présentation résultat commune sans aucun POST |
| Profil | Compte, statistiques et préférences animations/densité | src/app/profile ; Preferences.tsx ; hooks/useAudio.ts : compléter thème, sons, vibrations, cinématiques et réduction indépendants |
| Progression | Calculs uniques par extension et ExtensionDetail | Vue dédiée, accès filtré aux manquantes et variantes ; ne pas compter les exemplaires comme cartes uniques |
| Favoris et listes | FavoriteCard et API privée existants | Aucune liste personnalisée : modèle et migration additive à prévoir, avec autorisation séparée pour la production |
| PWA | Manifest standalone, icônes, prompt installation | public/sw.js supprime les caches mais ne fournit pas de mode hors ligne ; prompt sans instructions iOS ; vérifier dimensions des assets et manifest avant validation installabilité |

Rapports consultés : docs/maintenance/AUDIT.md, REMAINING_ISSUES.md, UI_REDESIGN.md et docs/boosters/PRODUCTION_DIAGNOSTIC.md. Les anciennes alertes sur les générateurs ne remplacent pas l’examen du service sécurisé actuel. Les anciens composants d’ouverture inutilisés ne doivent pas être reconnectés.

## Préalable S0 — production boosters

La connexion Neon indiquée par l’utilisateur a été inspectée en transaction READ ONLY. Preuve : ../boosters/evidence/production-diagnostic/production-schema-readonly.json. Le contrôle donne FAIL : BoosterOpening ne possède aucune des quatre colonnes idempotencyKey, creditedAt, resultSnapshot, rulesSnapshot ; l’unicité utilisateur/clé manque. Catalogue : 3033 cartes, 46 extensions, zéro ouverture enregistrée au contrôle. Cette incompatibilité explique le défaut attendu de la route sécurisée ; la destination Vercel doit être confirmée dans ses paramètres avant une écriture, sans afficher les secrets.

Douze migrations enregistrées, cinq absentes. Quatre absentes concernent le jeu : 20250505090703_add_game_logs_relation, 20250904163118_add_game_state_fields, 20250905073432_add_don_field, 20250905081215_fix_used_don_deck_type. La cinquième est 20261009120000_secure_booster_openings. Ne pas exécuter migrate deploy global.

Procédure ciblée à préparer et autoriser : sauvegarde/snapshot vérifié ; contrôle des contraintes réelles, index, collisions et journal ; répétition de la migration seule sur une fixture isolée équivalente ; application transactionnelle du seul SQL secure_booster_openings avec délais de verrou maîtrisés ; vérification colonnes/index/relations et préservation des données ; enregistrement de cette seule migration dans le journal Prisma après succès. Ne pas marquer une migration appliquée avant le DDL. Ne pas toucher aux quatre migrations de jeu. Une ouverture réelle de production n’est pas un test à déclencher automatiquement. Récupérer ensuite l’intention existante avec la même clé.

SQL existant à examiner : ../../cardgame/prisma/migrations/20261009120000_secure_booster_openings/migration.sql. Colonnes nullable et index additionnels ; contraintes de suppression remplacées par RESTRICT. Aucune exécution en production pendant Phase 0. L’autorisation de connexion fournie permet le diagnostic, pas une migration : la consigne utilisateur exige un accord préalable pour cette dernière.

## Architecture retenue

Conserver services, modèles existants, routes sécurisées et règles de tirage. Aucun nouveau taux, monnaie, stock, récompense, moteur de jeu ou paiement. Les statistiques restent calculées à partir du catalogue et des lignes utilisateur. Garder les extensions indisponibles explicitement indisponibles, sans fallback silencieux.

Aucune nouvelle dépendance nécessaire au socle : next-themes, Radix, lucide-react, Framer Motion et CSS 3D sont déjà disponibles. Choisir CSS 3D pour la cinématique universelle smartphone ; pas de WebGL ni vidéo par extension. Réutiliser les illustrations sélectionnées. Effets de rareté issus des métadonnées normalisées et configurables, sans modifier la génération.

Design tokens sémantiques dans collector.css : background, surface, border, text, muted, accent, gold et états. Définir deux palettes réelles, remplacer progressivement les couleurs fixes. ThemeProvider active light/dark/system, résout le système sans rechargement et applique le thème avant affichage. Le chargement initial et les erreurs utilisent aussi les tokens. Vérifier contrastes, focus et changement système en direct.

Composants partagés proposés : MobileBottomNav, MobileHeader, AccessibleBottomSheet, ExtensionFamilyTabs, BoosterCarousel, OpeningPresentationProvider, OpeningResult, CardViewer et DeckMobileTabs. Présentation mobile 360–430 px, tablette puis desktop ; sidebar et panneaux desktop conservés. Cibles 44 × 44, safe-area haut/bas, marge de contenu égale à la navigation. Cacher la navigation uniquement pendant la présentation plein écran, sans empêcher le défilement du résultat.

Sélection extension/famille issue du catalogue, avec URL canonique set et filtres partagés entre boosters, extensions, collection et progression. Aucun code fictif. Recherche code/nom ; Autres regroupe les familles non reconnues. La sélection persiste raisonnablement sans écraser un lien explicite.

Sécurité : POST accepte seulement extension et clé ; reçu serveur confirmé avant présentation des acquisitions. L’animation et la consultation historique ne créditent jamais. Intention persistante par utilisateur contenant uniquement clé opaque et identifiant de reçu/extension, jamais session ou cartes privées ; récupération authentifiée et coordination entre onglets. En cas de stockage refusé, expliquer la limite et proposer l’historique. Une erreur réseau ne crée pas automatiquement une nouvelle clé.

Interactions : toucher pour démarrer, révélation tactile, Tout révéler et Passer accessibles ; glissement limité à la zone de révélation. Les autres pages conservent pan-y et pinch-zoom ; désactiver changement de carte pendant zoom. Bottom sheet avec focus contrôlé, retour de focus, Escape, fermeture explicite et glissement optionnel. Effets bornés dans le temps, timers/sons nettoyés, préférence système de réduction respectée. Sons après interaction, vibrations best effort sans promesse native iOS.

Listes : CardList appartenant à User, CardListItem référant au catalogue avec unicité (listId, cardId). CRUD privé, contrôle propriétaire sur parent et éléments, validation serveur, no-store et tests IDOR. Réutiliser FavoriteCard. Ajouter des références ne modifie jamais la collection ni les quantités. Migration additive testée uniquement sur base isolée ; production soumise à accord. Ne pas présenter une persistance locale fictive comme une liste sauvegardée côté compte.

PWA : manifest cohérent Mugiwara, icônes vérifiées, viewport safe areas, conseils installation iOS et prompt compatible Android. Worker versionné avec cache limité aux ressources publiques explicitement autorisées et écran hors ligne générique. API, authentification et pages privées restent réseau seul ; aucun reçu, compte ou liste privée mis en cache. Purger seulement son propre namespace. Reporter les mises à jour lorsqu’une intention d’ouverture est active. Installabilité et appareils physiques à vérifier, aucune publication App Store/Play Store.

## Découpage et critères de sortie

| Phase | Travail et fichiers principaux | Vérification exigée avant clôture |
|---|---|---|
| S0 | Migration ciblée existante, diagnostic production | Sauvegarde, répétition isolée, autorisation, colonnes/index vérifiés ; aucun tirage modifié |
| 1 Fondations | collector.css, providers.tsx, layout.tsx, Navbar.tsx, Preferences.tsx, composants navigation/sheet, manifest | Deux thèmes + système, aucun flash observé, focus, safe areas, desktop intact |
| 2 Boosters | boosters/page.tsx, SetTile, ExtensionDetail, composants familles/carrousel | Catalogue réel OP/EB/ST/autres, recherche, sélection URL, états vides et indisponibles |
| 3 Ouverture | Démo isolée, CinematicOpening, BoosterExperience, OpeningResult, useAudio | Prototype d’abord ; toucher/glissement/réduction ; serveur stabilisé ; reprise et aucun double crédit |
| 4 Collection | CatalogueGrid, CardTile, CardDetail, API et modèles listes | Grille deux colonnes, sheet combinable, zoom, favoris, listes privées et tests inter-utilisateurs |
| 5 Decks | deck-builder/page.tsx et contrôles partagés | Catalogue / Mon deck mobile, quantités, leader, sauvegarde et erreurs ; ratios/fallbacks images |
| 6 Autres pages | home, history, profile, progression et ExtensionDetail | Statistiques réelles, historique lecture seule, préférences conservées et accès aux manquantes |
| 7 Validation | tests, manifest/sw, documentation et captures | Matrice responsive, sécurité, PWA, TypeScript, lint et build de production |

À chaque phase : commit local logique sur une branche V2 dédiée après protection des modifications existantes, liste des fichiers, captures si possibles, résultats réellement exécutés, régressions et prochain travail dans MOBILE_V2_PROGRESS.md. Présenter ce plan avant de commencer les modifications majeures.

## Plan de tests et risques

Playwright : 360×800, 375×667, 390×844, 430×932, 768×1024, 1280×800, 1440×900 dans les deux thèmes ; vérifier absence de débordement, navigation, clavier, filtres, cartes, builder et états vides/erreurs. Tester thème système et stockage bloqué, mouvement réduit, perte réseau, réponse retardée, rafraîchissement et fermeture/réouverture. Captures mobiles et desktop avec données isolées. Les vues émulées ne prouvent pas les safe areas ni l’installation sur appareil réel.

Tests serveur sur 127.0.0.1:55432/op_boosters_test uniquement, avec garde de destination : non-connecté, requête falsifiée, doubles clics, répétition, concurrence, rollback, crédit persistant, historique privé et droits listes entre utilisateurs. Ne pas tester les écritures sur Neon. Favoris et listes ne peuvent pas modifier les cartes attribuées.

Risques : migration production absente ; quatre migrations de jeu en attente ; divergence Git ; couleurs fixes empêchant un vrai thème clair ; sessionStorage insuffisant après fermeture ; longue liste de boosters ; catalogue complet téléchargé malgré pagination visuelle ; stockage/sons spécifiques navigateurs ; états de chargement actuels non thématisés. Réduire progressivement le coût catalogue après mesure, sans nouvelle réécriture globale. Banlist et règles spéciales de deck ne sont pas intégralement couvertes : afficher la portée réelle des validations.

## Preuves Phase 0

npm run typecheck : PASS, sortie 0. npm run lint : PASS, zéro erreur, 99 avertissements existants. npm test : PASS, 32 tests, zéro échec. Journaux : evidence/phase-0/. Aucun nouveau build, test E2E V2, installation PWA ou test sur appareil physique pendant cette phase. Les builds et tests d’intégration antérieurs restent des preuves datées dans docs/boosters/evidence/production-diagnostic, sans être déclarés rejoués aujourd’hui. Aucun secret dans ces rapports.
