# M6 — Couverture des familles d'effets

## CURRENT STATE — tranche locale ST-01 (13 octobre 2026)

Le pack ST-01 contient désormais des définitions DSL locales pour les douze cartes à effet : ST01-001, -002, -004, -005, -007, -011, -012, -013, -014, -015, -016 et -017. Les 27 tests ciblés source/ST-01 ont passé pendant cette session. Les nouvelles familles couvertes dans ce lot comprennent la suppression conditionnelle de Blocker, le Rush du Character, le jeu de la carte Life elle-même via Trigger, la sélection d'un Blocker adverse selon son coût, et le KO via Trigger. Ces résultats couvrent les scénarios implémentés/testés; ils ne certifient ni la totalité des interactions ni les textes du point de vue FAQ/errata. Les cinq certifications ST-01 préexistantes sont inchangées; aucune certification nouvelle n'a été attribuée.

Les profils locaux restent `DATA_VALID_EFFECT_PENDING` tant que leur provenance/révision réglementaire n'a pas été examinée. Le deck ST-01 n'est pas certifié. Les quantités existent dans `DeckCard.quantity` et le manifeste de `scripts/rebuildStarterDecks.ts`; la base locale n'était pas disponible pour comparer les enregistrements persistés.

ST-02 a commencé sans tests intermédiaires selon la consigne utilisateur. `ST02-005 Killer` est défini localement avec On Play (cible facultative : Character adverse reposé, coût ≤3, puis K.O.) et Trigger (jouer cette carte depuis Life). Le nouveau sélecteur de cible est générique. Cette définition est **non vérifiée après ajout** et ne peut pas compter comme couverture testée ou certifiée. Les résultats globaux de validation antérieurs sont antérieurs à ce changement.

État observé dans le dépôt le 12 octobre 2026. « Présent » désigne une capacité représentable/exécutable dans un périmètre testé, pas une couverture universelle.

| Famille | État observé | Limite concrète |
|---|---|---|
| Sans effet / caractéristiques imprimées | Présent, tests M4/M5 | Certification seulement sur révisions et couleurs retenues |
| Blocker | Présent dans combat et certificats | Un sous-ensemble de définitions est certifié |
| Activate: Main / Main | Partiel | Plusieurs programmes connus (Kaido et OP06-018); pas une couverture générique de toutes les constructions |
| On Play / recherche | Partiel | OP01-016 et OP06-013; recherches top-deck filtrées seulement |
| Counter Character | Présent au combat | Couverture de la procédure de base; toutes clauses particulières non couvertes |
| Counter Event | Partiel | Définitions retenues ST01-014, ST03-017, OP06-017, ST04-016; le DSL de contre n'est pas universel |
| Trigger | Partiel | Flux Life suspendu et plusieurs programmes connus; toutes destinations/variantes pas couvertes |
| On K.O. / cascade / simultanéité | Partiel | Scheduler et scénarios ciblés M1.5D/M2.5; couverture du catalogue non démontrée |
| When Attacking / On Block | Partiel | Fenêtres moteur et définitions ponctuelles; pas d'inventaire certifié général |
| Effets continus et valeurs de base | Partiel | L'évaluateur calcule les modificateurs temporaires testés et la copie de puissance de Leader; les effets continus génériques restent refusés (`modifiers.max(0)`) |
| Rush | Métadonnée, couverture non démontrée | Pas d'affirmation de certification générale |
| Double Attack | Métadonnée, couverture non démontrée | Pas d'affirmation de certification générale |
| Banish | Métadonnée, couverture non démontrée | Pas d'affirmation de certification générale |
| Stage, effets différés, protections, permissions complexes | Non démontré | À classer et implémenter par familles vérifiées |

## Inventaire heuristique du catalogue local

Audit en lecture seule des **59 fichiers JSON**, **4 318 entrées/printings** et **2 667 numéros canoniques** sous `cardgame/carteJson/` (variantes et réimpressions fusionnées par champ `code`/`id` après retrait du suffixe `_pN`). Les expressions ci-dessous sont des recherches de texte, non une classification réglementaire; les familles peuvent se chevaucher, les traductions et fiches incomplètes peuvent produire des écarts.

