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

## 10 octobre 2026 — accueil, historique, profil, progression et PWA

Accueil mobile : héros et accès direct au choix de booster, trois statistiques compactes issues des données (desktop en conserve quatre), cartes récentes et progression en carrousels, lien decks et historique. Les cartes rares restent accessibles ; états vides compactés. Aucun chiffre, niveau ou succès fictif.

Historique : liste compacte, reçu en plein écran mobile, consultation via URL canonique ?opening=, cartes et indicateurs de doublons issus du snapshot enregistré. Une fiche carte imbriquée se ferme sans fermer le reçu ; Escape restitue le focus à la ligne d’historique. Le desktop conserve le résultat dans la page. Aucun POST déclenché par consultation ou rechargement.

Progression : nouvelle page privée /progress, accessible depuis Accueil et Profil, recherche/familles tirées du catalogue, uniques / total, exemplaires séparés, manquantes et variantes spéciales. Lien direct vers /collection?set=...&ownership=missing ; paramètres explicites pris en compte à chaque navigation. Navigation Collection active sur la progression.

Profil : accès à historique/progression, thèmes, sons, cinématiques, effets, densité et vibrations indépendantes. Vibrations désactivées par défaut, conservées par utilisateur et utilisées uniquement lors d’une révélation manuelle si navigator.vibrate existe ; aucune promesse de retour natif uniforme. La couleur de barre navigateur suit le thème résolu.

PWA : manifest cohérent, icônes existantes vérifiées 192/512 px, orientation libre ; déclarations de screenshots aux dimensions incorrectes retirées. Worker limité à offline.html et trois icônes publiques. Sessions, API, reçus et pages privées ne sont jamais ajoutés au cache. Navigation hors ligne : écran public générique sans compte ; retour en ligne vérifié. Mise à jour explicite/reportable, masquée sur les parcours d’ouverture et bloquée par une intention non confirmée ; nouvelle vérification avant rechargement si la navigation change pendant l’activation. Aide d’installation iOS dans Profil. Voir PWA_GUIDE.md.

| Contrôle effectué | État | Preuve |
|---|---|---|
| Accueil et statistiques réelles compactes | PASS | evidence/phase-6-pwa/results.json |
| Historique, fiche imbriquée, rechargement et absence de crédit supplémentaire | PASS | Reçu réel généré une fois sur la base isolée ; zéro POST depuis l’interface de consultation |
| Confidentialité du reçu et cache-control historique | PASS | Autre utilisateur : 404 ; réponse no-store |
| Progression et lien vers cartes manquantes de l’extension | PASS | Quantités/uniques vérifiées, nombre de résultats exact |
| Préférences indépendantes et conservées après rechargement | PASS | Cinématiques/sons/effets/vibrations testés dans le navigateur |
| Quatre pages aux sept résolutions | PASS | 28 vues sans débordement, captures 390 et 1440 px en sombre |
| Quatre pages en clair et couleur de barre navigateur | PASS | Captures 390 px, changement de thème sans rechargement |
| Manifest, icônes et vrai CacheStorage | PASS | Cache réel contient seulement offline.html et trois icônes |
| Hors connexion et retour réseau | PASS | Page Profil remplacée par écran public, aucune information du compte |
| Prompt d’installation et aide iOS | PASS pour interface | Prompt simulé ; user-agent iPhone dans Chrome. Pas d’installation native attestée |
| Mise à jour et intention non confirmée | PASS pour interface | Worker simulé : aucune activation avec intention non confirmée ; activation explicite ; rechargement reporté si navigation vers ouverture |
| Absence d’erreurs JavaScript et de récompenses supplémentaires | PASS | 13 scénarios navigateur finaux réussis, un seul reçu de préparation |
| Politique de cache du worker | PASS | Quatre nouveaux tests : allowlist, activation manuelle, purge de namespace, données privées hors cache |
| TypeScript, ESLint, unitaires et build | PASS | Journaux dédiés ; 38/38 tests, zéro erreur ESLint et 99 avertissements existants |
| Installation et mise à jour sur appareils iOS/Android physiques | NOT_TESTED | Chrome macOS seulement, pas de publication native |
| Safe areas matérielles et vibrations réelles | NOT_TESTED | Préparation CSS/API, pas d’appareil physique |
| Listes personnalisées | NOT_TESTED | Lot distinct avec migration additive et tests de droits à préparer |
| Ouvertures Neon et nouvelle cinématique intégrée | BLOCKED | Migration de production toujours non autorisée/appliquée ; génération inchangée |

Défauts détectés/corrigés durant validation : fermeture des deux modales au lieu de la seule fiche carte (dialogue désormais imbriqué avec gardes Escape/interactions) ; première installation confondue avec mise à jour (contrôle d’un worker déjà actif) ; mise à jour sans option de report ; contraste des liens/illustrations de progression en clair ; espacement excessif du reçu plein écran ; réglages modifiables avant chargement de l’identité (contrôles désormais désactivés tant que la clé du compte n’est pas chargée, scénario réseau retardé ajouté). TypeScript a aussi détecté import.meta dans un nouveau test incompatible avec la configuration module existante : lecture du worker adaptée, sans modifier ou désactiver TypeScript. Les échecs intermédiaires sont décrits ici ; results.json contient le dernier essai complet réussi.

Fichiers principaux modifiés : src/app/home/page.tsx, history/page.tsx, profile/page.tsx, layout.tsx, collector.css ; components/Navbar.tsx, PWAInstallPrompt.tsx, collector/Preferences.tsx, ThemeSelector.tsx, CatalogueGrid.tsx ; components/booster-opening/BoosterExperience.tsx (retour tactile uniquement) ; public/manifest.json et sw.js. Ajouts : app/progress/page.tsx et layout.tsx, collector/InstallHelp.tsx, hooks/useVibration.ts, public/offline.html, tests/pwa-policy.test.ts et mobile-pages-pwa.browser.mjs, PWA_GUIDE.md et preuves phase-6-pwa. Aucune dépendance, migration, modèle ou API métier modifié.

Commandes exécutées : npm test, npm run typecheck, npm run lint, npm run build ; npm run start -- --port 3007 avec URL strictement isolée, puis node tests/mobile-pages-pwa.browser.mjs avec la même garde. Serveur habituel arrêté pendant les builds puis relancé par npm run dev -- --port 3000. Worker volontairement non enregistré en mode dev ; tests PWA exécutés sur la version compilée. Fixtures conservées, aucun reset, suppression, déploiement ou push.

Suite : listes personnalisées privées et validation exhaustive des régressions ; cinématique tactile après stabilisation du schéma serveur. Toutes les nouvelles statistiques restent basées sur les données utilisateur.
