# Taux observés — 2026-10-10

Simulation locale, générateur version 2 sans répétition de numéro. 2 000 tentatives par extension, graine 20261010. Aucune attribution ni écriture dans PostgreSQL. Pourcentages calculés sur les ouvertures réussies. Ce sont des taux internes de simulation, jamais des taux officiels ni une mesure du site déployé.

36 000 tentatives : 35 938 résultats, 62 compositions impossibles bloquées sans crédit. Les refus conditionnent la distribution observée. Une proportion observée n’est pas une probabilité exacte ; fluctuations d’échantillonnage possibles.

## Raretés : proportion parmi les cartes obtenues

| Extension | C | UC | R | SR | L | SEC | SP CARD | TR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| OP-01 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-02 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-03 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-04 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-05 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-06 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-07 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-08 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-09 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-10 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-11 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-12 | 50,00 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % | 0,00 % |
| OP-13 | 41,37 % | 15,06 % | 21,11 % | 12,41 % | 5,47 % | 2,65 % | 1,19 % | 0,75 % |
| OP-16 | 41,46 % | 14,94 % | 20,86 % | 12,51 % | 5,58 % | 2,55 % | 1,31 % | 0,79 % |
| OP-17 | 41,39 % | 14,88 % | 21,19 % | 12,25 % | 5,71 % | 2,41 % | 1,35 % | 0,82 % |
| OP14-EB04 | 41,29 % | 14,86 % | 21,20 % | 12,45 % | 5,52 % | 2,58 % | 1,29 % | 0,81 % |
| OP15-EB04 | 41,16 % | 14,75 % | 20,90 % | 12,70 % | 5,76 % | 2,50 % | 1,38 % | 0,85 % |
| PRB-01 | 33,33 % | 16,67 % | 25,00 % | 16,67 % | 8,33 % | 0,00 % | 0,00 % | 0,00 % |

## Alternatives reconnues par le générateur

Définition : isAltArt ou suffixe _pN de l’identifiant, comme matchesChoice(variant=alt). Cette heuristique ne certifie pas la nature officielle d’une illustration et peut inclure des réimpressions mal étiquetées. Une ALT conserve sa rareté : les pourcentages ALT ne s’ajoutent pas aux proportions de rareté ci-dessus.

| Extension | ALT parmi les cartes | Au moins une ALT par booster | Refus / 2 000 |
|---|---:|---:|---:|
| OP-01 | 10,15 % | 74,50 % | 0 |
| OP-02 | 9,58 % | 74,50 % | 0 |
| OP-03 | 6,56 % | 62,60 % | 0 |
| OP-04 | 5,87 % | 56,85 % | 0 |
| OP-05 | 5,02 % | 51,50 % | 0 |
| OP-06 | 5,48 % | 53,15 % | 0 |
| OP-07 | 6,71 % | 63,00 % | 0 |
| OP-08 | 6,70 % | 63,25 % | 0 |
| OP-09 | 7,96 % | 71,15 % | 0 |
| OP-10 | 8,03 % | 71,25 % | 0 |
| OP-11 | 8,46 % | 73,05 % | 0 |
| OP-12 | 8,12 % | 70,95 % | 0 |
| OP-13 | 21,46 % | 96,88 % | 14 |
| OP-16 | 18,44 % | 95,21 % | 16 |
| OP-17 | 22,23 % | 97,23 % | 14 |
| OP14-EB04 | 17,40 % | 92,82 % | 8 |
| OP15-EB04 | 18,10 % | 94,92 % | 10 |
| PRB-01 | 94,08 % | 100,00 % | 0 |

Les anciens altArtChance/parallelChance/specialChance et CardRarity.dropRate ne pilotent pas le générateur actuel. Les alternatives sont mélangées aux cartes standards des pools éligibles. Le God Pack est configuré à 1 % sur OP-13, OP-16, OP-17, OP14-EB04 et OP15-EB04 ; ce taux est un réglage de simulation et les compositions impossibles restent bloquées. EB-01 et EB-02 ne sont pas simulés car leurs règles demandent un pool UC absent.

Preuve complète : evidence/drop-rates-simulation.json (inclut aussi les chances observées d’au moins une carte de chaque rareté par booster).
