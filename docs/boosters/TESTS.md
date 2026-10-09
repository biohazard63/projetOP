# Tests et preuves — 9 octobre 2026

PASS = réellement exécuté et réussi ; FAIL = exécuté et échoué ; BLOCKED = condition identifiée empêchant l'exécution ; NOT_TESTED = non exécuté. Les résultats définitifs sont consignés dans evidence/ ; les problèmes résolus durant l'itération ne sont pas présentés comme des échecs finaux.

## Environnement

macOS Apple Silicon, Node 22.22.2, Prisma 6.19.3, Google Chrome headless via Playwright, PostgreSQL 16 Docker. Base **op_boosters_test** créée séparément sur 127.0.0.1:55432 ; 17 migrations appliquées. Tests avec cartes/utilisateurs synthétiques uniquement. Garde-fou strict sur l'hôte, le port et le nom de base des scripts de seed/intégration/navigateur. La base existante a seulement fait l'objet d'un inventaire READ ONLY.

## Matrice fonctionnelle

| Fonctionnalité | État | Preuve |
|---|---|---|
| Génération unique et appartenance exacte à l'extension | PASS | boosters.test.ts + boosters.integration.ts ; 28 extensions éligibles de l'inventaire également vérifiées à partir de leurs pools de rareté |
| Répartition historique par extension 6C/3UC/2R/1SR | PASS | Tests + 1000 simulations = 6000 C / 3000 UC / 2000 R / 1000 SR |
| Probabilités de rareté et poids des cartes | PASS | 40000 tirages déterministes, écart absolu <1 point pour les taux attendus 18,75/56,25/25 % |
| Variantes explicites, zéro poids, frontières du RNG | PASS | Tests unitaires, intégration BoosterCard |
| Packs spéciaux et God Pack historique | PASS | Tests unitaires, 20000 tirages pour probabilité spéciale 10 %, frontières du God Pack 1 %, 12 slots rares |
| Extension vide/incomplète et configuration invalide | PASS | Rejet explicite testé, aucune mutation ; manque de pool spécial également bloquant |
| Utilisateur anonyme et requêtes falsifiées | PASS | 401, 400 pour cartes/utilisateur/slots/taux, JSON invalide/corps >4096 octets ; origine étrangère 403 |
| Crédit transactionnel et persistance exacte | PASS | Quantités UserCard, 12 positions, snapshot et date vérifiés en PostgreSQL et par GET collection |
| Double clic | PASS | Deux clics DOM immédiats, une seule requête et +12 cartes |
| Rejeu / appels API historiques | PASS | Trois alias, reçu identique, réponse 200, aucun crédit supplémentaire ; anciens endpoints d'ajout ne mutent rien |
| Requêtes concurrentes identiques | PASS | 10 appels service et 6 appels HTTP : une seule création, autres replays |
| Ouvertures concurrentes distinctes | PASS | 8 appels service (+96 cartes) et 4 appels HTTP (+48), aucun incrément perdu |
| Échec transactionnel | PASS | Trigger temporaire ciblant un utilisateur synthétique, rollback intégral, puis même clé réussie après retrait du trigger |
| Idempotence privée et collision d'alias | PASS | Même UUID de deux utilisateurs = deux reçus propres ; clé pour une extension exacte différente =409 |
| Historique privé et pagination | PASS | Reçus/cursors étrangers 404, pages de 20, aucune fuite ni duplication |
| Immutabilité et conservation des références | PASS | Métadonnée Card modifiée puis restaurée dans base isolée ; snapshot identique. Suppression de carte référencée rejetée par FK |
| Historique ancien sans preuve de crédit | PASS | Résultat legacy, doublons/crédit inconnus, collection inchangée |
| Droit d'ouverture payant non configuré | PASS | Booster canonique de prix non nul refusé ; aucun paiement/stock inventé |
| Révélation progressive / tout révéler / doublons | PASS | Chrome desktop ; aucune requête POST supplémentaire |
| Rafraîchissement pendant animation et reprise à 1/12 | PASS | Reçu récupéré par GET, un seul crédit |
| Réponse perdue après commit | PASS | Réponse 500 simulée après réponse serveur 201 réelle ; retry même UUID, reçu récupéré, crédit inchangé |
| Desktop/mobile, rares, détails/favoris, erreurs JS | PASS | Chrome 1440×1100 et 390×844, 12 slots, badge doublon, détails/favoris, aucune erreur JS, aucune image locale chargée cassée |
| prefers-reduced-motion | PASS | Préférence modifiée durant la session, animation du pack sautée ; animations CSS locales désactivées |
| Migration sur base existante / taux officiels / appareils physiques | BLOCKED / NOT_TESTED | Voir REMAINING_ISSUES.md ; aucune preuve inventée |

