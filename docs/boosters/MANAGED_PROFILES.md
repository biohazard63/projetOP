# Gestion contrôlée des boosters — 2026-10-10

## Livré et testé

Le générateur accepte des compositions complètes pondérées, stockées dans le JSON SetRules.boosterRules existant. Aucun modèle Prisma ajouté et aucune dépendance installée. Les règles historiques restent lisibles ; les nouvelles propositions ne sont pas activées automatiquement.

1. Valider toutes les compositions avant ouverture, même une composition de très faible probabilité.
2. Choisir un profil complet par ses poids configurés, puis un numéro disponible, puis son illustration.
3. Garantir des numéros distincts, illustrations alternatives comprises, avec réservation des pools nécessaires aux autres slots.
4. Utiliser les métadonnées de variante ; aucun suffixe _pN ne certifie une alternative en mode géré.
5. Créditer côté serveur via la transaction, le verrou utilisateur et la clé d’idempotence existants ; enregistrer le profil, les poids, le générateur version 3 et drawVariant dans le reçu JSON.
6. Afficher les probabilités par booster et la catégorie de variante enregistrée. Les anciens reçus conservent leur comportement d’affichage.

Sans BoosterCard, chaque numéro d’un pool a le même poids, quel que soit son nombre d’illustrations. Avec BoosterCard, le poids du numéro est le maximum des poids de ses illustrations ; le choix d’une illustration dans ce numéro utilise ses poids relatifs. Cette convention est explicite, conservée dans les règles du reçu et testée. Les contraintes de réservation peuvent conditionner les chances par numéro ; elles ne changent pas la probabilité du profil complet validé.

La classification gérée est exclusive : spéciale (isSpecial ou rareté spéciale normalisée), puis alternative (isAltArt), puis parallèle (isParallel), puis standard. Les valeurs originales du catalogue restent inchangées. SP SR, R SP et SR SP sont reconnus comme SP CARD pour le tirage ; aucune valeur brute n’est effacée. Les flags hérités peuvent rester incorrects et exigent une revue, notamment pour PRB.

## Proposition d’équilibrage, pas des taux officiels

Onze cartes standards et un bonus. OP : 6 C + 3 UC + 2 R. EB : 8 C + 3 R ; aucune UC artificielle. PRB : proposition séparée actuellement bloquée, faute de métadonnées standards suffisantes.

| Bonus exclusif | Poids proposé par booster |
|---|---:|
| SR standard | 65 % à 66 % selon les pools présents |
| SEC standard | 10 % |
| Leader standard | 4 % |
| Bonus alternatif | 20 % |
| Carte spéciale | 0,8 % si présente |
| Treasure Rare | 0,2 % si présente |

La Treasure Rare présente est classée alternative : au total 20,2 % de profils de catégorie alternative dans ces extensions, contre 20 % sans TR. Les ALT SEC et ALT Leader sont comprises dans les 20 % alternatifs et s’ajoutent aux 10 % SEC standard / 4 % Leader standard lorsque l’on calcule les taux par rareté. Les taux par carte diffèrent des taux par booster.

Le budget alternatif est réparti entre les catégories disponibles à la préparation : poids relatifs C 1, UC 1, R 3, SR 10, L 3, SEC 2. Le nombre d’illustrations n’intervient pas. Les catégories absentes sont explicitement listées dans omittedBonusPools et les pourcentages exacts sont écrits dans la proposition. Les poids SP/TR absents vont dans la proposition SR standard. Aucune suppression ou réallocation pendant une ouverture : le JSON validé fixe tout.

Le God Pack historique reste pris en charge. Les propositions ne l’incluent pas : pour l’ajouter, configurer un profil special=true, avec une composition rare complète, son poids explicite et une validation de ses pools. Ne pas réutiliser les anciens 12 choix indépendants qui pouvaient demander trop de numéros rares identiques.

## Résultats réels

