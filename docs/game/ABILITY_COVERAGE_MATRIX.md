# Universal ability engine — coverage matrix

## CURRENT STATE — passation du 2026-10-12

Les sections et tableaux historiques ci-dessous décrivent l’audit du 2026-10-11. Depuis, le lot M3 a ajouté des profils Counter déclaratifs et une définition OP01-016, avec quatre tests ciblés PASS; la suite complète post-M3 n’a pas été exécutée. N’interprète pas les statuts antérieurs comme une certification des nouveaux profils. La matrice de reprise courante est `docs/handoff/04_CURRENT_STATUS.md` et les tâches sont dans `docs/handoff/05_M3_HANDOFF.md`.

- Counter générique : **PARTIAL** (profils déclaratifs ciblés OP06-017, ST04-016, ST01-014, ST03-017; seuls OP06-017 et ST01-014 ont un test ciblé M3, ancien profil ST04 existe; ST03-017 sans test ciblé). Les coûts sont limités, donc pas de certification universelle.
- Recherche : **PARTIAL/élargie** par filtres de trait, catégorie, exclusion de nom et sélection multiple; le test ciblé M3 est OP01-016 Nami. Ceci n’autorise pas les mouvements réglementaires vers Life/terrain.
- ST04-016 : **DATA_VALID_EFFECT_PENDING**; deck violet légal non testé.
- Cartes certifiées spécifiquement par M3 : **0**. Les quatre profils OP06 restent une affirmation de certification du laboratoire historique dans `UNIVERSAL_ABILITY_ENGINE_REPORT.md`, non une nouvelle certification du code M3.
- Vérifications au 2026-10-12 : test M3 ciblé 4/4 PASS; typecheck PASS; ESLint PASS (0 erreur, 99 warnings); suite complète et build post-M3 NOT TESTED. `git diff --check` PASS uniquement pour les fichiers suivis; les sources moteur non suivies ne sont pas examinées par cette commande.

Date d'audit : 2026-10-11. Périmètre : moteur TypeScript sous `cardgame/src/game`, tests `cardgame/tests/game-*.test.ts`, rapports M1.5–M2.5 et inventaires de cartes locaux. Cette matrice décrit le code observé, pas les capacités présumées d'une carte à partir de son seul texte.

## Base de preuves

- Le dernier audit local versionné (`DATA_AUDIT.json`, 2026-10-10) compte **2 667 numéros canoniques**, **4 179 variantes**, **74 groupes** et **485 variantes multi-groupes**. Il rapporte 3 664 textes d'effet français présents, dont 2 186 `official`, 1 553 `review_required` et 58 `machine`. Ces données n'ont pas toutes été relues selon les règles : ce sont des mesures de disponibilité du catalogue, pas des cartes jouables.
- Les fichiers locaux comprennent 59 fichiers JSON dans `carteJson/` (dont les nouvelles données sous `carteJson/nouvelle/`) et 1 545 fichiers JSON dans `data/` au moment du comptage. `data/` contient aussi rapports et traductions : ce total de fichiers n'est pas un nombre de catalogues distincts.
- L'audit M1.5A classe 56 catégories heuristiques. L'analyse est textuelle et ne prouve ni le sens réglementaire ni une exécution possible.
- Référence réglementaire versionnée par le moteur : Comprehensive Rules **1.2.1**. Les règles effectives doivent être revérifiées à la source Bandai lorsqu'un comportement est activé : [Comprehensive Rules](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [Q&A Rules](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf).

## Capacités exécutables observées

