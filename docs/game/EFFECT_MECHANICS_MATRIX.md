Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Inventaire et matrice de couverture

## Périmètre mesuré

- 1625 JSON inspectés récursivement hors node_modules/.next/.git et liens symboliques ; 824 contiennent des fiches candidates, générations comprises.
- 67 sources historiques de l'importateur : 20849 observations, 0 erreur de lecture. Liste, SHA-256, réparations non persistées dans [inventory.json](evidence/m1_5a/inventory.json).
- Maître : 2667 numéros, 4179 variantes, 74 groupes, 485 variantes multigroupes. Les groupes incluent des aliases historiques ; ce n'est pas un nombre d'extensions officielles certifiées.
- 56 catégories de détection positives. Elles se recouvrent ; leur somme n'est pas un nombre de capacités. Détection sur effet/ability/Trigger, originales FR/EN et traductions, pas uniquement le texte choisi du maître. Anciennes générations inventoriées séparément, pas multipliées dans les comptes du maître.
- 15 différences numéro/champ entre illustrations ; 1978 différences numéro/champ/langue après normalisation d'espaces dans les originales. Traductions, versions historiques, ponctuation et textes explicatifs peuvent expliquer ces écarts. Aucune adjudication sémantique automatique.
- 658 variantes possèdent effet et Trigger séparés ; 863 ont retours ligne ou marqueurs successifs détectés, indicateur incomplet des paragraphes (texte souvent concaténé). 319 sans aucun texte effet/ability/Trigger observé : ne pas certifier automatiquement vanilla.
- 284 Leaders sans Vie dans le maître, corrigés seulement dans le sidecar M0 ; 4 179 blocs absents du maître. Quinze écarts incluent de faux coûts de Leader et ST13-001 Counter 5000/null : revoir le champ source, ne pas fusionner par préférence arbitraire.

Méthode reproductible : depuis cardgame, `node --import tsx ../docs/game/evidence/m1_5a/audit.ts`. Ce script ne collecte rien, ne reconstruit pas le maître et ne touche pas la DB. Les identités hors maître sont listées dans `coverage` ; la couverture générale reste une analyse de données, pas une certification réglementaire.

## Taxonomie chiffrée

Les numéros et clés complets, patterns et états sont dans [mechanics.json](evidence/m1_5a/mechanics.json). Faux positifs possibles : mentions de capacité dans une cible, noms entre crochets pris pour conditions, épuisement mentionné sans opération. Le mot Trigger dans le texte ne prouve pas que la carte a un Trigger (FAQ OP17-105).

