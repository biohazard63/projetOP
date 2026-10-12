# Validation réglementaire des cartes M1.5C

## Références réellement consultées

- [Règles complètes Bandai v1.2.1, 28 août 2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf).
- [Catalogue ST01](https://en.onepiece-cardgame.com/cardlist/?series=569001), [FAQ ST01–ST04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=).
- [Catalogue EB01](https://en.onepiece-cardgame.com/cardlist/?series=569201), [FAQ EB01](https://en.onepiece-cardgame.com/pdf/qa_eb01.pdf?20240419=).
- [Catalogue OP06](https://en.onepiece-cardgame.com/cardlist/?series=569106), [FAQ OP06](https://en.onepiece-cardgame.com/pdf/qa_op06.pdf?20240419=).
- [Errata officiels](https://en.onepiece-cardgame.com/rules/errata_card/), notamment la correction ST01-017 du 26 septembre 2022.

Consultation le 11 octobre 2026. Textes originaux du bundle repris des fichiers JSON déjà présents ; caractéristiques et clauses confrontées aux sources ci-dessus. Pas de modification du scraper ou du catalogue maître, ni de collecte massive/images.

## Vérifications et arbitrages

| Référence | Vérification | Décision |
|---|---|---|
| ST01-001 / ST01-007 | FAQ : DON épuisés de cost uniquement, pas ceux déjà attachés ; Nami peut se choisir | Sélecteur OWN_RESTED_DON ; cible propre Leader/Personnage ; once-per-turn par présence |
| ST01-011 | FAQ : donner 0/1/2 à un unique destinataire | Deux choix JSON ; aucun destinataire obligatoire quand zéro DON |
| ST01-013 | FAQ : +1000 reste applicable pendant le tour adverse | Bonus continu séparé du bonus réglementaire DON propre tour |
| ST01-017 | Stage utilisable le tour de sa pose ; coût d'épuisement ; wording actuel zéro/un | REST_SOURCE avant choix ; type exact, durée THIS_TURN |
| EB01-008 | FAQ : impossible de remplacer sans Événement ou Lieu de main | Choix privé facultatif seulement si paiement disponible ; absence -> KO réel |
| OP06-007 | Texte officiel, coût 10, puissance 12000, KO <=10000 ; aucune entrée individuelle identifiée dans FAQ consultée | ON_PLAY issu de la pose réelle ; comparaison de puissance calculée |

Règles appliquées : 1-3-2 (faire le possible), 1-3-5-1 (zéro dans « jusqu'à »), 1-3-6 (valeurs calculées), 4-4-2 (DON attachés ni actifs ni épuisés réglementairement), 6-5 et 6-6 (Main/Fin), 8-1 (familles et remplacements), 8-3 (coûts), 8-4 (conditions/résolution), 8-6 (automatiques), 9-1 (traitements), 10-2-6 (En jouant), 10-2-13 (une fois par tour), 10-2-17 (En cas de KO).

Le booléen rested hérité peut rester vrai sur un DON attaché : il n'est jamais interprété comme un DON épuisé disponible pour payer ou réattribuer. Seule la zone cost est admissible. Pas de migration de l'ancien état.

## Candidates non retenues

Les fiches locales OP17-002/025/015/005/019 ont été examinées. Les pages OP17 officielles recherchées n'ont pas fourni ici un texte/FAQ suffisamment exploitable pour valider les candidates. Leurs données locales ne suffisent pas à certifier les capacités ; aucun programme de ces cartes n'a été activé.

OP12-102 Shirahoshi : [catalogue OP12](https://en.onepiece-cardgame.com/cardlist/?series=569112) et [FAQ OP12](https://en.onepiece-cardgame.com/pdf/qa_op12.pdf?20260206=) consultés. Les deux clauses, Vie face visible et puissance imprimée « - » nécessitent des contrats et invariants supplémentaires ; la remplacer par LittleOars évite une carte partiellement exécutable. Ne pas transformer « - » en zéro.

## Certification

Sept cartes : données et clauses retenues vérifiées, définitions déclaratives et tests verticaux présents ; statut global DATA_VALID_EFFECT_PENDING. Zéro nouvelle carte PLAYABLE_VERIFIED. `faqChecked` signifie consultation, pas existence d'une réponse pour chaque carte ni certification compétitive.

Statuts INVALID_DATA/AMBIGUOUS_RULE/UNSUPPORTED_MECHANIC restent des décisions de certification de catalogue (architecture déjà définie), pas un nouveau statut injecté en base. Aucune nouvelle carte du catalogue utilisateur n'est admise automatiquement. Les états laboratoire gardent automaticPlayReady=false.

## Cartes supplémentaires relues pour M1.5D

- OP01-007 Caribou : catalogue officiel OP01 et erratum 2023-02-17 ; zéro ou un personnage adverse de puissance actuelle ≤ 4000.
- OP04-003 Usopp : catalogue officiel OP04 et FAQ OP04 ; zéro ou un personnage adverse de puissance de base ≤ 5000.
- OP05-001 Sabo : catalogue officiel OP05 et FAQ OP05 ; DON attaché, tour adverse, puissance actuelle ≥ 5000, remplacement facultatif et limitation consommée uniquement sur acceptation. La FAQ sur plusieurs victimes est connue mais non exécutée.

Définitions et textes conservés dans `cards/effectScheduling.ts`, hors catalogue utilisateur. Traductions françaises du laboratoire non officielles. Statut : `DATA_VALID_EFFECT_PENDING`, pas de certification complète du jeu.
