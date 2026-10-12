# 06 — Données de cartes et règles

## Sources et organisation locale

Les sources historiques sont réparties dans `cardgame/carteJson/` (y compris `nouvelle/`) et `cardgame/data/onepiece/` (`catalog/`, `game/`, `sources/`, `translations/`, `reports/`). La structure exacte peut évoluer; avant import, inventorier les fichiers et lire `docs/catalog/CATALOG_REBUILD_REPORT.md`. Scraper existant : `cardgame/scripts/scrape-onepiece-fr.js`; le modifier ou relancer une collecte exige une demande spécifique et le respect des conditions de source.

L’audit local décrit dans `docs/game/ABILITY_COVERAGE_MATRIX.md` rapporte 2 667 numéros canoniques, 4 179 variantes, 74 groupes, 485 variantes dans plusieurs groupes; chiffres issus d’un audit daté, non recalculés le 12 octobre 2026. Un numéro canonique, un printing/illustration, une définition réglementaire et une instance physique sont des identités différentes.

## Textes et définitions moteur

Les JSON et scraper peuvent conserver noms/effets en français ou anglais, traductions et statuts; la présence d’un champ français ne garantit pas l’officialité. Les textes originaux sont conservés dans les profils revus. Ne pas remplacer les textes ni les capacités avec une traduction machine et ne jamais interpréter le texte libre durant une partie.

L’adaptateur est dans `cardgame/src/game/cards/adapter.ts`; contrats dans `cards/types.ts`. Profils de capacités revues: `cards/officialAbilities.ts`, autres données de test M3 dans `cards/m3Abilities.ts`. Registry/DSL : `effects/contracts.ts`. Distinguer définition canonique, printing, variante artistique et copie dans `GameState.instances`.

Les références inscrites dans les définitions comprennent la [liste officielle OP06](https://en.onepiece-cardgame.com/cardlist/?series=569106), [FAQ OP06](https://en.onepiece-cardgame.com/pdf/qa_op06.pdf?20240419=), la [liste OP01](https://en.onepiece-cardgame.com/cardlist/?series=569101), la [FAQ OP01](https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405=), la [liste ST04](https://en.onepiece-cardgame.com/cardlist/?series=569004) et FAQ ST-01/ST-04. Vérifier les documents actuels avant toute décision réglementaire.

## Ruleset et certification

Le runtime refuse `rulesVersion` autre que `1.2.1` dans `core/game.ts`; ruleset non compétitif local `rulesets/m0.ts` daté 2026-10-10. Référence Bandai actuelle consignée dans les fichiers : [Comprehensive Rules](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [Q&A Rules](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf); consulter les FAQ par extension et errata sur Bandai. Ne pas affirmer qu’une règle/FAQ a été revérifiée aujourd’hui simplement parce que l’URL est présente.

États autorisés par le projet : `PLAYABLE_VERIFIED`, `DATA_VALID_EFFECT_PENDING`, `UNSUPPORTED_MECHANIC`, `AMBIGUOUS_RULE`, `INVALID_DATA`. `PLAYABLE_VERIFIED` exige toutes les capacités obligatoires, coût, cible, restrictions, timing et interactions couvertes et vérifiées. Les profils M3 doivent faire l’objet d’une re-certification; l’ancien statut copié sur une carte ne vaut pas preuve du nouveau code.

## Séries futures

Le moteur ne doit pas conditionner sur OP/ST/EB/PRB ou un code série. L’import doit normaliser nouvelles séries, variantes/réimpressions sans confondre illustration et mécanique, rejeter primitives/version inconnues, obtenir une revue officielle des capacités et tests avant certification. Ne jamais écraser un catalogue global avec un export partiel; ne toucher à la base de production que sur autorisation explicite.
