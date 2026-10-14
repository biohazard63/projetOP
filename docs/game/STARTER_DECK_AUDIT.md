# Audit des Starter Decks ST-01 à ST-36

Audit du 14 octobre 2026. Branche `feature/tcg-m5`. Consultation Bandai EN/FR/JP, tableaux de quantités explicites et lecture Prisma en transaction `READ ONLY`. Aucun import, suppression, migration, commit, push ou déploiement.

Résultat de la simulation : **23 VERIFIED, 2 PARTIAL, 11 BLOCKED**. 33 compositions documentées sans conflit de source restant; 35 listes candidates dans le script. ST-36 n’est pas ajouté faute de quantités par carte vérifiables.

Prisma : 4074 lignes de cartes lues le 2026-10-14T07:41:12.227Z. Identités et variantes conservées. 375/559 entrées du script utilisent un nom FR officiel disponible (comptage par entrée de produit, pas par numéro unique). Impressions choisies dans les correspondances résolues : {'EN': 236, 'FR': 286}. Les sources et images FR sont privilégiées lorsque l’impression du produit est identifiable.

## Portée des statuts

- **VERIFIED** : composition commerciale sourcée, tous les numéros et types résolus dans Prisma, 50 cartes principales, tous les Leaders du produit conservés et 10 DON!! attestés séparément.
- **PARTIAL** : source contradictoire ou insuffisamment corroborée; référence candidate uniquement, aucun import autorisé.
- **BLOCKED** : absence de quantité fiable, carte manquante en base ou divergence de caractéristiques/texte encore non résolue.
- `VERIFIED` ne signifie ni `PLAYABLE_VERIFIED` du moteur, ni légalité dans un tournoi daté. La légalité contrôlée ici est **structurelle** (50 cartes, un Leader choisi, couleurs, maximum 4 par numéro, DON!! séparés). Restrictions de tournoi et couverture des effets : **NOT_TESTED**.

## Sources et méthode

Bandai confirme les noms, numéros, types, versions localisées et contenus commerciaux. Les quantités unitaires proviennent des tableaux Tier One (JP), confrontés aux cardlists Bandai EN/JP et, lorsque nécessaire, à une seconde source. Il ne s’agit pas de quantités publiées directement par Bandai pour chacun des 36 produits. Les ensembles EN/JP doivent correspondre; les coquilles et les divergences restent explicitement enregistrées.

Les tableaux secondaires comportent plusieurs erreurs réelles. Aucun simple total de 51 ne suffit : contrôle de chaque numéro, chaque quantité publiée, Leaders, type et cartes rééditées. ST-08 est corroboré par PokémonDeal; le Leader ST-12 par Donken. Aucun stock marchand, prix, playset vendu ou deck de tournoi n’est utilisé comme quantité commerciale.

Les preuves `ST-xx.json` conservent URL, date, SHA-256 des réponses et données structurées. Les textes officiels des variantes sont comparés par empreintes EN/FR; une différence de traduction ne devient une équivalence qu’après comparaison aux références officielles. Les JSON de `carteJson/` et les lignes Prisma ne sont pas modifiés.

## Lot ST-01 à ST-09