| Mécanique | Description | Numéros | Variantes | Exemples | Dépendances / risque | Complexité / mécanisme | Référence | M0/M1 |
|---|---|---:|---:|---|---|---|---|---|
| `ability.activated` | Activées (détection textuelle) | 634 | 958 | EB01-007, EB01-011, EB01-013 | État/zone et prédicats validés | Moyenne / primitive générique | 8-1-3-2 | Aucune capacité exécutée |
| `ability.replacement` | Remplacements (détection textuelle) | 72 | 110 | EB01-008, EB02-030, EB04-030 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 8-1-3-4 | Aucune capacité exécutée |
| `ability.conditional` | Conditions explicites (détection textuelle) | 907 | 1390 | EB01-001, EB01-002, EB01-003 | État/zone et prédicats validés | Moyenne / primitive générique | 8-3 | Aucune capacité exécutée |
| `ability.restriction` | Restrictions/protections (détection textuelle) | 163 | 282 | EB02-011, EB02-015, EB02-021 | État/zone et prédicats validés | Moyenne / primitive générique | 1-3-3;8-2 | Aucune capacité exécutée |
| `ability.zone` | Effets hors terrain (détection textuelle) | 145 | 246 | EB01-001, EB01-022, EB01-024 | État/zone et prédicats validés | Moyenne / primitive générique | 2-8;8-1-3-3 | Aucune capacité exécutée |
| `timing.play` | Jouée (détection textuelle) | 873 | 1518 | EB01-002, EB01-012, EB01-015 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-6 | Aucune capacité exécutée |
| `timing.attack` | En attaquant (détection textuelle) | 246 | 433 | EB01-001, EB01-003, EB01-004 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-5 | Aucune capacité exécutée |
| `timing.opponentAttack` | Attaque adverse (détection textuelle) | 56 | 83 | EB01-002, EB01-034, EB01-037 | État/zone et prédicats validés | Moyenne / primitive générique | 7-1-1;10-2-16 | Aucune capacité exécutée |
| `timing.block` | En bloquant (détection textuelle) | 25 | 42 | EB01-057, EB04-053, OP01-014 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-15 | Aucune capacité exécutée |
| `timing.ko` | En cas de KO (détection textuelle) | 152 | 205 | EB01-036, EB02-036, EB02-048 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-17 | Aucune capacité exécutée |
| `timing.trigger` | Déclenchement Vie (détection textuelle) | 510 | 756 | EB01-010, EB01-020, EB01-028 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-5 | Aucune capacité exécutée |
| `timing.end` | Fin de tour (détection textuelle) | 49 | 95 | EB01-021, EB01-022, OP02-001 | État/zone et prédicats validés | Moyenne / primitive générique | 6-6;10-2-7/8 | Aucune capacité exécutée |
| `timing.phase` | Frontières de phase (détection textuelle) | 96 | 163 | EB01-001, EB02-015, EB02-021 | État/zone et prédicats validés | Moyenne / primitive générique | 6 | Aucune capacité exécutée |
| `timing.counter` | Contre événement (détection textuelle) | 193 | 254 | EB01-009, EB01-010, EB01-019 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-4 | Aucune capacité exécutée |
| `condition.color` | Couleurs (détection textuelle) | 295 | 506 | EB01-021, EB01-033, EB02-010 | État/zone et prédicats validés | Moyenne / primitive générique | 2-3 | Aucune capacité exécutée |
| `condition.name` | Noms (détection textuelle) | 2352 | 3799 | EB01-001, EB01-002, EB01-003 | État/zone et prédicats validés | Moyenne / primitive générique | 2-1 | Aucune capacité exécutée |
| `condition.trait` | Types/traits (détection textuelle) | 822 | 1266 | EB01-001, EB01-002, EB01-009 | État/zone et prédicats validés | Moyenne / primitive générique | 2-4 | Aucune capacité exécutée |
| `condition.cost` | Coût (détection textuelle) | 919 | 1460 | EB01-001, EB01-009, EB01-013 | État/zone et prédicats validés | Moyenne / primitive générique | 2-7;4-9 | Aucune capacité exécutée |
| `condition.baseCost` | Coût de base (détection textuelle) | 44 | 72 | EB04-010, EB04-043, EB04-049 | État/zone et prédicats validés | Moyenne / primitive générique | 4-9 | Aucune capacité exécutée |
| `condition.power` | Puissance (détection textuelle) | 761 | 1155 | EB01-001, EB01-002, EB01-003 | État/zone et prédicats validés | Moyenne / primitive générique | 2-6;4-9 | Aucune capacité exécutée |
| `condition.basePower` | Puissance de base (détection textuelle) | 89 | 125 | EB01-010, EB01-011, EB01-061 | État/zone et prédicats validés | Moyenne / primitive générique | 4-9 | Aucune capacité exécutée |
| `condition.zoneCount` | Nombre dans une zone (détection textuelle) | 410 | 715 | EB01-003, EB01-022, EB01-024 | État/zone et prédicats validés | Moyenne / primitive générique | 3;8-3 | Aucune capacité exécutée |
| `condition.rested` | État actif/épuisé (détection textuelle) | 663 | 1091 | EB01-002, EB01-004, EB01-007 | État/zone et prédicats validés | Moyenne / primitive générique | 4-1/2 | Aucune capacité exécutée |
| `condition.don` | DON attachés/seuil (détection textuelle) | 223 | 394 | EB01-001, EB01-006, EB01-014 | État/zone et prédicats validés | Moyenne / primitive générique | 8-3-2 | Aucune capacité exécutée |
| `condition.turn` | Tour actif/adverse (détection textuelle) | 239 | 399 | EB01-014, EB01-021, EB01-022 | État/zone et prédicats validés | Moyenne / primitive générique | 8-3-2 | Aucune capacité exécutée |
| `condition.leader` | Identité Leader (détection textuelle) | 787 | 1188 | EB01-001, EB01-002, EB01-004 | État/zone et prédicats validés | Moyenne / primitive générique | 2-2;8-3 | Aucune capacité exécutée |
| `condition.history` | Historique d’action (détection textuelle) | 181 | 328 | EB01-004, EB01-006, EB01-017 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 8-1;8-6 | Aucune capacité exécutée |
| `operation.draw` | Pioche (détection textuelle) | 372 | 564 | EB01-011, EB01-013, EB01-022 | État/zone et prédicats validés | Moyenne / primitive générique | 4-5 | Aucune capacité exécutée |
| `operation.search` | Recherche/consultation (détection textuelle) | 233 | 425 | EB01-009, EB01-019, EB01-052 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 8-4;11-3 | Aucune capacité exécutée |
| `operation.reveal` | Révélation (détection textuelle) | 236 | 414 | EB01-019, EB01-029, EB02-008 | État/zone et prédicats validés | Moyenne / primitive générique | 11-2 | Aucune capacité exécutée |
| `operation.trash` | Défausse (détection textuelle) | 677 | 1116 | EB01-002, EB01-008, EB01-013 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-14 | Aucune capacité exécutée |
| `operation.move` | Déplacement (détection textuelle) | 898 | 1490 | EB01-009, EB01-011, EB01-019 | État/zone et prédicats validés | Moyenne / primitive générique | 3;4 | Aucune capacité exécutée |
| `operation.order` | Réorganisation (détection textuelle) | 305 | 542 | EB01-009, EB01-019, EB01-030 | État/zone et prédicats validés | Moyenne / primitive générique | 3-1-7;11-3 | Aucune capacité exécutée |
| `operation.modifyPower` | Modification puissance (détection textuelle) | 593 | 889 | EB01-001, EB01-002, EB01-003 | État/zone et prédicats validés | Moyenne / primitive générique | 4-9 | Aucune capacité exécutée |
| `operation.modifyCost` | Modification coût (détection textuelle) | 278 | 433 | EB01-001, EB01-031, EB01-033 | État/zone et prédicats validés | Moyenne / primitive générique | 4-9 | Aucune capacité exécutée |
| `operation.basePower` | Fixer puissance de base (détection textuelle) | 89 | 125 | EB01-010, EB01-011, EB01-061 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 4-9 | Aucune capacité exécutée |
| `operation.don` | Gestion DON (détection textuelle) | 828 | 1384 | EB01-001, EB01-002, EB01-006 | État/zone et prédicats validés | Moyenne / primitive générique | 6-4/5;8-3 | Spécification M0 ; exécution absente |
| `operation.rest` | Épuiser/redresser (détection textuelle) | 1304 | 2139 | EB01-002, EB01-004, EB01-006 | État/zone et prédicats validés | Moyenne / primitive générique | 4-1/2 | Aucune capacité exécutée |
| `operation.ko` | KO (détection textuelle) | 544 | 798 | EB01-008, EB01-010, EB01-013 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-1 | Aucune capacité exécutée |
| `operation.returnHand` | Retour main (détection textuelle) | 133 | 231 | EB01-020, EB01-021, EB01-026 | État/zone et prédicats validés | Moyenne / primitive générique | 3;4 | Aucune capacité exécutée |
| `operation.life` | Vie (détection textuelle) | 326 | 560 | EB01-003, EB01-040, EB01-050 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 3-10;7-1-4 | Aucune capacité exécutée |
| `operation.face` | Face visible/cachée (détection textuelle) | 56 | 89 | EB01-040, EB01-052, EB01-053 | État/zone et prédicats validés | Moyenne / primitive générique | 3;11 | Aucune capacité exécutée |
| `operation.play` | Jouer depuis une zone (détection textuelle) | 405 | 671 | EB01-009, EB01-013, EB01-020 | État/zone et prédicats validés | Moyenne / primitive générique | 6-5;8-4 | Aucune capacité exécutée |
| `operation.grant` | Accorder/retirer capacité (détection textuelle) | 256 | 406 | EB01-027, EB01-045, EB02-003 | État/zone et prédicats validés | Moyenne / primitive générique | 8-2 | Aucune capacité exécutée |
| `operation.negate` | Annulation (détection textuelle) | 13 | 24 | OP05-100, OP06-074, OP06-083 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 8-2 | Aucune capacité exécutée |
| `keyword.blocker` | Bloqueur (détection textuelle) | 352 | 589 | EB01-006, EB01-017, EB01-034 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-4 | Spécification M0 ; exécution absente |
| `keyword.rush` | Initiative (détection textuelle) | 102 | 217 | EB01-003, EB01-036, EB01-045 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-1/6 | Aucune capacité exécutée |
| `keyword.double` | Double attaque (détection textuelle) | 30 | 49 | EB02-018, EB04-023, OP01-068 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-2 | Aucune capacité exécutée |
| `keyword.banish` | Bannissement (détection textuelle) | 17 | 29 | OP01-067, OP01-121, OP02-095 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-3 | Aucune capacité exécutée |
| `keyword.unblockable` | Imblocable (détection textuelle) | 11 | 13 | EB04-024, OP15-047, OP15-070 | État/zone et prédicats validés | Moyenne / primitive générique | 10-1-7 | Aucune capacité exécutée |
| `duration.battle` | Tout le combat (détection textuelle) | 207 | 287 | EB01-019, EB01-028, EB02-059 | État/zone et prédicats validés | Moyenne / primitive générique | 7-1-5 | Aucune capacité exécutée |
| `duration.turn` | Tout le tour (détection textuelle) | 487 | 771 | EB01-002, EB01-003, EB01-004 | État/zone et prédicats validés | Moyenne / primitive générique | 6-6 | Aucune capacité exécutée |
| `duration.next` | Prochain tour/phase (détection textuelle) | 135 | 237 | EB01-001, EB02-010, EB02-011 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 6;8-1 | Aucune capacité exécutée |
| `usage.once` | Une fois par tour (détection textuelle) | 293 | 516 | EB01-002, EB01-007, EB01-008 | État/zone et prédicats validés | Moyenne / primitive générique | 10-2-13 | Spécification M0 ; exécution absente |
| `duration.while` | Tant qu’une condition (détection textuelle) | 0 | 0 |  | État/zone et prédicats validés | Moyenne / primitive générique | 8-1-3-3 | Aucune capacité exécutée |
| `duration.leave` | Jusqu’à sortie de zone (détection textuelle) | 50 | 90 | EB04-044, EB04-057, OP05-100 | État/zone et prédicats validés | Moyenne / primitive générique | 3-1-6 | Aucune capacité exécutée |
| `choice.alternative` | Choix/alternatives (détection textuelle) | 1438 | 2211 | EB01-001, EB01-002, EB01-003 | Présence, choix, cause, visibilité et fenêtres | Élevée / protocole spécialisé + primitives | 8-4 | Aucune capacité exécutée |

## Catégories qui nécessitent revue manuelle

Capacités permanentes : effet inconditionnel/conditionnel, protection, modification hors terrain, règles de construction, alias de nom/type/attribut ; pas de count certifié possible par simple pattern. Permission de jouer/attaquer, coût alternatif, condition dépendant d'un historique, « jusqu'à départ de zone », autres durées et déclencheurs de changements de ressources doivent être extraits manuellement en clauses. Début/fin de tour et phase sont recensés, mais une référence à une future Recharge n'est pas un déclencheur.

Aucune équivalence « alternative art = mécanique ». Tous les représentants sont des indices pour revue ; programmes compilés, exécutés et certifiés : zéro dans ce jalon. Les actions de base M1.5 existent, mais ne couvrent pas les capacités homonymes (pioche d'une phase ≠ effet de pioche).