| Texte repéré dans au moins une capacité du numéro canonique | Numéros concernés |
|---|---:|
| [On Play] / [Jouée] | 873 |
| [When Attacking] / [En attaquant] | 246 |
| [On Block] / [En bloquant] | 14 |
| [On K.O.] / [En cas de K.O.] | 43 |
| [Activate: Main] / [Activation : Principale] | 355 |
| [Main] / [Principale] | 279 |
| [Trigger] / [Déclenchement] | 505 |
| [Counter] / [Contre] | 193 |
| [Blocker] / [Bloqueur] | 352 |
| [Rush] | 35 |
| [Double Attack] | 17 |
| [Banish] | 15 |

Indices lexicaux qui nécessitent de nouvelles primitives ou une généralisation : recherche (233), défausse (365), manipulation DON!! (828), puissance (761), K.O. (544), textes continus présumés (245), référence au Leader (787), choix/sélection (1 488). Ce sont des occurrences heuristiques et non des cartes déjà jouables.

## Lot M6 — cartes officielles exécutées

## CURRENT STATE — tranche ST-01 basée sur `cardJson` (13 octobre 2026)

- Le dossier a été parcouru localement : **59 JSON / 4 318 lignes / 2 667 numéros canoniques candidats**. Les fichiers de fiches ST existent pour 35 decks; ST-22 manque. Les quantités ne sont pas dans ces fichiers JSON de cartes : elles sont en base (`DeckCard.quantity`) et, jusqu'à ST-28, dans le manifeste `scripts/rebuildStarterDecks.ts`.
- `starterDeckSource.ts` lit les fichiers ST sans les modifier, normalise leurs champs et distingue les lignes/printings du nombre de numéros. Les essais couvrent les formats locaux présents et signalent ST-22 absent.
- `m6LocalStarterCards.ts` projette les caractéristiques et le texte de ST01-005 directement depuis `cardJson/ST-01/cards-ST-01.json`. La définition de règles est une composition DSL versionnée (WHEN_ATTACKING, condition d'au moins un DON!! attaché à la source, choix jusqu'à un Leader/Character propre hors source, +1000 jusqu'à la fin du tour). Le runtime ne contient aucun identifiant de carte spécial.
- La primitive générique `OWN_LEADER_OR_CHARACTER.excludeSource` a été ajoutée et sa validation de continuation réutilise la même source qu'à la création du choix. Les tests vérifient l'activation avec DON!!, la non-activation sans DON!!, le choix zéro, le ciblage d'un autre personnage, la confidentialité de l'action et une reprise JSON.
- `engineCatalog()` préserve les définitions existantes et ajoute le profil de source. `engineRegistry()` reste historiquement apparié à `m3EngineCatalog()`; `currentEngineRegistry()` est utilisé par les démarrages serveur `/play` qui utilisent le catalogue étendu. Cette séparation évite d'injecter une source absente dans les fixtures M3.
- Cette ligne provient exclusivement du JSON local; elle n'a pas de vérification FAQ/errata dans ce lot. Elle est donc **testée comme traduction déclarative des données locales, mais non certifiée, non admise dans MUGIWARA_FREE et non présentée comme vérifiée réglementairement**. Aucun Starter Deck n'est complet/débloqué.

- **OP01-006 Otama** : `ON_PLAY`, choix facultatif de zéro ou un Character adverse sans plafond de puissance, −2000 jusqu'à la fin du tour. La primitive `addPower` existante accepte maintenant le joueur destinataire déclaré par la définition, y compris l'adversaire. Le test de partie couvre le choix d'une cible, l'absence de ciblage, l'isolation du choix au joueur autorisé et l'évaluateur de puissance.
- **OP01-007 Caribou** : `ON_KO`, choix facultatif de zéro ou un Character adverse de puissance actuelle ≤4000 puis K.O. Le test effectue un combat complet jusqu'au K.O. confirmé de Caribou, vérifie le ciblage autorisé/interdit, résout le K.O. déclenché, puis restaure l'état JSON.
- Les deux définitions sont déclaratives dans le registre DSL 1.3.0, entrées dans le catalogue serveur `engineCatalog()` et autorisées dans `MUGIWARA_FREE`. Les choix d'état ouvert utilisent la fiche de choix générique de `/play`; les bots existants sélectionnent avec leur logique de choix générique, sans nouvelle branche par carte.

Les deux certifications ont été ajoutées pour les révisions exactes `@m6-2026-10-12`. Elles ne certifient pas tous les printings comme nouveaux comportements indépendants et ne débloquent aucun Starter Deck complet.

### Capacités effectivement certifiées dans ce lot

| Carte/révision | Famille réellement exécutée | Cas testés | Statut |
|---|---|---|---|
| OP01-006 Otama `@m6-2026-10-12` | On Play, sélection facultative d'un Character adverse, modificateur temporaire de puissance | Choix zéro; seule la cible choisie change, non-cible comparée avant/après; choix accessible uniquement au contrôleur; restauration JSON | `PLAYABLE_VERIFIED` dans `MUGIWARA_FREE` |
| OP01-007 Caribou `@m6-2026-10-12` | On K.O. après K.O. confirmé, choix facultatif filtré par puissance actuelle, K.O. | Combat réel; seuil ≤4000; cible au-dessus exclue; choix au contrôleur; restauration JSON | `PLAYABLE_VERIFIED` dans `MUGIWARA_FREE` |
| OP01-016 Nami `@m3-2026-10-12` | On Play, recherche du deck, révélation, sélection privée, placement du reste en bas dans l'ordre choisi | 5 cartes; exclusions par trait et nom; choix zéro; recherches successives; deck inférieur à cinq; deck vide; reprise/idempotence dans M3-2; exécution additionnelle sous `MUGIWARA_FREE` | `PLAYABLE_VERIFIED` dans `MUGIWARA_FREE` |
| OP06-013 Luffy `@official-2026-10-11` | On Play recherche FILM; Trigger exécute On Play pendant les dégâts Life | Test On Play; Trigger accepté/refusé; choix et ordre privés; restauration JSON; reprise des dégâts Life; combat interséries avec ST04-009 et Counter OP06-017 | `PLAYABLE_VERIFIED` dans `MUGIWARA_FREE` |

Le pipeline `addPower` vérifie désormais le contrôleur du joueur destinataire déclaré, permettant un effet générique sur une cible adverse. Aucun branchement par numéro de carte n'a été ajouté au runtime. `/play` et les bots utilisent leurs mécanismes génériques de choix existants; aucun changement UI/bot n'a été nécessaire pour ces deux profils.

## Comptage du catalogue compilé

Mesure obtenue en important `engineCatalog()` et en appelant `effectiveStatus()` : **333 définitions**, **333 printings**, **120 révisions explicitement certifiées** au 12 octobre 2026. OP01-006/007 sont de nouvelles définitions; OP01-016 et OP06-013 étaient déjà au catalogue et reçoivent ici un certificat explicite lié à leur révision. Le statut historique `playabilityStatus` ne vaut pas certificat.

Le compilateur de packs M6 conserve les identifiants historiques et intègre maintenant les deux définitions officielles OP01 ci-dessus. La fixture synthétique de pack demeure non certifiée et n'est pas une carte Bandai.

Les comptes par Starter Deck sont consignés dans `M6_STARTER_MATRIX.md`. Ces comptes sont des cartes reconnues du catalogue, pas le nombre total de cartes de chaque produit.

## Limites de l'audit et du lot

L'audit lexical porte sur les fichiers locaux actuels. Il ne prouve pas que les JSON couvrent toutes les impressions ni que tous les textes sont complets. Les occurrences sont heuristiques. Le lot ajoute quatre certifications (deux nouvelles définitions OP-01 et deux définitions OP déjà présentes) et aucune certification ST; aucun deck ST-01 à ST-36 n'est nouvellement débloqué. Les primitives encore prioritaires sont la défausse, la manipulation DON!!, les effets continus, les restrictions/permissions et les interactions de choix/effets simultanés. Ces familles ne sont pas universellement prises en charge.