| ST | Statut | Principales | Leaders fournis | DON!! | Source produit Bandai | Quantités |
|---|---|---:|---:|---:|---|---|
| ST-01 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st01-04.php) | [table](https://tier-one-onepiece.jp/blog/st01-cardlists/) |
| ST-02 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st01-04.php) | [table](https://tier-one-onepiece.jp/blog/st02-cardlists/) |
| ST-03 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st01-04.php) | [table](https://tier-one-onepiece.jp/blog/st03-cardlists/) |
| ST-04 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st01-04.php) | [table](https://tier-one-onepiece.jp/blog/st04-cardlists/) |
| ST-05 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st05.php) | [table](https://tier-one-onepiece.jp/blog/st05-cardlists/) |
| ST-06 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st06.php) | [table](https://tier-one-onepiece.jp/blog/st06-cardlists/) |
| ST-07 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st07.php) | [table](https://tier-one-onepiece.jp/blog/st07-cardlists/) |
| ST-08 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st08.php) | [table](https://tier-one-onepiece.jp/blog/st08-cardlists/) |
| ST-09 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st09.php) | [table](https://tier-one-onepiece.jp/blog/st09-cardlists/) |

## Lot ST-10 à ST-18

| ST | Statut | Principales | Leaders fournis | DON!! | Source produit Bandai | Quantités |
|---|---|---:|---:|---:|---|---|
| ST-10 | VERIFIED | 50 | 3 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st10.php) | [table](https://tier-one-onepiece.jp/blog/st10-cardlists/) |
| ST-11 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st11.php) | [table](https://tier-one-onepiece.jp/blog/st11_cardlists/) |
| ST-12 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st12.php) | [table](https://tier-one-onepiece.jp/blog/st12_cardlists/) |
| ST-13 | VERIFIED | 50 | 3 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st13.php) | [table](https://tier-one-onepiece.jp/blog/st13_cardlists/) |
| ST-14 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st14.php) | [table](https://tier-one-onepiece.jp/blog/st14_cardlists/) |
| ST-15 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st15_cardlists/) |
| ST-16 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st16_cardlists/) |
| ST-17 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st17_cardlists/) |
| ST-18 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st18_cardlists/) |

## Lot ST-19 à ST-27

| ST | Statut | Principales | Leaders fournis | DON!! | Source produit Bandai | Quantités |
|---|---|---:|---:|---:|---|---|
| ST-19 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st19_cardlists/) |
| ST-20 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st15-20.php) | [table](https://tier-one-onepiece.jp/blog/st20_cardlists/) |
| ST-21 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st21.php) | [table](https://tier-one-onepiece.jp/blog/st21_cardlists/) |
| ST-22 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st22.php) | [table](https://tier-one-onepiece.jp/blog/st22-cardlists/) |
| ST-23 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st23.php) | [table](https://tier-one-onepiece.jp/blog/st23_cardlists/) |
| ST-24 | PARTIAL | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st24.php) | [table](https://tier-one-onepiece.jp/blog/st24_cardlists/) |
| ST-25 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st25.php) | [table](https://tier-one-onepiece.jp/blog/st25_cardlists/) |
| ST-26 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st26.php) | [table](https://tier-one-onepiece.jp/blog/st26_cardlists/) |
| ST-27 | PARTIAL | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st27.php) | [table](https://tier-one-onepiece.jp/blog/st27_cardlists/) |

## Lot ST-28 à ST-36

| ST | Statut | Principales | Leaders fournis | DON!! | Source produit Bandai | Quantités |
|---|---|---:|---:|---:|---|---|
| ST-28 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st28.php) | [table](https://tier-one-onepiece.jp/blog/st28_cardlists/) |
| ST-29 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/decks/st29.php) | [table](https://tier-one-onepiece.jp/blog/st29-card-list/) |
| ST-30 | VERIFIED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st30.html) | [table](https://tier-one-onepiece.jp/blog/st30-card-list/) |
| ST-31 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st31.html) | [table](https://tier-one-onepiece.jp/blog/st31-card-list/) |
| ST-32 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st32.html) | [table](https://tier-one-onepiece.jp/blog/st32-card-list/) |
| ST-33 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st33.html) | [table](https://tier-one-onepiece.jp/blog/st33-card-list/) |
| ST-34 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st34.html) | [table](https://tier-one-onepiece.jp/blog/st34-card-list/) |
| ST-35 | BLOCKED | 50 | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st35.html) | [table](https://tier-one-onepiece.jp/blog/st35-card-list/) |
| ST-36 | BLOCKED | non vérifié | 1 | 10 | [Bandai](https://en.onepiece-cardgame.com/products/st36.html) | non trouvées |

## ST-01 — Straw Hat Crew

Statut : **VERIFIED**. Leaders : ST01-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569001) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550001) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST01)

Quantités : [source](https://tier-one-onepiece.jp/blog/st01-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-02 — Worst Generation

Statut : **VERIFIED**. Leaders : ST02-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569002) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550002) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST02)

