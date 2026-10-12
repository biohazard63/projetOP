# Registre des capacités et composants réglementaires

## CURRENT STATE — 2026-10-12

Les états du registre historique ci-dessous sont datés du 2026-10-11. Le code M3 ajoute des définitions de laboratoire sans rendre ces familles universellement prises en charge ni recertifier leurs cartes. État vérifié dans `docs/handoff/04_CURRENT_STATUS.md` : 4 tests ciblés M3 PASS; suite complète post-M3 NOT TESTED.

- Counter: déclaratif limité en runtime; tests M3 sur OP06-017 et ST01-014. ST04-016 a un profil, mais manque validation en deck violet légal. ST03-017 possède une définition sans preuve ciblée M3.
- Recherche: filtres déclaratifs (trait/catégorie/exclusion `rulesName`) et multi-sélection existent; OP01-016 a un test de recherche privée et restauration JSON. La destination/mécanique reste limitée aux zones autorisées.
- Statut de certification: aucune nouvelle carte M3 certifiée. Les statuts hérités d’un clone `OFFICIAL_ABILITY_CARDS` doivent être examinés avant usage; l’état copié n’atteste pas la validation de l’extension M3.
- Ne pas interpréter « générique » comme support complet des coûts alternatifs, interruptions, zones ou tous Counter Events.

Ce registre sépare quatre notions : **mot-clé** imprimé/réglementaire, **fenêtre** de timing, **primitive** qui modifie le jeu et **sélecteur** qui identifie les objets visés. Les textes de carte ne sont jamais interprétés directement par le runtime. La définition compilée est versionnée et doit être relue; primitive inconnue ou version incompatible = refus explicite.