| Famille | État runtime réel | Preuve et limites |
|---|---|---|
| Mise en place, phases de base, pioche et DON!! de tour | Implémenté sur le périmètre M1.5 | Tests M1/M1.5; ce n'est pas une couverture d'effet de carte. |
| Opérations d'effets | Partiel, étendu en DSL 1.3.0 | `giveRestedDon`, `moveDon`, `attachRestedDon`, `addPower`, `koCharacter`, `drawCards`, `moveCard`; pas `moveCard` vers une zone cachée avec audience publique. `SEARCH_TOP_DECK`, `REVEAL_BINDING` et `SHUFFLE_DECK` sont des pas déclaratifs. Mouvements réglementaires spécialisés (jeu depuis zones, Life, coût) gardent leurs règles dédiées. |
| Capacités activées / MAIN | PASS sur le sous-ensemble testé | `[Activate: Main]` exige le joueur actif en Main Phase, paie le coût déclaré et applique `ONCE_PER_TURN`. Les Events `[Main]` OP06-017/018 paient leur coût imprimé, passent au Trash et reprennent via choix JSON. Tests d'activation/refus, coûts, cibles et restauration. Aucun timing hors Main ni démarrage pendant une bataille. Coûts alternatifs non pris en charge. |
| ON_PLAY | Partiel | Scheduler après `CARD_PLAYED`, y compris plusieurs définitions et choix d'ordre sérialisables; capacités réelles incomplètement couvertes. |
| ON_KO / ON_CHARACTER_KO | Partiel | Scheduler sérialisable et preuves M1.5D; KO combat connecté dans un sous-ensemble. Cascades et choix sont testés sur définitions de laboratoire. Pas de certification de carte complète. |
| Effets continus | Partiel | Évaluateur de puissance courant pour les définitions de laboratoire; `power`/`basePower` limités. Pas d'évaluateur universel de coût, couleurs, types, permissions ou dépendances. |
| Effets de remplacement | Partiel | Remplacement synthétique et sous-ensemble déclaratif de protections/remplacements connus; certaines résolutions d'ordre ou remplacements multiples sont explicitement refusés. |
| Attaque / Blocker / Counter Character | Partiel | `BLOCKER → COUNTER → DAMAGE`, permissions de base, repos et Counter Character. Un timing déclaratif `WHEN_ATTACKING` et `ON_BLOCK` est maintenant raccordé au scheduler commun; les autres fenêtres, interactions de combat et capacités de cartes officielles restent incomplètes. |
| Counter Event | Partiel, deux profils officiels | OP06-017 [Counter] et ST04-016 Blast Breath ont des profils distincts vérifiés; coût imprimé, Life facultative ou DON!! −1 facultatif et bonus de puissance. Le refus du coût OP06-017 supprime l'effet après les deux-points. ST04-016 reste `DATA_VALID_EFFECT_PENDING` faute de scénario dans un deck violet légal. Les Events Counter ne sont pas compilés comme une grammaire générique. |
| Rush, Rush: Character, Unblockable | Partiel | Métadonnées de test et validation explicite; restrictions de base implémentées. Pas de certification sur toute la carte ou toutes variantes de mot-clé. |
| Double Attack | Partiel | Deux dommages Life fixés dans le chemin combat; en présence d'un Trigger non géré, comportement refusé. Ne couvre pas l'intégralité des choix et effets par dommage. |
| Banish | Partiel | Life touchée va au Trash dans le chemin combat, sans Trigger; variantes et interactions complètes non certifiées. |
| Trigger | PASS sur OP06-013 et OP06-018 | Déclenchement suspendu, acceptation/refus, zone temporaire, choix, K.O., reprise JSON et confidentialité. OP06-013 recherche; OP06-018 cible un Character à puissance actuelle ≤5000. D'autres familles Trigger restent à convertir/certifier. |
| Recherche, révélation, mélange | PASS sur le sous-ensemble DSL 1.3.0 | Recherches consécutives dans les N premières cartes, choix facultatif zéro/une, ordre sous le deck, révélation sélectionnée, mélange xorshift déterministe sérialisé; deck vide, confidentialité et reprises JSON testés. Aucun parseur universel de recherche/ciblage depuis texte brut. |
| Déplacement générique de cartes / jeu depuis une zone | Partiel | `moveCard` déplace un objet sélectionné entre les zones autorisées et confirme via `processOperation`; restrictions d'audience pour les zones cachées. Les règles de paiement, mise en jeu, remplacement et déclenchements de changement de zone ne sont pas universellement modélisés. |
| Protection, restrictions et permissions génériques | Partiel | Registre limité; pas de modèle exhaustif des fenêtres, exceptions et interactions. |
| Durées et Once Per Turn | Partiel | Structures versionnées et usage du scheduler; couverture runtime limitée et types de durée restreints. |
| Vie, manipulation de Life et fin de partie en combat | Partiel | Dégât Leader et défaite par dommage à zéro Life sont présents; Trigger, remplacements de dommage et mots-clés combinés incomplets. |
| Choix, confidentialité, sérialisation | PASS sur le sous-ensemble présent | Choix Main, recherche et Trigger suspendus/repris en JSON; options de deck/main/Life interdites en choix publics, projection adversaire sans identifiants/options privés. |

## Familles de textes détectées

Les 56 classes heuristiques de M1.5A incluent des formulations de timing, coûts, conditions, ciblage, déplacement et mots-clés. Elles servent à prioriser les travaux seulement. Les compteurs par expression et les numéros de cartes doivent être recalculés depuis les JSON exacts lorsqu'une famille est prise en charge; la présente session n'en déduit aucun taux de couverture réglementaire.

## Écart prioritaire

Les événements confirmés `ATTACK_DECLARED` et `BLOCKER_ACTIVATED` sont maintenant liés à `WHEN_ATTACKING` et `ON_BLOCK` avec des tests de sérialisation et de projection privée. Les autres blocages transversaux restent : support de `WHEN_ATTACKED`/`ON_OPPONENT_ATTACK`, DSL assez expressive pour les familles de zones, traitement suspendu des dommages Life et Trigger, Counter Events compilés génériquement, et tests d'interaction avec cartes officielles réellement relues.

## Certification et familles interséries

Les profils officiels marqués `PLAYABLE_VERIFIED` dans ce laboratoire sont OP06-009, OP06-013, OP06-017 et OP06-018 : leurs capacités obligatoires déclarées sont reliées à des définitions versionnées et couvertes par tests d'intégration. OP06-017/018 ont désormais les modes Main en plus du Counter/Trigger déjà couvert. ST04-016 Blast Breath conserve `DATA_VALID_EFFECT_PENDING` : son profil Counter est testé, mais pas encore dans un deck violet légal complet. Les cascades de scheduler entre OP01 et OP06 restent une preuve d'interaction, pas une certification des autres cartes.

État de ce lot : six tests ont été ajoutés au-dessus des 259 tests de référence, soit 265 tests actuellement. Les tests spécifiques couvrent les capacités Main des deux Events OP06, `[Activate: Main]` synthétique avec coût de repos et Once Per Turn, une définition future déclarative combinant deux recherches, choix facultatifs, révélation, déplacement, mélange déterministe, reprise JSON, confidentialité et le cas runtime sans cartes candidates. Le test de deck vide sépare explicitement la primitive de recherche de la défaite immédiate vérifiée par le traitement des règles.
