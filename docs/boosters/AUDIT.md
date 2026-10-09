# Audit ciblé avant modification — 9 octobre 2026

Branche dédiée : feature/boosters-complete, issue de maintenance/one-piece-tcg-recovery. Les fichiers .DS_Store non suivis sont conservés. Le jeu, les effets, les combats et le multijoueur sont exclus.

## Générateurs et contradictions

| Entrée | Tirage existant | Persistance/collection | Défauts |
|---|---|---|---|
| POST /api/booster/open (page active Optimized) | 12 positions, poids codés en dur, pré-remplissage puis nouveau tirage, variantes filtrées aléatoirement selon suffixe _p, God Pack 1 % | aucun enregistrement ; ajout ultérieur des IDs par le client | SetRules lu mais seuls code utilisés ; fallbacks C/UC/R, retry de rareté, doublons de secours faussent les taux ; recherche contains imprécise |
| POST /api/booster/generate | 10 positions : 4 C, 3 UC, derniers slots uniformes entre plusieurs raretés, art alternatif 10 % sur dernier slot | crée un Booster et BoosterOpening par appel ; ne crédite pas la collection | slots manquants simplement omis, règles déclarées non utilisées |
| POST /api/booster | 6 C + 3 UC + 2 R + 1 SR selon table interne ; sélection par skip aléatoire et mélange sort | crée Booster, BoosterCard et ouverture, hors transaction globale ; pas d'ajout à la collection | utilise Card.set au lieu de setCode ; variantes et SR différents de la page active ; doublons peuvent violer BoosterCard unique |

scripts/testBoosters.ts contient encore un quatrième tirage de simulation indépendant, avec règles et fallbacks distincts. scripts/simulateDrops.ts simule aussi des distributions pour analyse. Aucun test de ces scripts ne prouve l'intégrité d'une attribution réelle.

## Modèles et économie

- Booster : prix Int et lien CardSet. Deux routes créent un booster price=0 à chaque appel. initBoosters.ts propose 4.99 incompatible avec Int, sans débit utilisateur. Aucun achat, solde ou stock consommable n'est relié au parcours d'ouverture actif.
- L'économie effectivement utilisée est une simulation gratuite pour utilisateur connecté. CoinTransaction/UserInventory existent ailleurs mais aucune logique de droit d'ouverture ne les utilise. Ne pas créer de monnaie/stock/paiement.
- BoosterCard : unique boosterId/cardId, probability Float. initBoosters applique des valeurs par carte d'une même rareté ; ce ne sont pas des probabilités globales normalisées. Les routes ignorent ces valeurs.
- SetRules : code unique, rarityCounts/typeCounts sont des tailles de catalogue ; boosterRules contient des nombres par rareté et des chances altArt/parallel/special, plus typeCounts/donCount dont le sens exact n'est pas appliqué par la page active. autoConfigure génère des approximations sans source officielle.
- CardRarity.dropRate ne somme pas nécessairement à 1 dans les scripts ; ne pas le prendre pour une distribution officielle.
- BoosterOpening/BoosterOpeningCard permettent un historique mais manquent de clé d'idempotence, preuve de crédit, snapshot des règles et snapshot des cartes. Les suppressions en cascade et modifications du catalogue peuvent altérer l'histoire.
- UserCard unique userId/cardId permet un incrément atomique. Les endpoints add-to-collection, collection/add-cards et user/collection POST acceptent des IDs arbitraires valides et autorisent un rejeu sans ouverture.

## Interface

Page /booster-opening importe BoosterOpeningPageOptimized. Une seconde version non optimisée est conservée, ainsi que BoosterPack (TODO après ouverture), CardReveal, animations Rare/UltraRare/Alternative/BoosterPack et composants Header/Controls/Display/MobileActionBar/ProgressIndicator. La révélation appelle addToCollection quand la dernière carte est atteinte : animation et crédit sont couplés. Rafraîchir/interrompre peut perdre le résultat ou rejouer le crédit. Les sons sont optionnels mais des animations lourdes et temporisateurs coexistent ; reduced-motion n'est pas systématique. Pas d'historique privé accessible.

## Données disponibles sans écriture

Le dump exports/all-cards.json contient 1938 cartes avec extension textuelle (814 C, 362 UC, 355 R, 184 SR, 103 L, 26 SEC, 13 SP CARD, 2 TR, 2 SR SP, 77 P). public/cards.json contient 2250 cartes sans set/setCode/extension : ce dernier fichier ne suffit pas à certifier l'appartenance à une extension. Le catalogue PostgreSQL doit être la source du tirage, avec association exacte Card.setCode -> CardSet.code. Les codes OP01/OP-01 et équivalents EB/PRB demandent une normalisation contrôlée, jamais contains.

L'ancienne base n'est jamais modifiée. Inventaire PostgreSQL en lecture seule et résultats de test seront joints aux preuves. Les taux historiques sont des paramètres de simulateur, pas des taux officiels. Aucun mécanisme ne peut être conservé comme « officiel » sans source.

## Décisions sûres retenues

Service serveur unique, configuration explicite versionnée, extension vide/incomplète annoncée indisponible sans substitution silencieuse. Simulation gratuite conservée. Ouverture+historique+crédit dans une transaction avec clé unique par utilisateur. Les anciens chemins de tirage deviennent des alias du même service ; les anciens chemins de crédit ne doivent plus accepter de cartes choisies par le client. Historique des anciennes ouvertures conservé sans les créditer rétroactivement.

## Inventaire PostgreSQL réellement observé

Lecture effectuée dans une transaction PostgreSQL READ ONLY, sans utilisateurs, secrets ou URL de connexion dans le résultat. Voir database-inventory.json : **3033 cartes, 46 extensions, 46 SetRules, 0 Booster, 0 carte sans setCode**. Selon les pools de rareté et les règles historiques stockées : **28 extensions éligibles, 18 indisponibles**, détaillées dans catalog-availability.json. Cette disponibilité est déduite des données lues, pas d'ouvertures effectuées dans la base existante. Les données de test restent synthétiques.

Certaines extensions EB et les decks ST ne comportent pas de UC/R requis par la configuration générique existante. Cela peut refléter une règle inadaptée à une extension plutôt qu'un import incomplet. Aucune carte ni rareté n'a été inventée pour rendre ces extensions ouvrables.