## Commandes réellement exécutées

Toutes les commandes npm/Prisma sont lancées depuis `cardgame/`. La variable DATABASE_URL était surchargée pour **op_boosters_test** lors des tests et de la migration. Les valeurs d'environnement réelles ne sont jamais consignées. Les identifiants de la base Docker de test sont des fixtures locales, pas ceux de .env.

```sh
# Création isolée, sans reset d'une base existante
docker exec op-recovery-postgres createdb -U op_test op_boosters_test
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm test
npm run test:boosters:integration
npm run test:boosters -- --set OP-TEST --runs 1000
npm run dev -- --port 3007
npm run test:boosters:browser
npm ci
npm run typecheck
npm run lint
npm run build
```

Le serveur de test est arrêté avant npm ci/build pour éviter les accès concurrents à .next. Les tests de navigateur ont été répétés après correction du mouvement réduit et ajout des contrôles de corps JSON. Le test global de maintenance n'a pas été exécuté (scénarios de jeu exclus).

Incidents d'exécution : appels npm lancés par erreur à la racine ont échoué ENOENT et ont été relancés dans cardgame ; aucun résultat valide ne repose sur ces appels. Un redémarrage du serveur de développement a résolu un 404 HMR temporaire sur auth/csrf. Le premier scénario reduced-motion a échoué, puis a été corrigé par une lecture de matchMedia au retour serveur ; toutes les assertions finales passent.

## Rejouer sans toucher à la base existante

Configurer DATABASE_URL vers op_boosters_test dans le shell de test, sans réécrire .env. Puis :

```sh
cd cardgame
npm ci
npx prisma migrate deploy
npx tsx tests/seed-boosters.ts
npm test
npm run test:boosters:integration
# terminal serveur : secrets de session de test + URLs locales + CAPTCHA_PROVIDER vide
npm run dev -- --port 3007
# second terminal, même DATABASE_URL isolée
npm run test:boosters:browser
```

Le script navigateur suppose Chrome macOS au chemin `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` et le serveur localhost:3007 ; il crée des utilisateurs synthétiques avec mots de passe de test, pas des comptes réels. Les tests ne suppriment pas leurs données ; le trigger d'échec est retiré dans finally. Ne pas exécuter ces tests en parallèle avec une seconde instance du même scénario de trigger.

## Validation définitive après réinstallation

| Contrôle | Résultat | Preuve |
|---|---|---|
| npm ci | PASS — 548 paquets installés | evidence/install-summary.txt |
| Prisma validate / génération | PASS | evidence/prisma-validate.txt + postinstall npm ci |
| TypeScript | PASS — aucune erreur | evidence/typecheck.txt |
| ESLint | PASS — 0 erreur, 109 avertissements legacy | evidence/lint-summary.txt ; aucun avertissement dans BoosterExperience/service/generator/http |
| Tests unitaires | PASS — 21/21, dont 12 spécifiques aux boosters | evidence/unit-tests.txt |
| Tests PostgreSQL | PASS — 11/11 | evidence/integration-tests.txt |
| API/navigateur | PASS — 14/14 | evidence/browser-results.json + desktop.png + mobile.png |
| Compilation production | PASS | evidence/build.txt |
| Démarrage du build production et routes | PASS — 5 contrôles HTTP locaux | evidence/production-smoke.json ; npm run start -- --port 3007 |
| Diagnostic du générateur unifié | PASS — 1000 packs, 12000 cartes synthétiques | evidence/simulation.txt |
| Initialiseur en aperçu | PASS — aucune écriture, extensions incompatibles ignorées explicitement | npx tsx scripts/initBoosters.ts, sortie vérifiée |