Quantités : [source](https://tier-one-onepiece.jp/blog/st02-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-03 — The Seven Warlords of the Sea

Statut : **VERIFIED**. Leaders : ST03-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569003) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550003) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST03)

Quantités : [source](https://tier-one-onepiece.jp/blog/st03-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-04 — Animal Kingdom Pirates

Statut : **VERIFIED**. Leaders : ST04-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569004) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550004) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST04)

Quantités : [source](https://tier-one-onepiece.jp/blog/st04-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-05 — ONE PIECE FILM edition

Statut : **VERIFIED**. Leaders : ST05-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569005) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550005) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST05)

Quantités : [source](https://tier-one-onepiece.jp/blog/st05-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-06 — Absolute Justice

Statut : **VERIFIED**. Leaders : ST06-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569006) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550006) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST06)

Quantités : [source](https://tier-one-onepiece.jp/blog/st06-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-07 — Big Mom Pirates

Statut : **VERIFIED**. Leaders : ST07-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569007) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550007) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST07)

Quantités : [source](https://tier-one-onepiece.jp/blog/st07-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-08 — Monkey D. Luffy

Statut : **VERIFIED**. Leaders : ST08-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569008) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550008) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST08)

Quantités : [source](https://tier-one-onepiece.jp/blog/st08-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-09 — Yamato

Statut : **VERIFIED**. Leaders : ST09-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569009) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550009) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST09)

Quantités : [source](https://tier-one-onepiece.jp/blog/st09-cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-10 — The Three Captains

Statut : **VERIFIED**. Leaders : ST10-001, ST10-002, ST10-003. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569010) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550010) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST10)

Quantités : [source](https://tier-one-onepiece.jp/blog/st10-cardlists/).
Contenu supplémentaire : 2 additional selectable Leaders (included in cards, not duplicated as main cards). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP01-016, OP01-025.

Réserves : aucune pour la composition et la résolution de base.

## ST-11 — Uta

Statut : **VERIFIED**. Leaders : ST11-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569011) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550011) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST11)

Quantités : [source](https://tier-one-onepiece.jp/blog/st11_cardlists/).
Rééditions : OP02-028, OP02-033, OP02-034, OP02-035, OP02-037, OP02-039, OP02-040, OP02-041, OP02-043, OP02-045.

Réserves : aucune pour la composition et la résolution de base.

## ST-12 — Zoro and Sanji

Statut : **VERIFIED**. Leaders : ST12-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569012) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550012) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST12)

Quantités : [source](https://tier-one-onepiece.jp/blog/st12_cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-13 — The Three Brothers

Statut : **VERIFIED**. Leaders : ST13-001, ST13-002, ST13-003. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569013) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550013) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST13)

Quantités : [source](https://tier-one-onepiece.jp/blog/st13_cardlists/).
Contenu supplémentaire : 2 additional selectable Leaders (included in cards, not duplicated as main cards); Bonus Pack x1 (3 cards, 16 types in total). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-14 — 3D2Y

Statut : **VERIFIED**. Leaders : ST14-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569014) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550014) · [Réimpressions FR disponibles](https://fr.onepiece-cardgame.com/cardlist/?search=true&freewords=ST14)

Quantités : [source](https://tier-one-onepiece.jp/blog/st14_cardlists/).
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-15 — Red Edward.Newgate

Statut : **BLOCKED**. Leaders : OP02-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569015) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550015) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622015)

Quantités : [source](https://tier-one-onepiece.jp/blog/st15_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP02-001, OP02-008, OP02-018, OP02-019, OP03-003, OP03-006, OP03-007, OP03-009, OP03-010, OP02-023.

Réserves : OFFICIAL_CHARACTERISTIC_MISMATCH:OP03-009

## ST-16 — Green Uta

Statut : **BLOCKED**. Leaders : ST11-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569016) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550016) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622016)

Quantités : [source](https://tier-one-onepiece.jp/blog/st16_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : ST11-001, P-029, P-061, ST11-003, ST11-004, ST11-005, P-057, P-058, P-059, P-060.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:ST16-004

## ST-17 — Blue Donquixote Doflamingo

Statut : **VERIFIED**. Leaders : OP01-060. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569017) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550017) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622017)

