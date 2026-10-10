# Mugiwara V2 — journal de progression

## 10 octobre 2026 — Phase 0

Audit du code, configuration, rapports de maintenance, maquette clair/sombre et schéma Neon autorisé en lecture seule. Plan détaillé : MOBILE_V2_PLAN.md. Référence conservée : mugiwara-v2-reference.png. Aucune modification majeure de l’interface ou du métier.

| Contrôle | Résultat | Preuve |
|---|---|---|
| Audit et plan Phase 0 | PASS | MOBILE_V2_PLAN.md : constats, risques, fichiers et critères par phase |
| Inspection Neon en lecture seule | PASS | ../boosters/evidence/production-diagnostic/production-schema-readonly.json, transaction_read_only=on |
| Compatibilité schéma boosters Neon | FAIL | Quatre colonnes et unicité de clé absentes ; correction non exécutée |
| Réparation production | BLOCKED | Sauvegarde et autorisation de migration nécessaires ; exclure quatre migrations de jeu |
| TypeScript | PASS | evidence/phase-0/typescript.log, npm run typecheck, sortie 0 |
| ESLint | PASS | evidence/phase-0/eslint.log, npm run lint, zéro erreur et 99 avertissements |
| Tests unitaires | PASS | evidence/phase-0/unit.log, npm test, 32/32 |
| Build et intégration rejoués Phase 0 | NOT_TESTED | Preuves antérieures disponibles, pas de nouvelle exécution |
| Phases 1 à 7 V2 | NOT_TESTED | Aucune fonctionnalité V2 déclarée terminée |
| Captures V2 et appareils physiques | NOT_TESTED | Référence visuelle copiée ; aucun écran V2 encore implémenté |

Fichiers ajoutés : MOBILE_V2_PLAN.md, MOBILE_V2_PROGRESS.md, mugiwara-v2-reference.png, trois journaux evidence/phase-0 et preuve de schéma production. Documents actualisés : docs/boosters/PRODUCTION_DIAGNOSTIC.md et REMAINING_ISSUES.md. Aucun fichier applicatif modifié ; aucune régression applicative introduite par un changement de code pendant cette phase.

Suite : revue du plan, préparation de la réparation ciblée boosters avec sauvegarde et accord de production ; puis fondations mobile/thèmes sur branche dédiée. La préparation visuelle indépendante peut continuer sans écrire sur la production. Pas de push, déploiement, migration, attribution, reset ou lecture de comptes privés effectué.

## 10 octobre 2026 — fondations mobiles et sélection des boosters

Branche dédiée : feature/mugiwara-mobile-v2. Travail existant conservé. Aucun changement Prisma, API d’attribution, génération, combat ou multijoueur.

Fondations réalisées : tokens sombre marine et clair ivoire/corail ; choix Clair/Sombre/Système dans Profil, sidebar et menu ; préférence persistante via next-themes et adaptation système en direct ; provider de thème placé avant le chargement initial ; barre mobile cinq onglets, cibles 44 px, safe areas et espacement bas ; recherche tactile ; masquage/restauration de la navigation pendant les cinématiques ; événements tactiles pris en compte pour l’inactivité. Sidebar desktop conservée.

Sélecteur : familles déduites des codes réellement présents, recherche placée avant le booster, sélection canonique dans ?set= conservée après rechargement, carrousel existant réutilisé, extensions complémentaires horizontales sur téléphone et galerie desktop conservée. Extensions vides/incompatibles explicitement non ouvrables. Aucun taux de tirage modifié.

| Vérification réellement exécutée | État | Preuve |
|---|---|---|
| Sept tailles × deux thèmes : navigation, débordement et cibles des onglets | PASS | evidence/phase-1/results.json : 14 scénarios ; captures PNG |
| Thème conservé après rechargement et système sans rechargement | PASS | Deux scénarios navigateur |
| Navigation pendant animation, après passage et mouvement réduit | PASS | Deux scénarios navigateur ; démo sans attribution |
| Sélection URL, familles OP/EB/ST, recherche, rechargement, vide et absence de crédit | PASS | evidence/phase-2/results.json : 6 scénarios sur PostgreSQL isolée |
| TypeScript | PASS | evidence/phase-1/typescript.log, sortie 0 |
| ESLint | PASS | evidence/phase-1/eslint.log, 0 erreur, 99 avertissements existants |
| Unitaires | PASS | evidence/phase-1/unit.log, 34 tests dont deux nouveaux tests de familles |
| Build de production | PASS | evidence/phase-1/build.log ; premier essai bloqué par téléchargement Inter dans sandbox, relance réseau autorisée |
| Accessibilité exhaustive, flash filmé, appareils physiques et PWA installée | NOT_TESTED | Dimensions et navigation contrôlées dans Chrome ; pas une certification native |
| Nouvelles animations tactiles, classeur/sheet, listes et builder mobile | NOT_TESTED | Phases suivantes non implémentées |
| Ouverture en production | BLOCKED | Schéma Neon absent ; aucune migration ni ouverture réelle exécutée |

Tests navigateur : tests/mobile-foundations.browser.mjs (localhost, lecture seule / démonstration) et tests/mobile-boosters.browser.mjs (garde stricte 127.0.0.1:55432/op_boosters_test). Fixtures synthétiques conservées ; aucune suppression. Un premier essai de rechargement allait plus vite que router.replace : test corrigé pour attendre l’URL canonique et l’image sélectionnée, puis rejoué avec succès.

Fichiers applicatifs modifiés : src/app/collector.css, layout.tsx, providers.tsx, profile/page.tsx, boosters/page.tsx, components/Navbar.tsx, components/booster-opening/CinematicOpening.tsx. Ajouts : components/collector/ThemeSelector.tsx, OpeningPresentation.tsx, lib/collector/extension-family.ts, tests/extension-family.test.ts et les deux suites navigateur. Aucun ajout de dépendance.

