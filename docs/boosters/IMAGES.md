# Correction des images — 9 octobre 2026

La base habituelle contient 3033 cartes : 1787 URL anglaises et 1246 françaises. Les 46 extensions ne possédaient pas d’image configurée ; le même paquet générique apparaissait pour toutes les extensions.

## Cartes

Les serveurs officiels renvoient `Cross-Origin-Resource-Policy: same-site`. La configuration `unoptimized: true` envoyait directement le navigateur vers ces images et provoquait `ERR_BLOCKED_BY_RESPONSE.NotSameSite` sur localhost. Correction : optimisation Next.js activée, images servies depuis la même origine. La liste autorisée est limitée aux deux domaines officiels HTTPS et au chemin `/images/**`, sans wildcard de domaine.

Chrome avant correction : 589 images présentes, 0 chargée, 36 en erreur. Après correction, dernier contrôle : 36 chargées, 0 en erreur ; les autres restent en chargement différé. Aucun téléchargement exhaustif des 3033 cartes.

## Paquets

Le catalogue utilise maintenant les illustrations officielles OP01–OP12, EB01–EB02 et PRB01 lorsque l’extension n’a pas déjà une image configurée. Codes avec tirets et espaces normalisés. Une extension inconnue conserve le visuel générique. L’animation reprend le visuel de l’extension effectivement ouverte.

Les miniatures officielles comprennent une marge beige : le composant BoosterArtwork recadre cette marge dans l’interface, avec un conteneur transparent. Les fichiers originaux et le dessin imprimé restent inchangés. Les images personnalisées et le visuel de secours conservent leur cadrage intégral. Ce cadrage correspond au gabarit carré des miniatures officielles ; la capture OP-12 a été inspectée. L’utilisateur confirme ensuite que l’affichage est correct.

Sources : [catalogue officiel](https://en.onepiece-cardgame.com/products/), [OP01](https://en.onepiece-cardgame.com/products/boosters/op01.php), [OP09](https://en.onepiece-cardgame.com/products/boosters/op09/). Voir aussi [optimisation Next.js](https://nextjs.org/docs/app/api-reference/components/image) et [CORP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cross-Origin_Resource_Policy).

## Vérifications réellement exécutées

| Contrôle | État | Preuve |
|---|---|---|
| npm test | PASS — 22 tests | /private/tmp/op-images-unit.log |
| npm run typecheck | PASS | /private/tmp/op-images-tsc.log |
| ESLint ciblé des fichiers source modifiés | PASS — aucune erreur ni avertissement | npx eslint src/lib/boosters/artwork.ts src/lib/boosters/service.ts src/components/booster-opening/BoosterArtwork.tsx src/components/booster-opening/BoosterExperience.tsx |
| Images anglaises et françaises, protection des hôtes autorisés | PASS — 4 contrôles | node tests/images.browser.mjs ; evidence/image-tests.json |
| Collection existante dans Chrome | PASS — 36 chargées, 0 cassée | evidence/collection-and-artwork-images.json |
| Sélection OP-01 → OP-09 → OP-12 | PASS — trois images distinctes chargées | evidence/collection-and-artwork-images.json |
| Disponibilité des 15 miniatures | PASS — HTTP 200, image/png | evidence/booster-artwork-inventory.json |
| Cadrage sans fond beige OP-12 | PASS — capture inspectée et retour utilisateur | evidence/booster-artwork-cropped.png |
| Toutes les cartes, tous les cadrages, Safari/iOS | NOT_TESTED | Échantillons seulement |
| Nouveau build après cette correction | NOT_TESTED | Le build précédent est documenté dans TESTS.md ; serveur de développement maintenu actif |

Aucune écriture dans les données existantes pour ces contrôles. Aucun changement de règle, probabilité, attribution, session utilisateur persistante ou dépendance. Les premières tentatives de sélection automatisée utilisaient OP01 au lieu du code réel OP-01 et ont expiré ; le scénario corrigé passe.