Quantités : [source](https://tier-one-onepiece.jp/blog/st17_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP01-060, OP01-073, OP02-054, OP02-057, ST03-002, ST03-004, ST03-005, ST03-008, P-030, OP01-086.

Réserves : aucune pour la composition et la résolution de base.

## ST-18 — Purple Monkey.D.Luffy

Statut : **BLOCKED**. Leaders : OP05-060. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569018) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550018) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622018)

Quantités : [source](https://tier-one-onepiece.jp/blog/st18_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP05-060, OP05-061, OP05-063, OP05-066, OP05-067, OP05-068, OP05-070, OP05-072, P-041, OP05-076.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:ST18-005

## ST-19 — Black Smoker

Statut : **VERIFIED**. Leaders : OP02-093. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569019) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550019) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622019)

Quantités : [source](https://tier-one-onepiece.jp/blog/st19_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP02-093, OP02-098, OP02-106, OP02-108, OP02-109, OP02-113, OP02-116, OP03-079, OP03-089, OP02-117.

Réserves : aucune pour la composition et la résolution de base.

## ST-20 — Yellow Charlotte Katakuri

Statut : **VERIFIED**. Leaders : OP03-099. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569020) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550020) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622020)

Quantités : [source](https://tier-one-onepiece.jp/blog/st20_cardlists/).
Contenu supplémentaire : PREMIUM BOOSTER –ONE PIECE CARD THE BEST- x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP03-099, OP03-106, OP03-107, OP03-110, OP03-112, OP03-115, ST07-005, ST07-014, OP03-118, OP03-121.

Réserves : aucune pour la composition et la résolution de base.

## ST-21 — GEAR5

Statut : **VERIFIED**. Leaders : ST21-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569021) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550021) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622021)

Quantités : [source](https://tier-one-onepiece.jp/blog/st21_cardlists/).
Contenu supplémentaire : Bonus Pack x 1 (3 cards, 15 types in total). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-22 — Ace & Newgate

Statut : **BLOCKED**. Leaders : ST22-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569022) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550022) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622022)

Quantités : [source](https://tier-one-onepiece.jp/blog/st22-cardlists/).
Contenu supplémentaire : Bonus Pack x 1 (3 cards, 14 types in total). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : NUMBER_NOT_FOUND:ST22-001; NUMBER_NOT_FOUND:ST22-002; NUMBER_NOT_FOUND:ST22-003; NUMBER_NOT_FOUND:ST22-004; NUMBER_NOT_FOUND:ST22-005; NUMBER_NOT_FOUND:ST22-006; NUMBER_NOT_FOUND:ST22-007; NUMBER_NOT_FOUND:ST22-008; NUMBER_NOT_FOUND:ST22-009; NUMBER_NOT_FOUND:ST22-010; NUMBER_NOT_FOUND:ST22-011; NUMBER_NOT_FOUND:ST22-012; NUMBER_NOT_FOUND:ST22-013; NUMBER_NOT_FOUND:ST22-014; NUMBER_NOT_FOUND:ST22-015; NUMBER_NOT_FOUND:ST22-016; NUMBER_NOT_FOUND:ST22-017

## ST-23 — RED Shanks

Statut : **BLOCKED**. Leaders : OP09-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569023) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550023) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622023)

Quantités : [source](https://tier-one-onepiece.jp/blog/st23_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP09-001, OP09-006, OP09-010, OP09-011, OP09-012, OP09-013, OP09-014, OP09-015, OP09-016, OP09-020.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP09-013

## ST-24 — GREEN Jewelry Bonney

Statut : **PARTIAL**. Leaders : OP07-019. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569024) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550024) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622024)

Quantités : [source](https://tier-one-onepiece.jp/blog/st24_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP07-019, EB01-015, OP07-021, OP07-023, OP07-025, OP07-031, OP07-033, OP07-034, OP07-036, OP07-037.

Réserves : SOURCE_NUMBER_NAME_CONFLICT_DIFFERENT_QUANTITIES; COMPOSITION_UNVERIFIED

## ST-25 — BLUE Buggy

Statut : **VERIFIED**. Leaders : OP09-042. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569025) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550025) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622025)