Captures : evidence/phase-1/390-light.png, 390-dark.png, 1440-light.png, 1440-dark.png et autres tailles ; evidence/phase-2/boosters-mobile-light.png, boosters-desktop-light.png. Ajustement final de compacité après revue visuelle. Thème clair de certains composants anciens et états d’erreur à compléter ; contraste exhaustif non mesuré. Fondations et sélecteur validés sur les contrôles décrits, Phase 1 globale reste PARTIELLE (bottom sheet/PWA ultérieures).

Pour lancer : cd cardgame puis npm run dev ; ouvrir http://localhost:3000. Pour répéter les fondations : node tests/mobile-foundations.browser.mjs. Le scénario boosters requiert un serveur explicitement branché sur la base isolée et DATABASE_URL de test ; ne jamais le lancer avec Neon.

Suite : classeur mobile et deck builder indépendants ; cinématique tactile après stabilisation serveur. Aucun push ni déploiement.

## 10 octobre 2026 — classeur tactile et deck builder mobile

Phase 4 (présentation du classeur) : filtres dans un bottom sheet Radix avec fermeture explicite/Escape, focus restitué au bouton, recherche et famille déduite du catalogue, filtres combinables et compteur réel. Un seul jeu de contrôles selon le viewport, sans duplication des groupes radio. Les filtres latéraux desktop sont conservés. Les liens ?set= et ?ownership=missing initialisent le classeur.

Fiche carte : présentation plein écran mobile, illustration agrandissable dans une zone défilable, fallback image, cartes précédente/suivante selon les résultats filtrés ; glissement horizontal optionnel, désactivé pendant l’agrandissement. Favoris persistants via l’API existante. Aucun changement de quantité, aucune attribution. Les gestes de zoom natifs et les safe areas physiques nécessitent encore une vérification sur appareil.

Phase 5 : Catalogue / Mon deck sur mobile, état de composition conservé entre onglets, clavier flèches/Home/End, compteurs possédées/dans le deck, leader et 50 cartes, boutons quantités de 44 px, panneau secondaire statistiques/validation, miniatures bornées avec fallback. Desktop conserve ses panneaux. Règles de validation et API de sauvegarde réutilisées ; banlist et règles spéciales restent explicitement non couvertes.

| Contrôle | État | Preuve |
|---|---|---|
| Filtres combinés, réinitialisation et retour du focus | PASS | evidence/phase-4-5/results.json, interaction navigateur réelle |
| Zoom, cartes précédente/suivante, glissement et favoris persistants | PASS | Suite mobile-collection-deck.browser.mjs |
| Collection et builder aux sept tailles demandées | PASS | 14 captures ; absence de débordement et présentation mobile/desktop contrôlée |
| Construction 1 leader + 50 cartes, limite de propriété et sauvegarde | PASS | Nouveau compte synthétique, API réelle, version du deck vérifiée en PostgreSQL isolée |
| Chargement du deck et navigation clavier des onglets | PASS | Compteur 50/50 et nom persistants |
| Nouvelles vues en thème clair | PASS | Captures collection, filtres et builder |
| Collection conservée et aucune ouverture créée | PASS | 53 exemplaires identiques avant/après, zéro ouverture pour le compte fixture |
| TypeScript, ESLint et unitaires | PASS | typescript.log sortie 0 ; eslint.log 0 erreur/99 avertissements ; unit.log 34/34 |
| Build de production | PASS | build.log sortie 0, relancé après corrections visuelles |
| Appareils physiques, gestes multi-touch et zoom Safari iOS | NOT_TESTED | Chrome macOS/émulation seulement |
| Listes personnalisées et migration associée | NOT_TESTED | Non implémentées dans ce lot ; Phase 4 globale demeure partielle |
| Nouvelle cinématique tactile / stabilisation Neon | BLOCKED pour intégration production | Schéma de production non migré ; présentation actuelle conservée |

Défauts détectés puis corrigés : propriété CSS translate indépendante de transform dans Tailwind 4 décalant le panneau ; zone de défilement sans hauteur contrainte ; anciens legends flottants masquant les options dans la sheet. Revue visuelle des captures en complément des assertions ; interaction radio passée à un clic réel. Premier essai interrompu après le défaut de panneau ; sortie observée dans le terminal, sans journal JSON conservé pour cet essai interrompu. Deux erreurs du script de test corrigées : sélection ambiguë de role=alert avec l’annonceur Next.js, puis lecture des cartes via DeckVersion selon le modèle réel. Les résultats finaux remplacent ces essais pour la validation.

Fichiers modifiés : src/components/collector/CatalogueGrid.tsx, CardDetail.tsx ; src/app/deck-builder/page.tsx, collector.css. Ajouts : src/hooks/useMobileLayout.ts, src/components/collector/CardThumbnail.tsx, tests/mobile-collection-deck.browser.mjs, evidence/phase-4-5/. Aucune dépendance, modèle Prisma ou route serveur changé. Tests avec garde stricte de destination 127.0.0.1:55432/op_boosters_test ; fixtures conservées, aucun reset ni suppression.

Suite : accueil/historique/profil mobiles, listes privées et finition PWA ; cinématique tactile après stabilisation serveur. Aucun push ni déploiement. Application locale relancée avec sa configuration habituelle après tests.

Précision de preuve : le glissement est simulé par événements Pointer dans Chrome ; les gestes sur appareil physique restent NOT_TESTED. Les captures finales ont été régénérées après correction des legends ; les radios sont sélectionnées par clic Playwright réel, sans invocation JavaScript de click().
