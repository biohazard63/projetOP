# Parcours d’ouverture — 10 octobre 2026

## Audit court avant modifications

Branche `maintenance/catalog-rebuild`. Les modifications non commitées du catalogue et des profils ont été conservées. Référence : `cardgame/public/images/Flux complet d’ouverture des boosters Mugiwara.png`, jointe à la conversation. Les quantités, cartes et taux illustratifs de cette maquette ne deviennent pas des données métier.

Stack observée : Next.js 15.5.27, React 19.1.9, TypeScript 5.9, Prisma 6.19.3, NextAuth 5 bêta, CSS et Framer Motion existant. Aucune dépendance supplémentaire nécessaire.

Existant : `/boosters` présentait trois illustrations statiques sans swipe ; `/boosters/[code]` possédait déjà les cartes, raretés et la progression réelle ; `BoosterExperience` confirmait une ouverture serveur avant la cinématique, mais révélait les cartes dans une grille. Les préférences animations/vibrations étaient déjà persistantes par utilisateur. Les sons utilisaient une préférence navigateur. Le serveur verrouille l’utilisateur dans une transaction, vérifie l’extension, refuse les données supplémentaires du client et réutilise le reçu par clé d’idempotence. Les anciens historiques peuvent manquer d’informations sur les acquisitions : l’interface ne les invente pas.

Plan appliqué : carrousel tactile natif → confirmation utilisant les données réelles → animation interactive → carte individuelle → effets selon rareté et variante → récapitulatif → préférences → contrôles automatisés et responsive.

## Choix et fichiers

- `BoosterCarousel.tsx` et son module CSS : défilement natif avec scroll-snap, suivi du doigt, glissement souris, clavier/flèches, sélection synchronisée, conteneurs identiques. Toucher utilise le navigateur plutôt qu’un blocage Pointer Events du scroll vertical.
- `boosters/page.tsx` : intégration du carrousel ; les filtres réutilisent les familles du catalogue, avec sélection valide après filtrage. Les produits ST restent consultables dans Extensions ; leur ouverture reste interdite par les règles métier existantes.
- `BoosterExperience.tsx` : confirmation, résultats et erreurs existants conservés ; reçus récupérables après fermeture grâce au stockage local par utilisateur, compatible avec l’ancien sessionStorage ; garde synchrone contre les doubles actions.
- `CinematicOpening.tsx` et CSS : geste de glissement, clic ou bouton, déchirure CSS, lumière et cartes dos visibles. La cinématique commence après l’enregistrement, ne fait aucun appel d’attribution et peut être passée.
- `SingleCardReveal.tsx` et CSS : une seule carte principale, révélation au tap, swipe horizontal ou bouton, compteur dynamique, état persisté par la page, effets GPU transform/opacity, mode réduit. Aucun geste obligatoire.
- `presentation.ts` : transitions et classification visuelle testables, indépendantes du générateur. Les ALT ne sont pas assimilées à SEC ; `drawVariant` fait autorité lorsqu’il existe.
- `OpeningSettings.tsx`, `collector/Preferences.tsx`, `useAudio.ts` : animations, sons, mode rapide et vitesse persistants. Les boutons son partagent leur état, sans son automatique au chargement.
- `collector.css` : tailles tactiles, présentation immersive et suppression du panneau vide sur mobile. La navigation est masquée par le contexte existant pendant cinématique et révélation, puis rétablie.
- `booster-presentation.test.ts`, `booster-journey.browser.mjs`, `booster-journey.desktop.mjs` et `package.json` : tests de transitions et parcours réels avec compte/cartes synthétiques sur PostgreSQL isolé.

Aucune migration, aucune modification des probabilités, aucun import, aucune écriture sur Neon. Les profils proposés précédemment restent non activés. L’effet visuel reprend la composition de la maquette avec les ressources existantes : pas de nouvelle illustration ni de vidéo par extension.

## Vérification

Résultats et captures consignés dans `evidence/` ; voir les preuves finales ajoutées ci-dessous. Les profils, collections, decks et historiques existants ne sont pas modifiés par les tests : les ouvertures utilisent uniquement des fixtures sur `127.0.0.1:55432/op_boosters_test`.

## Résultats réellement exécutés

| Contrôle | État | Résultat / preuve |
|---|---|---|
| `npm run typecheck` | PASS | `evidence/journey-typescript.txt` |
| `npm run lint` | PASS | 0 erreur, 99 avertissements conservés ; `evidence/journey-eslint.txt` |
| `npm test` | PASS | 71 tests, dont 4 nouveaux tests de présentation ; `evidence/journey-unit.txt` |
| `npm run test:boosters:integration` | PASS | 18 tests PostgreSQL isolés ; `evidence/journey-integration.txt` |
| `npm run build` | PASS | Compilation en copie temporaire, base de test uniquement ; `evidence/journey-build.txt` |
| `npm run test:boosters:journey:browser` | PASS | 23 contrôles du parcours plus 1 contrôle Chrome desktop dédié ; `evidence/journey-browser.json` et `evidence/journey-desktop.json` |
| Mobile / tablette / desktop | PASS | 360×800, 375×667, 390×844, 430×932, 768×1024, 1280×800, 1440×900, sans débordement horizontal |
| Appareils iPhone/Android physiques, Safari iOS | NOT_TESTED | Environnement Chrome automatisé ; les dimensions mobiles ne prouvent pas la compatibilité avec Safari |
| Encoche / safe areas réelles | NOT_TESTED | CSS `env(safe-area-inset-*)` présent, pas de matériel iOS pour valider ses valeurs |
| Tests audio avec haut-parleurs | NOT_TESTED | Préférence testée ; sons désactivés pendant les E2E |
| Déploiement / ouverture en production | NOT_TESTED | Aucun déploiement ni accès à Neon |

