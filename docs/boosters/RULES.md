# Règles de tirage

Ce produit conserve une **simulation gratuite**, pas un achat ou une reproduction certifiée d'un booster physique. Aucun taux n'est présenté comme officiel. Les données sources sont le catalogue PostgreSQL et `SetRules.boosterRules` ; les dumps JSON ne servent pas de fallback.

## Priorité et appartenance

Règle SetRules avec code exact, puis code normalisé (OP01/OP-01). Sinon profil historique du simulateur explicitement annoncé. Une règle invalide ne passe jamais à un autre profil. Chaque carte doit porter exactement le `CardSet.code` résolu dans `Card.setCode`. Aucune recherche contains ni utilisation de Card.set comme preuve d'appartenance.

Tous les pools positifs de tous les slots normaux **et spéciaux** doivent exister avant d'ouvrir. Un pool vide, extension vide, poids invalides ou carte étrangère bloque avec 422. Les probabilités ne sont jamais renormalisées en supprimant une rareté absente. Les poids valides sont en revanche normalisés **dans leur distribution configurée**, ce qui permet des poids 3:1.

Tirage avec remise : les probabilités restent constantes d'un slot à l'autre et une carte peut apparaître plusieurs fois. Les occurrences sont créditées et leurs doublons affichés. Ce choix rend explicite un comportement déjà possible avec les anciens fallbacks ; il ne prétend pas reproduire la collation physique.

## Format version 1

Configuration administrée dans SetRules, jamais depuis une requête client. Exemple **synthétique**, non officiel :

```json
{
  "version": 1,
  "label": "Simulation de démonstration",
  "source": "Configuration interne, non officielle",
  "slots": [
    {"label": "Commune", "choices": [{"rarity": "C", "weight": 1, "variant": "standard"}]},
    {"label": "Dernier slot", "choices": [{"rarity": "R", "weight": 3, "variant": "any"}, {"rarity": "SR", "weight": 1, "variant": "any"}]}
  ],
  "specialPacks": []
}
```

Poids strictement positifs pour chaque choix, de 1 à 30 slots, 1 à 20 choix par slot. Variantes : `any` (défaut), `standard`, `alt`, `parallel`, `special`. `standard` exclut les variantes ; art alternatif reconnu via flag existant ou suffixe `_pN`. Un choix `*` permet un pool toutes raretés explicitement configuré. U normalisé en UC ; SP/SPCARD/SR SP en SP CARD. Le choix de variante est une condition de pool, pas un second tirage caché.

`specialPacks` : jusqu'à 10 profils `{label,probability,slots}`. Leur somme doit être ≤1, et le nombre de slots identique au pack normal. Ils sont mutuellement exclusifs ; le résidu sélectionne le pack normal. Ils remplacent **tous** les slots. Les sources et libellés doivent indiquer clairement la nature des règles ; le champ source n'est pas une certification d'authenticité.

## Règles historiques de chaque extension

`commonCount`, `uncommonCount`, `rareCount`, `superRareCount`, `leaderCount` sont convertis en slots fixes C/UC/R/SR/L. La configuration observée est principalement **6 C + 3 UC + 2 R + 1 SR**, soit 12 cartes. La règle propre à l'extension prime sur l'ancien tirage hardcodé de la page active.

`rarityCounts`/`typeCounts` décrivent le catalogue, pas des taux d'ouverture. Les anciens champs `altArtChance`, `parallelChance`, `specialChance`, `characterCount`, `eventCount`, `stageCount`, `donCount` ne constituent pas des slots sans ambiguïté. Ils sont conservés en base et annoncés comme non appliqués. Les variantes présentes restent éligibles selon leur rareté ; leur probabilité dépend alors de leur nombre/poids dans le pool. Pour un taux explicite de variantes, utiliser v1. Aucune carte DON inventée.

## Profil historique sans SetRules

Poids provenant de l'ancien `/api/booster/open`, **non officiels** :

| Positions | Choix et poids |
|---|---|
| 1–5 | C 1 |
| 6 | UC .8 ; R .2 |
| 7 | UC .6 ; R .3 ; SR .1 |
| 8 | UC .4 ; R .4 ; SR .2 |
| 9 | R .6 ; SR .3 ; L .1 |
| 10 | R .5 ; SR .3 ; L .15 ; SEC .05 |
| 11 | R .3 ; SR .3 ; L .2 ; SEC .1 ; SP CARD .05 ; TR .05 |
| 12 | R .25 ; SR .25 ; L .2 ; SEC .15 ; SP CARD .1 ; TR .05 |

God Pack historique : occurrence 1 %, 12 slots SR .5/L .2/SEC .15/SP CARD .1/TR .05. L'ancien système « améliorait » un tirage avec des retries et des fallbacks ; il est remplacé par un profil spécial explicite et testé. Les probabilités des slots ci-dessus sont conditionnelles au pack normal, de probabilité 99 %. Cette fonctionnalité n'est pas ajoutée aux extensions dotées de règles historiques fixes et n'est pas officielle.

## BoosterCard

Sans liens sur le Booster canonique de simulation : choix uniforme des cartes dans chaque pool. Avec liens : ces liens définissent le roster éligible, `probability` est un **poids relatif par carte dans le pool choisi**. Zéro exclut la carte ; valeur négative/non finie ou pool sans poids positif invalide. Des liens vers une autre extension invalident la configuration. Les anciens boosters non canoniques ne sont pas fusionnés arbitrairement. Les poids utilisés sont archivés dans rulesSnapshot.

## Catalogue observé

3033 cartes / 46 extensions / 46 SetRules / aucun Booster à l'audit. 28 extensions satisfont les règles ; 18 ne les satisfont pas (voir catalog-availability.json), dont des ST et EB où UC/R requis sont absents, et CARDS-OTHER vide. Il faut examiner les imports **ou adapter explicitement les règles du simulateur** ; ne pas inventer des cartes ou des taux physiques. L'analyse de disponibilité utilise uniquement les comptages réellement lus ; elle ne crédite rien dans la base existante.