Quantités : [source](https://tier-one-onepiece.jp/blog/st25_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP09-042, OP09-043, OP09-045, OP09-051, OP09-053, OP09-054, OP09-055, OP09-056, P-084, OP09-057.

Réserves : aucune pour la composition et la résolution de base.

## ST-26 — PURPLE/BLACK Monkey.D.Luffy

Statut : **VERIFIED**. Leaders : OP09-061. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569026) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550026) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622026)

Quantités : [source](https://tier-one-onepiece.jp/blog/st26_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP09-061, OP05-065, OP05-066, OP05-070, OP09-063, OP09-070, OP09-076, ST14-010, OP09-077, OP09-078.

Réserves : aucune pour la composition et la résolution de base.

## ST-27 — BLACK Marshall.D.Teach

Statut : **PARTIAL**. Leaders : OP09-081. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569027) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550027) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622027)

Quantités : [source](https://tier-one-onepiece.jp/blog/st27_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP09-081, OP09-083, OP10-084, OP09-086, OP09-088, OP09-089, OP09-090, OP09-091, OP09-095, OP09-099.

Réserves : SOURCE_SANJUAN_NUMBER_TYPO_NEEDS_QUANTITY_CORROBORATION; COMPOSITION_UNVERIFIED

## ST-28 — GREEN/YELLOW Yamato

Statut : **VERIFIED**. Leaders : OP06-022. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569028) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550028) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622028)

Quantités : [source](https://tier-one-onepiece.jp/blog/st28_cardlists/).
Contenu supplémentaire : BOOSTER PACK -A FIST OF DIVINE SPEED- [OP-11] x 1. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP06-022, OP06-100, OP06-103, OP06-104, OP06-109, OP06-110, OP06-112, OP09-035, ST13-016, OP07-116.

Réserves : aucune pour la composition et la résolution de base.

## ST-29 — Egghead

Statut : **VERIFIED**. Leaders : ST29-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569029) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550029) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622029)

Quantités : [source](https://tier-one-onepiece.jp/blog/st29-card-list/).
Contenu supplémentaire : Bonus Pack x 1 (3 cards, 14 types in total). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-30 — Luffy & Ace

Statut : **VERIFIED**. Leaders : ST30-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569030) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550030) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622030)

Quantités : [source](https://tier-one-onepiece.jp/blog/st30-card-list/).
Contenu supplémentaire : Bonus Pack x 1 (3 cards, 17 types in total). Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : aucune pour la composition et la résolution de base.

## ST-31 — RED Monkey.D.Luffy

Statut : **BLOCKED**. Leaders : ST21-001. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569031) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550031) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622031)

Quantités : [source](https://tier-one-onepiece.jp/blog/st31-card-list/).
Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : ST21-001, OP01-016, OP11-003, OP11-009, OP11-012, OP14-015, ST23-004, P-101, OP04-016, OP13-021.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-003; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-009; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-012; OFFICIAL_CHARACTERISTIC_MISMATCH:OP04-016

## ST-32 — GREEN Roronoa Zoro

Statut : **BLOCKED**. Leaders : OP12-020. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569032) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550032) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622032)

Quantités : [source](https://tier-one-onepiece.jp/blog/st32-card-list/).
Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP12-020, OP10-036, OP12-023, OP12-026, OP12-027, OP12-028, OP12-031, OP15-036, ST24-005, OP12-039.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP12-039

## ST-33 — BLUE Kuzan

Statut : **BLOCKED**. Leaders : OP12-040. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569033) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550033) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622033)

Quantités : [source](https://tier-one-onepiece.jp/blog/st33-card-list/).
Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP12-040, EB04-026, OP12-043, OP12-045, OP12-046, OP12-047, OP12-050, OP12-052, EB04-028, OP12-057.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP12-043; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP12-057

## ST-34 — PURPLE Charlotte Katakuri

Statut : **BLOCKED**. Leaders : OP11-062. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569034) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550034) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622034)