Les E2E couvrent : connexion réelle d’un utilisateur synthétique, carrousel par flèches/clavier/toucher/souris, fiche d’extension et retour à la sélection, double clic, rechargement pendant cinématique, une seule carte visible et proportions à sept résolutions, révélation au tap et au swipe, récapitulatif exact, rechargement après résultat, déchirure à la souris, tout révéler, historique sans POST, préférences conservées, mode rapide, `prefers-reduced-motion`, réponse 500 simulée **après commit serveur** puis récupération avec exactement la même clé et absence de double crédit. Aucune erreur JavaScript constatée.

Les premières exécutions ont révélé le glissement natif de l’image qui annulait le geste souris ; correction : images non déplaçables et capture du pointeur. Le test tactile a aussi été corrigé pour glisser vers un voisin existant, et les tests attendent la navigation/la fin du retournement avant de mesurer. Le serveur de test a nécessité `AUTH_TRUST_HOST=true` pour localhost ; aucune modification de l’authentification de production. Le tableau ci-dessus rapporte les exécutions finales, pas les essais intermédiaires échoués.

### Captures

- `evidence/journey-carousel-mobile.png` et `journey-carousel-desktop.png` : sélection.
- `evidence/journey-confirmation-mobile.png` : confirmation.
- `evidence/journey-interactive-mobile.png` : ouverture interactive.
- `evidence/journey-reveal-360.png` à `journey-reveal-1440.png` : présentation individuelle ; `journey-reveal-desktop.png` utilise un contexte desktop dédié.
- `evidence/journey-summary-mobile.png` : résultat.
- `evidence/journey-recover-error-mobile.png` : récupération d’une réponse perdue.

Les captures utilisent des métadonnées de test et les illustrations locales existantes, pas des statistiques réelles de joueur. L’ancienne référence d’interface est disponible dans `docs/design/evidence/phase-2/boosters-mobile-light.png` : elle précède ce lot et n’a pas été recréée comme une prétendue capture avant modification.

### Commandes

Depuis `cardgame/`, `npm run dev` démarre l’application existante. Le serveur utilisateur sur le port 3000 et sa base sont préservés. Les tests utilisent une autre copie sur le port 3011, arrêtée après vérification, pour ne pas écraser `.next` de l’application locale.

```bash
npm run typecheck
npm run lint
npm test
# Uniquement avec DATABASE_URL pointant sur op_boosters_test, port 55432 :
npm run test:boosters:integration
npm run test:boosters:journey:browser
node tests/booster-journey.desktop.mjs
```

Le test navigateur refuse toute autre base et attend un serveur local sur 3011. Pour le reproduire, utiliser cette même base isolée, des secrets d’authentification de test, `AUTH_TRUST_HOST=true` et `NEXTAUTH_URL=http://localhost:3011` lors du démarrage du serveur isolé. Ne jamais réutiliser ces secrets pour un déploiement.

## Points restant à valider

Le rendu reprend le flux, la palette et les proportions générales ; ce n’est pas une reproduction pixel par pixel des illustrations de maquette. Les taux et le nombre de cartes sont ceux du catalogue/règles actifs. Les profils d’équilibrage préparés précédemment restent des propositions non activées. Les configurations historiques incomplètes peuvent toujours être refusées par le serveur : l’interface affiche l’erreur et ne crédite rien ; elle ne corrige pas silencieusement les pools ou les probabilités.

Une validation sur Safari iOS et Android physique est requise avant livraison publique, notamment le geste, le retour depuis une interruption, le son, les safe areas et les contrastes des deux thèmes. Pas de rapport de performance sur matériel de milieu de gamme : les animations CSS sont limitées et finies, mais leur fluidité sur ce matériel reste à mesurer.

Aucun combat, deck, catalogue, paiement ou modèle Prisma modifié dans ce lot. Les changements locaux de bannière, icônes, dossier logo, JSON et maquettes observés dans l’espace de travail ne sont pas attribués à cette refonte et n’ont pas été écrasés. Aucun commit, push ou déploiement.
# Optimisation du chargement des cartes — 10 octobre 2026

Les illustrations étaient chargées seulement au retournement. Le parcours précharge maintenant les trois premières cartes dès que le résultat serveur est disponible pendant la cinématique, puis la carte courante et les deux suivantes pendant la révélation. Les images sont décodées en arrière-plan. Le préchargement utilise `getImageProps` et les mêmes dimensions/sizes que la carte visible, afin de réutiliser les images optimisées du navigateur sans télécharger séparément l'original distant. Les tailles demandées respectent les plafonds réels de 300 px et 245 px sur écran court.

Fichiers concernés : `useCardPreload.ts`, `SingleCardReveal.tsx`, `BoosterExperience.tsx`. Aucun changement des tirages, des crédits ou de la base.

Vérifications exécutées : `npx tsc --noEmit` PASS ; ESLint ciblé sur ces trois composants PASS sans avertissement ; `node --import tsx --test tests/booster-presentation.test.ts` PASS (4/4) ; `git diff --check` PASS. Mesure du gain réseau en production, nouveau build et test navigateur de ce préchargement : NOT_TESTED. Les résultats de validation précédents concernent la version antérieure à cette optimisation. Les connexions lentes et le premier calcul d'une image distante par Next.js peuvent encore provoquer une attente.
