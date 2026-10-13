# M6 — Architecture cible du moteur universel

État au 12 octobre 2026. Ce document décrit une évolution incrémentale du moteur de `cardgame/src/game/`; il ne prétend pas que le catalogue entier est jouable.

## Architecture existante à conserver

- `src/game/core/` détient `GameState`, les commandes, les actions légales, les transitions, le combat et les invariants. L'API publique reste `createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame` (`core/index.ts`).
- `src/game/cards/adapter.ts` sépare le numéro canonique, la définition de règles et le printing/illustration. `types.ts` porte les données examinées et leurs références.
- `src/game/effects/contracts.ts` valide le DSL versionné par Zod. `runtime.ts`, `operations.ts` et `scheduler.ts` interprètent les définitions, paient les coûts couverts, émettent des événements et suspendent les choix JSON.
- `src/lib/engine/catalog.ts` compose le catalogue transmis à `/play`; `decks.ts` applique les règles de construction; `certification.ts` attribue le statut jouable uniquement à une révision explicitement certifiée.
- `src/lib/engine/` fournit l'adaptation serveur, le dépôt, les vues privées et les bots. `/play` passe par les API autoritaires; l'ancien `/game` est distinct.

## Première évolution M6

`src/game/cards/packs.ts` introduit un compilateur pur de packs versionnés. Il valide le format des packs, normalise et consolide les cartes via l'adaptateur existant, fusionne les définitions et contributions de registre, refuse les collisions, les capacités sans référence et les sources d'effet sans définition de carte. Le catalogue M3/M5 de `src/lib/engine/catalog.ts` utilise maintenant cette frontière, tout en conservant les mêmes exports, nombres et identifiants.

Une extension connue se prépare en données : cartes, références de capacités et définitions DSL. Une primitive absente est rejetée par le schéma strict et nécessite une primitive moteur versionnée, testée séparément. Aucun texte de carte n'est interprété.

### Tranche ST-01 depuis cardJson

`src/game/cards/starterDeckSource.ts` audite et normalise les fichiers ST par lecture seule. `src/game/cards/m6LocalStarterCards.ts` importe statiquement le JSON ST-01 et projette directement cinq lignes locales : Sanji, Jinbe, Brook, Zoro et Thousand Sunny. Les références de règles restent une référence de fichier local, `faqChecked`/`errataChecked` sont faux et aucun certificat n'est créé. Les définitions utilisent le DSL existant; `OWN_LEADER_OR_CHARACTER.excludeSource` et les sélecteurs par trait décrivent les cibles sans branche runtime par numéro.

Le registre versionné accepte maintenant des mots-clés conditionnels déclaratifs; `hasCombatKeyword()` réévalue la condition au moment de l'action et permet notamment de représenter un Rush sous condition de DON!! attachés. Le même mécanisme est réutilisable par toutes les séries. Les effets continus existants portent le bonus de Zoro, tandis que le scheduler traite les effets On Play/When Attacking/Activate Main de la tranche.

`engineCatalog()` ajoute les cinq définitions en gardant les révisions antérieures. `engineRegistry()` reste le contrat historique M3; `currentEngineRegistry()` est le registre complet apparié au catalogue courant et est utilisé par le service serveur et la vérification d'éligibilité `/play`. Cela maintient la compatibilité des fixtures M3 sauvegardées.

## Cible par couches

1. **Sources et printings** — numéros canoniques, illustrations, réimpressions, langues et références de source séparées.
2. **Définitions de règles** — caractéristiques et texte source conservés, version par définition, errata datés.
3. **Compilateur de packs** — validation stricte, références vérifiées, détection de conflits et sorties déterministes. Les collectes partielles ne remplacent jamais l'ensemble compilé.
4. **DSL et registres** — déclencheurs, conditions, sélecteurs, coûts, opérations, choix, durées, remplacements et restrictions déclaratifs; versions compatibles explicites.
5. **Interpréteur** — le seul chemin passe par `applyCommand`, les opérations proposées/confirmées et le scheduler existant. Aucun branchement moteur par numéro de carte ou série.
6. **Certification** — statut par révision, puis éligibilité du deck par composition, compatibilité du Leader et couverture des effets. La disponibilité dans le catalogue ne vaut pas jouabilité.
7. **Serveur et client** — serveur autoritaire, projections privées; l'interface affiche les actions légales et choix génériques.

## Invariants

- Même état sérialisé, commande, catalogue versionné et générateur produisent le même résultat.
- Pas de fonction, callback ou interprétation libre de texte dans l'état sauvegardé.
- Les événements publics, erreurs et choix ne révèlent pas les zones cachées.
- Une primitive inconnue, une version incompatible ou un effet obligatoire absent bloque explicitement le pack/deck concerné.
- Une sauvegarde conserve les versions de règles, DSL, définitions et générateur nécessaires à sa reprise.

## Limites actuelles constatées

Le DSL couvre un sous-ensemble concret de capacités, mais pas le langage entier des cartes. L'évaluateur de modificateurs continus est délibérément désactivé (`modifiers.max(0)`); les mots-clés `RUSH`, `DOUBLE_ATTACK`, `BANISH` et `UNBLOCKABLE` sont des métadonnées et ne prouvent pas leur exécution générale. Les catalogues sont des sous-ensembles sélectionnés, pas des 36 decks complets. Le bot possède encore des heuristiques par carte dans `src/lib/engine/bot.ts`. Les tests de ce premier lot certifient le compilateur de données, pas les règles des cartes synthétiques.

### Évolution exécutée dans le lot M6 OP-01

Les profils `OP01-006@m6-2026-10-12` et `OP01-007@m6-2026-10-12` sont ajoutés au registre existant. Le sélecteur `OPPONENT_CHARACTER` accepte une limite de puissance optionnelle : sans limite pour Otama, avec `maximumPower` pour Caribou. `addPower` vérifie le contrôleur du destinataire déclaré par la définition (`CONTROLLER` ou `OPPONENT`) et utilise l'évaluateur central. Ces capacités restent déclaratives; aucun branchement d'exécution par numéro de carte n'est introduit. Les écrans `/play` et les bots réutilisent leur mécanisme de choix générique existant.

Cette tranche ne généralise pas les recherches, les défausses, la manipulation DON!! ni les effets continus à l'ensemble du catalogue. Voir les statuts de `M6_EFFECT_COVERAGE.md`.

## Étapes recommandées

1. Élargir les packs vers une provenance de chaque capacité et des erreurs de compilation localisées, sans modifier les sauvegardes.
2. Générer automatiquement l'inventaire et les indicateurs de certification depuis les exports réels.
3. Traiter une famille d'effets à la fois avec sources Bandai, définitions déclaratives et tests de règles.
4. Pour chaque Starter Deck, importer toute sa liste officielle, vérifier la construction, puis refuser le deck si une capacité nécessaire manque.
5. Remplacer les heuristiques de bot par les actions légales et les métadonnées génériques; connecter `/play` uniquement après couverture suffisante.