Ruleset du noyau : Comprehensive Rules 1.2.1. Sources de travail : [Bandai Comprehensive Rules](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), [Bandai Q&A Rules](https://en.onepiece-cardgame.com/pdf/qa_rules.pdf). Une référence par section et le Q&A carte par carte restent obligatoires avant certification.

## Fenêtres réglementaires

| ID stable | Fenêtre | Conditions / coûts / choix typiques | Durée / interactions | État moteur, candidates et tests |
|---|---|---|---|---|
| `timing.main` | Main / activation | Joueur actif en Main Phase; coût avant résolution, choix facultatifs et cibles validées | Event `[Main]` paie son coût imprimé puis va au Trash; résolution sérialisable | PASS sous DSL 1.3.0 : OP06-017 et OP06-018, tests des capacités Main, choix/cibles et reprise. FAQ OP06-018 confirme que les deux bonus peuvent cibler des Characters différents. Coûts alternatifs non implémentés. |
| `timing.activate_main` | Activate: Main | Joueur actif en Main Phase; coût, condition, limite `ONCE_PER_TURN` | Source doit demeurer dans la zone attendue; pas d'activation pendant un combat | PASS pour les sources Characters testées avec `REST_SOURCE`; test `TEST-FUTURE-SET.activate-main`. Les cartes de laboratoire `ST01-001/007` ne sont pas certifiées par ce test synthétique. |
| `timing.on_play` | Après jeu confirmé | Événement `CARD_PLAYED`; source encore dans la zone réglementaire | Peut créer d'autres opérations et déclenchements | Partiel, scheduler présent. ST01-011 et OP06-007 sont définitions de laboratoire, pas certifications; tests M1.5C/D. |
| `timing.when_attacking` | Attack Step / attaque déclarée | Attaquant/source et cible valides; effets facultatifs possibles | Modificateurs pouvant affecter la bataille; source vérifiée à l'activation | Absent comme timing générique. Rules §7-1-1; tests de combat M2.5 montrent absence. |
| `timing.on_opponent_attack` | Attack Step adverse | Contrôleur et cible selon le texte; capacité peut répondre à déclaration | Peut affecter le combat ouvert | Absent comme timing générique. Rules §7-1-1. |
| `timing.when_attacked` | Attack Step | Condition et cible selon définition | À traiter avant Blocker | Absent. Rules §7-1-1. |
| `timing.on_block` | Block Step après activation | Blocker doit être déclaré et reposé; contrôleur peut devoir choisir | Effet peut changer l'état avant Counter | Absent. Rules §7-1-2; aucun test de capacité On Block. |
| `timing.counter` | Counter Step | Personnage ou Event autorisé, coûts, éventuellement plusieurs réponses | Réponse pendant la bataille; fin si source/cible quitte la zone | Partiel pour Counter Character et Blast Breath ST04-016. Rules §§7-1-3, 8-3; tests `game-m2a.test.ts`. |
| `timing.damage` | Damage Step | Puissance comparée; dommage Life déterminé | Double Attack traite plusieurs dommages, chacun avec effets applicables | Partiel. Rules §7-1-4; Trigger bloque encore la résolution. |
| `timing.trigger` | Trigger pendant dommage Life | Révélation/choix du joueur défenseur, effet compilé, coûts éventuels | Suspension/reprise du combat, événements réels et zones privées/publiques | PASS sur OP06-013 et OP06-018, y compris refus/acceptation, reprise JSON et confidentialité. Autres effets Trigger non couverts. Rules §§8-6-2, 10-1-5. |
| `timing.on_ko` | Après KO réellement confirmé | KO confirmé seulement; source/capture et contrôleur figés | Peut déclencher cascades; le KO empêché ne déclenche pas ON_KO | Partiel, scheduler ON_KO présent en laboratoire (OP01-007, OP04-003 et autres); test M1.5D. |
| `timing.end_of_battle` | End of Battle | Bataille terminée, capacité applicable | Expiration des effets de combat dans l'ordre réglementaire | Absent comme timing générique. Rules §7-1-5. |
| `timing.end_turn` | End Phase / frontière de tour | Source, contrôleur, expiration | Doit être lié à un turnId et ruleset | Contrat durée partiel; aucune couverture globale. |

## Primitives d'effet

Chaque primitive exige un contrat de validation, un refus réglementaire, un test d'interaction, déterminisme/idempotence et, si elle suspend ou touche des données privées, sérialisation/projection testées.

| ID | Primitive | État runtime observé | Besoins et candidats de validation |
|---|---|---|---|
| `op.give_rested_don` | Ajoute DON!! épuisé depuis DON!! deck | Implémentée | Test M1.5B; s'assurer de la zone et des restrictions. |
| `op.move_don` | Déplacement DON!! entre zones | Implémentée dans le périmètre du registre | Tests M1.5B/C/D. |
| `op.attach_don` | Attache DON!! à une cible | Implémentée, sélecteurs limités | Tests M1.5C; aucune couverture générale des coûts. |
| `op.modify_power` | Modificateur de puissance | Partielle : `THIS_TURN`, évaluateur limité | Tests M1.5C; étendre durées/portées avant généralisation. |
| `op.ko_character` | Propose et confirme KO | Partielle : remplacement/scheduler et cible Character | Shanks OP06-007 labo; restrictions, protection et multi-KO incomplets. |
| `op.draw` | Pioche | `drawCards` en place depuis les lots précédents | Pioche cachée depuis deck et contrôle de défaite au point de traitement des règles; pas universel pour tous les effets déclenchés par pioche. |
| `op.search` | Recherche | `SEARCH_TOP_DECK` avec ou sans filtre de trait, sélection 0/1 et ordre du reste | Recherches successives, deck vide, choix privé et reprise JSON testés; pas de recherche arbitraire dans l'intégralité du deck. |
| `op.reveal` | Révélation | `REVEAL_BINDING` et sélection révélée de `SEARCH_TOP_DECK` | Produit une entrée révélée sans exposer un identifiant d'instance caché; audience générale encore limitée. |
| `op.shuffle` | Mélange déterministe | `SHUFFLE_DECK` avec le PRNG sérialisé du jeu | Même état/seed = même ordre; seul le générateur `xorshift32-v1` est pris en charge par ce pas. |
| `op.discard` | Défausse depuis main | Absente générique | Coût vs effet, choix du joueur, remplacement et événement. |
| `op.move_card` | Déplacement carte entre zones | `moveCard` version 1.0.0, commit via pipeline unifié | Référence de présence et audience validées; destination cachée exige audience privée. Pas de règles générales `PLAY_CHARACTER`, coûts, remplacements ou triggers de changement de zone. |
| `op.play_character` | Joue une carte depuis zone | Absente générique | Coût, permissions, limites de terrain et entrée en jeu. |
| `op.rest` / `op.ready` | Repos / redressement | Repos dans pipeline commun pour certaines commandes; primitive déclarative générique partielle/absente | Interactions avec restrictions et événements. |
| `op.modify_cost` / `op.set_base_power` | Caractéristiques | Absentes comme primitives générales | Évaluateur central et règles d'ordre à définir. |
| `op.life` | Ajoute/retire/réorganise Life | Combat dommage seulement | Trigger/secret, remplacement et top/bottom doivent être spécifiés. |
| `op.protect` / `op.restrict` | Permissions/prévention | Registre restreint | Portée, joueur, fenêtre, durée et remplacement vérifiés par règles. |
| `op.defer` | Capacité différée | Absente | Identité de source/turn/battle, condition de résolution et sérialisation. |

## Mots-clés officiels et métadonnées de combat

| ID stable | Mot-clé | Règle / interaction | État |
|---|---|---|---|
| `keyword.rush` | Rush | Attaquer le tour où le Character entre en jeu | Partiel, permissions de base testées synthétiquement (§10-1-1). |
| `keyword.rush_character` | Rush: Character | Limite la cible aux Characters adverses | Partiel (§10-1-6). |
| `keyword.double_attack` | Double Attack | Nombre de dommages fixé selon le texte; interactions Life/Trigger | Partiel (§10-1-2); refus en présence de Trigger non implémenté. |
| `keyword.banish` | Banish | Life touchée au Trash, sans Trigger | Partiel (§10-1-3). |
| `keyword.unblockable` | Unblockable | Interdit Blocker pour cette attaque | Partiel (§10-1-7). |
| `keyword.blocker` | Blocker | Option de repos et redirection après attaque | Action de combat implémentée; timing On Block absent (§10-1-4). |
| `keyword.double_attack`, `keyword.banish` combinations | Combinaisons | Traiter chaque dommage et destination conforme | Incomplet; aucune certification générale. |

## Sélecteurs et conditions actuellement encodés

Sélecteurs DSL observés : `OWN_ZONE`, `OWN_RESTED_DON`, `OPPONENT_CHARACTER` (puissance max/base ou current selon branche), `OWN_FIELD` (trait facultatif), `OWN_LEADER_OR_CHARACTER`. Conditions encodées : `ALWAYS`, `DON_AVAILABLE`, `HAND_AT_MOST`, `SOURCE_ATTACHED_DON_AT_LEAST`, `OPPONENT_CHARACTER_POWER_AT_LEAST`. Les conditions de couleur, nom, historique et beaucoup de zones/états restent à ajouter. Les définitions qui tentent de projeter publiquement des options depuis Main, Deck ou Life sont refusées par la validation DSL.

## Certification et protocole d'ajout

Statuts permis : `PLAYABLE_VERIFIED`, `DATA_VALID_EFFECT_PENDING`, `UNSUPPORTED_MECHANIC`, `AMBIGUOUS_RULE`, `INVALID_DATA`. OP06-009/013/017/018 sont certifiés dans le périmètre du laboratoire, avec leurs capacités obligatoires déclarées reliées aux scénarios officiels testés. ST04-016 est référencé et testé dans le pipeline Counter, mais reste `DATA_VALID_EFFECT_PENDING` jusqu'à validation dans un deck violet légal. Une capacité compilable n'est pas automatiquement testée; une capacité testée n'est pas automatiquement certifiée réglementairement.

Pour toute nouvelle série : ingestion de données → validation de définition → recherche des primitives inconnues → revue officielle/FAQ/errata → compilation DSL versionnée → tests unitaires et intégration → sauvegarde/projection → certification restrictive. Une mécanique inédite doit ajouter une primitive localisée et versionnée; aucune branche série/carte dans le noyau.