| Vérification | Résultat | Preuve |
|---|---|---|
| Tests unitaires | PASS : 67 | evidence/managed-profiles-unit.txt |
| Intégration PostgreSQL isolé | PASS : 18 | evidence/managed-profiles-integration.txt |
| Profils contre le catalogue local | PASS : 19 extensions, 9 500 simulations sans refus ni doublon | proposed-profiles.json et evidence/managed-profiles-preview.txt |
| Couverture des cartes dans ces 19 extensions | PASS : 2 804 fiches éligibles, aucune hors profil | proposed-profiles.json |
| PRB-01 | BLOCKED pour le nouveau profil : C/SR/SEC standards manquants | proposed-profiles.json |
| HTTP et Playwright | PASS : 8 contrôles, connexion, profil falsifié, concurrence, reçu privé, mobile 390×844, desktop 1440×900, erreurs JS | evidence/managed-profiles-browser.json |
| TypeScript | PASS | evidence/managed-profiles-typescript.txt |
| ESLint ciblé | PASS : 0 erreur, 7 avertissements existants dans les scripts historiques | evidence/managed-profiles-eslint.txt |
| Compilation de production finale isolée | PASS | evidence/managed-profiles-build.txt |
| Activation réelle sur Neon | NOT_TESTED / NON EFFECTUÉE : validation préalable requise | Aucune connexion de production pour ce travail |

Les tests statistiques couvrent 20 % ALT, l’indépendance au nombre d’illustrations, les poids par numéro et par illustration, et les événements à 0,8 % et 0,2 % sur 50 000 essais. Les tests transactionnels couvrent les doubles appels, rejeux, erreurs de transaction, profils impossibles, conservation de la collection et protection des profils contre l’ancien initialiseur.

Les scripts configureSetRules.ts et autoConfigureSetRules.ts respectent désormais les règles explicites, même sous un alias OP01/OP-01. Les écritures de configuration partagent un verrou PostgreSQL par code normalisé ; un initialiseur ne remplace pas un profil déclaré, même invalide. Un JSON moderne incomplet est rejeté explicitement et ne retombe jamais sur les anciens compteurs de raretés. L’ancien configurateur doit alors laisser place à une correction explicite du profil, pas à un fallback.

## Utilisation locale

Depuis cardgame/ :

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/cardgame?schema=public' npm run boosters:profiles:preview -- --runs 500
```

Cette commande lit uniquement la base et écrit docs/boosters/proposed-profiles.json : elle ne modifie aucune règle.

```bash
DATABASE_URL='postgresql://op_test:op_test_local_only@127.0.0.1:55432/op_boosters_test?schema=public' npm run boosters:profiles:apply-test
```

L’application est transactionnelle et strictement réservée à op_boosters_test. Cette base doit contenir les mêmes cartes et les SetRules correspondants ; sinon l’opération entière est annulée. L’option --file permet de tester un seul document de fixture. Le test d’intégration a réellement appliqué une fixture par cette commande et vérifié que l’ancien initialiseur ne l’écrase pas.

Les tests navigateur utilisent un serveur isolé à localhost:3011 et des comptes synthétiques. Les captures sont managed-profiles-mobile.png et managed-profiles-desktop.png dans evidence/. Le build a été effectué dans une copie temporaire, pour préserver le serveur local sur le port 3000. Le serveur de test a été arrêté après vérification.

## Activation ultérieure

Faire valider les taux détaillés du JSON. Corriger/classifier PRB-01 sans inférer les illustrations officielles à partir des seuls suffixes. Avant activation de production : sauvegarder les anciennes règles, vérifier le schéma et déployer le lecteur compatible sur autorisation, puis appliquer uniquement les règles validées. Un ancien déploiement ne sait pas lire packProfiles : ne pas appliquer les nouveaux JSON avant la mise à jour du code. Ne pas restaurer toute la base pour une modification de taux.

Ni utilisateurs, ni quantités, ni decks, ni historiques existants n’ont été modifiés dans les bases locale ou de production. Seules les fixtures isolées ont reçu des ouvertures de test. Aucun push, commit ou déploiement pour ce lot.