Échecs finaux : **0** dans les suites exécutées. La compilation de l'ensemble de l'application ne constitue pas un test fonctionnel des modules exclus. Les 12 vulnérabilités high signalées par npm ci concernent les dépendances déjà documentées dans la maintenance ; aucun audit fix --force exécuté et aucune dépendance changée pendant cette phase.

## Ajustement de visibilité du bouton après retour utilisateur

Le bouton « Ouvrir le booster » est remonté juste sous le sélecteur d'extension, avant l'illustration. Dans la base locale de démonstration, OP-TEST (« Trésors de test ») est sélectionné par défaut lorsqu'il est disponible ; les extensions sans ce code conservent leur sélection habituelle. Le bouton existait auparavant sous l'image et pouvait nécessiter de défiler sur mobile ; la page exacte du signalement n'a pas été confirmée.

Validation : TypeScript PASS, ESLint ciblé PASS sans avertissement, 14 scénarios API/navigateur PASS rejoués. Les captures et browser-results.json sont actualisés. Le serveur reste ouvert dans le Terminal séparé demandé par l'utilisateur. La preuve du build de production ci-dessus concerne la validation précédente ; le build n'a pas été relancé pour ce déplacement d'interface pendant le serveur de développement.

## Régression de défilement reproduite et corrigée

Signalement utilisateur : impossible de descendre pour voir les cartes. Le layout de /booster-opening associait `overflow-hidden` et `overscroll-none`, créant un conteneur qui interceptait le défilement naturel au lieu de le transmettre au document. Les anciens tests déplaçaient la page par scrollTo ou par l'autoscroll de Playwright ; ils ne vérifiaient pas la molette réelle.

- Avant correction : nouveau test `page.mouse.wheel` **FAIL**, document immobile malgré un contenu dépassant la fenêtre. Preuve : evidence/scroll-before.txt.
- Correction : `overflow-x-clip` pour éviter le débordement latéral sans créer ce conteneur ; suppression de `overscroll-none` ; fond décoratif `pointer-events-none`.
- Après correction : molette desktop **PASS**, geste tactile mobile via Chrome DevTools Protocol **PASS**, ensemble des **16 scénarios API/navigateur PASS**. TypeScript et ESLint ciblé PASS. Les preuves navigateur et captures sont actualisées.

Le serveur de développement dans le Terminal séparé reste actif ; un rafraîchissement charge le layout corrigé. Aucun changement de tirage, crédit, collection ou base existante.

## Reconnexion ultérieure à la base habituelle — PASS

À la demande explicite de l'utilisateur, base locale existante sauvegardée puis migration des boosters appliquée. L'historique de migration était complet et le diff limité au changement prévu. Vérification des 30 tables : données inchangées. Application relancée dans le Terminal séparé sur la base issue de .env ; contrôles HTTP authentifiés en lecture seule PASS, catalogue de 46 extensions et collection existante de 589 cartes distinctes correctement chargée. Aucune ouverture, création de compte ni donnée de test ajoutée à cette base. Voir RECONNECTION.md et evidence/database-reconnection.json / reconnection-http.json / reconnection-collection.json. Le blocage initial de migration est donc résolu.

## Correction des images et illustrations par extension

22 tests unitaires PASS, TypeScript PASS, ESLint ciblé PASS. Quatre contrôles de proxy/image Chrome PASS ; collection réelle vérifiée en lecture seule : 36 images chargées et aucune cassée. Sélection OP-01, OP-09, OP-12 : visuels distincts chargés PASS. Cadrage du paquet sans marge beige inspecté et confirmé par l’utilisateur. Voir IMAGES.md pour les sources, commandes et limites. Aucun nouveau build exécuté après ce changement.