Quantités : [source](https://tier-one-onepiece.jp/blog/st34-card-list/).
Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP11-062, EB03-032, EB03-035, OP11-065, OP11-066, OP11-068, OP11-071, P-090, OP11-079, OP11-081.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-062; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-065; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-066; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-068; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-071; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-079; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP11-081

## ST-35 — RED/BLACK Sabo

Statut : **BLOCKED**. Leaders : OP13-004. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569035) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550035) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622035)

Quantités : [source](https://tier-one-onepiece.jp/blog/st35-card-list/).
Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : OP13-004, OP12-090, OP12-093, OP13-005, OP13-008, OP13-017, OP13-081, P-105, OP12-098, OP13-019.

Réserves : EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP12-093; EFFECT_CONFLICT_OR_UNREVIEWED_TRANSLATION:OP12-098

## ST-36 — YELLOW Eustass Captain Kid

Statut : **BLOCKED**. Leaders : OP10-099. Nombre de DON!! : 10, hors cartes principales.

[Cardlist EN](https://en.onepiece-cardgame.com/cardlist/?series=569036) · [Cardlist JP](https://www.onepiece-cardgame.com/cardlist/?series=550036) · [Cardlist FR](https://fr.onepiece-cardgame.com/cardlist/?series=622036)

Contenu supplémentaire : BOOSTER PACK -THE TIME OF BATTLE- [OP-16]. Les boosters/bonus aléatoires sont conservés comme métadonnées; leurs cartes ne sont pas inventées ni ajoutées au deck fixe.
Rééditions : aucune identifiée dans la liste fixe disponible.

Réserves : MAIN_COUNT_NOT_50; NO_PUBLISHED_PER_CARD_QUANTITIES; OFFICIAL_CARDSET_NOT_FULLY_COVERED:OP10-099,OP10-101,OP10-103,OP10-109,OP10-111,OP10-114,OP12-113,OP13-116,P-085,P-088,ST36-001,ST36-002,ST36-003,ST36-004,ST36-005

## Commandes sûres

Depuis `cardgame/` :

```bash
node --import tsx scripts/rebuildStarterDecks.ts --dry-run --catalog ../docs/game/evidence/starter-audit-2026-10-14/prisma-cards-readonly.json --report /private/tmp/starter-audit.json
node --import tsx scripts/rebuildStarterDecks.ts --dry-run --prisma --report /private/tmp/starter-audit-live.json
node --import tsx --test tests/starter-deck-audit.test.ts
npm test
npm run typecheck
npm run lint
```

La première commande utilise le snapshot réellement lu, sans connexion. La seconde est implémentée pour une lecture Prisma `READ ONLY`; elle n’a pas été exécutée sous cette forme finale (la transaction de lecture équivalente a été exécutée pour le snapshot). Exit 0 : tous VERIFIED; exit 2 : simulation terminée avec réserves; exit 1 : erreur technique ou option interdite. Aucune option d’écriture n’existe.

## Compatibilité avec le projet

Le moteur, ses règles et les manifests runtime `/play` restent inchangés. Le manifeste historique `src/game/cards/starter-compositions.json` reste **une photographie ancienne**, notamment avec les substitutions OP de ST-03. Ses tests historiques passent mais ne prouvent pas une composition officielle. L’extracteur par noms est désormais bloqué devant le nouveau format plutôt que d’écraser ce manifeste par une liste vide ou substituée. La propagation vers `/play` et un éventuel import sont des travaux distincts nécessitant sauvegarde, revue des certifications moteur et autorisation.

## Vérifications

État exact et journaux : voir `evidence/starter-audit-2026-10-14/validation-summary.json` (rempli après achèvement des commandes). Le build utilise une copie isolée; aucune modification du `.next` du serveur local.

Résultats finaux réellement exécutés : **59/59 ciblés**, **615/615 globaux** (556 historiques + 59 nouveaux), TypeScript PASS, ESLint ciblé PASS, lint global 0 erreur / 99 avertissements préexistants, build `vercel-build` isolé PASS. Premier essai bloqué par le DNS des Google Fonts, reprise réseau réussie. Empreintes des 414 preuves historiques inchangées. Aucun test de tournoi ou partie bot avec ces nouveaux manifests n’est revendiqué.
