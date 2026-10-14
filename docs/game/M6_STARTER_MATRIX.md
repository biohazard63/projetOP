# M6 — Matrice d'inventaire ST-01 à ST-36

## CURRENT STATE — fin de session M6 déblocage (14 octobre 2026)

Rapport : `docs/game/evidence/m6/starter-coverage-2026-10-14-m6c.txt`.

| Starter | Certifiées / uniques | /play | VF | Reste |
|---|---:|---|---|---|
| ST-01..ST-08, ST-11, ST-12, ST-14 | toutes | oui | partielle (pas d'impression FR archivée pour ST-01..ST-14) | — |
| ST-09 | 15/15 | oui (nouveau) | anglais | — (ST09-010 : GUARD en combat) |
| ST-10 | 19/19 | oui ×3 | anglais | — |
| ST-13 | 1/19 | non | — | Vies face visible |
| ST-15 | 15/15 | oui (nouveau) | officielle complète | — |
| ST-16 | 15/15 | oui (nouveau) | officielle complète | — |
| ST-17, ST-18, ST-19, ST-21, ST-23 | toutes | oui | officielle | — |
| ST-20 | 15/15 | oui (nouveau) | officielle | — |
| ST-22 | 0/17 | non | — | 17 cartes |
| ST-24, ST-27 | — | non | — | composition non vérifiée |
| ST-25 | 15/15 | oui (nouveau) | officielle | — |
| ST-26 | 15/15 | oui (nouveau) | officielle | — |
| ST-28 | 15/15 | oui (nouveau) | officielle | — |
| ST-29, ST-30, ST-35 | 0–1/15–17 | non | — | toutes leurs cartes propres |
| ST-31 | 15/15 | oui (nouveau) | officielle | — (OP04-016 coût 0 lu sur l'image officielle) |
| ST-32 | 0/15 | non | — | repos par effet, « ne peut pas être mis au repos », attributs |
| ST-33 | 0/15 | non | — | défausse par effet {Navy}, interdiction d'attaque jusqu'au End Phase |
| ST-34 | 1/15 | non | — | « choisissez un coût et révélez » |
| ST-36 | — | non | — | absent |

Totaux : 635 définitions, 475 certificats ; 25 produits / 27 configurations jouables. Validation : 770/770 tests, typecheck, lint, build isolé, diff-check PASS ; navigateur 22/22 PASS.

## CURRENT STATE — compositions auditées (14 octobre 2026)

Source : liste auditée de `scripts/rebuildStarterDecks.ts` + `scripts/starterAudit/product-evidence.json`. Rapport : `docs/game/evidence/m6/starter-coverage-2026-10-14.txt` (`scripts/game/starter-coverage.ts`).

| Starter | Certifiées / uniques | /play | Reste |
|---|---:|---|---|
| ST-01..ST-08 | 17/17 (ST-08 15/15) | oui | — (ST-03 corrigé : ST03-015 ×4, ST03-017 ×2) |
| ST-09 | 14/15 | non | ST09-010 Ace (remplacement K.O. en combat) |
| ST-10 | 19/19 | oui ×3 (un deck par Leader) | — |
| ST-11 | 15/15 | oui | — |
| ST-12 | 17/17 | oui | — |
| ST-13 | 0/19 | non | Vies face visible |
| ST-14 | 17/17 | oui | — |
| ST-15 | 3/15 | non | 12 cartes (restrictions d'ajout de Vie, « retiré du terrain ») |
| ST-16 | 4/15 | non | 11 cartes (effets différés, « ne se redresse pas », puissance proportionnelle) |
| ST-17, ST-18, ST-19 | 15/15 | oui | — |
| ST-20 | 2/15 | non | 13 cartes (Vie face visible, remplacement par Vie) |
| ST-21 | 17/17 | oui | — |
| ST-22 | 0/17 | non | 17 cartes |
| ST-23 | 15/15 | oui | — |
| ST-24, ST-27 | 0/15 | non | composition non vérifiée (porte de preuve) |
| ST-25 | 0/15 | non | 15 cartes (« retiré du terrain », attaque interdite par coût) |
| ST-26 | 5/15 | non | 10 cartes (DON retournés groupés, coût en main nommé) |
| ST-28 | 0/15 | non | 15 cartes (Vie → dessus du deck, coût dynamique) |
| ST-29, ST-30, ST-32..ST-35 | 0–1/15–17 | non | toutes leurs cartes propres |
| ST-31 | 4/15 | non | 11 cartes, dont OP04-016 (coût « - » officiel : bloqué) |
| ST-36 | — | non | absent (quantités non publiées) |

Totaux : 552 définitions, 387 certificats ; 244 cartes uniques non certifiées. Validation : 687/687 tests, typecheck, lint, build isolé, diff-check PASS ; navigateur 18/18 PASS.

## CURRENT STATE — reprise Codex (13 octobre 2026)

| Starter | Cartes locales / defs | Certifiés | Composition (Leader + 50) | /play | Résultat courant |
|---|---:|---:|---|---|---|
| ST-01 | 17 / 17 | 17 | oui | oui | PASS antérieur conservé |
| ST-02 | 17 / 17 | 17 | oui | oui | PASS antérieur conservé |
| ST-03 | 17 / 17 | 17 | ambiguë (2 entrées) | non | BLOCKED composition |
| ST-04 | 17 / 17 | 17 | oui | oui | composition résolue; partie bot PASS |
| ST-05 | 17 / 17 | 17 | ambiguë (2 entrées) | non | BLOCKED composition |
| ST-06 | 17 / 17 | 17 | oui | oui | composition résolue; partie bot PASS |
| ST-07 | 17 / 4 | 0 | oui | non | PARTIAL; effets Life non compilés |
| ST-08 | 15 / 9 | 0 | oui | non | PARTIAL; 5 profils d'effets exécutables, autres non couverts |
| ST-09 | 15 / 4 | 0 | incomplète (13 entrées) | non | BLOCKED extraction |
| ST-10 | 19 / 0 | 0 | invalide/non résolue (3 Leaders, 56 cartes principales) | non | BLOCKED manifeste |
| ST-11 | 15 / 0 | 0 | incomplète (9 entrées, 37 cartes principales) | non | BLOCKED extraction |
| ST-12 | 17 / 4 | 0 | ambiguë (3 entrées) | non | BLOCKED extraction |
| ST-22 | — / — | 0 | liste présente, données de cartes absentes localement | non | BLOCKED source |

Comptages runtime vérifiés : **404 définitions / 207 certificats**. Les références ST-04 “All-Star 'Calamity'”→ST04-014 et ST-06 “Navy Headquarters”→ST06-017 sont consignées comme alias vérifiés dans `starterCompositionResolution.ts`; Desert Spada/Perfume Femur et Shishi Odoshi Goshojimaki/Armor Mode restent ambigus. Aucune quantité de base n'a été lue pendant cette reprise; la composition a été extraite sans exécuter `rebuildStarterDecks.ts`.

Tests ciblés ST-08 : 5/5 PASS. Test d'intégration bots ST-04/ST-06 : PASS. Navigateur desktop/mobile : NOT TESTED (aucun browser Playwright installé). Validation finale reprise : 469/469 tests PASS, typecheck PASS, lint 0 erreur / 99 avertissements préexistants, build isolé PASS, `git diff --check` PASS. Aucun artefact de preuve historique n'a été modifié.

Les états `CURRENT STATE` plus bas sont historiques.

## CURRENT STATE — fin des lots A, B, C (13 octobre 2026, Claude Code) — voir `M6_HANDOFF.md`

- **ST-01 à ST-06 : 102/102 numéros certifiés** (399 définitions, 207 certificats). Decks proposés dans `/play` : `starter-st01`, `starter-st02` (compositions exactes résolues). ST-03..ST-06 : cartes certifiées, decks bloqués par des noms non résolus dans `scripts/rebuildStarterDecks.ts` (correspondances proposées dans `M6_HANDOFF.md`, non appliquées).
- Validation finale réelle : `npm test` 459/459, typecheck PASS, lint 0 erreur / 99 avertissements, build isolé PASS, `git diff --check` PASS, preuves historiques inchangées. Tests navigateur des Starter Decks : **non faits**.

## CURRENT STATE — audit local `cardJson` du 13 octobre 2026

Les caractéristiques/textes viennent de `cardgame/carteJson/`; les compositions avec quantités sont stockées dans la base par `DeckVersion.cards → DeckCard.quantity`, et listées dans `cardgame/scripts/rebuildStarterDecks.ts` jusqu'à ST-28. Le script est une opération de reconstruction destructive; il n'a pas été exécuté. Il ne couvre pas ST-29..ST-36. Audit de `cardJson` : **59 fichiers JSON, 4 318 lignes, 2 667 numéros canoniques candidats**; fichiers pour **35/36** codes, ST-22 absent. La composition ST-22 est néanmoins présente dans le script, mais ses fiches locales manquent.

| Starter | Lignes locales | Numéros uniques | Leaders dans le fichier | Connus par le moteur | Certifiés | Effets locaux non certifiés | État |
|---|---:|---:|---:|---:|---:|---:|---|
| ST-01 | 17 | 17 | 1 | 17 | 5 | 12 | partiel; script liste 1 Leader + 50 cartes; profils DSL ciblés, sans certification nouvelle |
| ST-02 | 17 | 17 | 1 | 6* | 0 | 13 | partiel; script liste 1 Leader + 50 cartes; Killer ajouté mais non testé |
| ST-03 | 17 | 17 | 1 | 6 | 0 | 13 | partiel |
| ST-04 | 17 | 17 | 1 | 7 | 5 | 12 | partiel |
| ST-05 | 17 | 17 | 1 | 5 | 5 | 12 | partiel |
| ST-06 | 17 | 17 | 1 | 5 | 0 | 13 | partiel |
| ST-07 | 17 | 17 | 1 | 4 | 0 | 13 | partiel |
| ST-08 | 15 | 15 | 1 | 4 | 0 | 11 | partiel |
| ST-09 | 15 | 15 | 1 | 4 | 0 | 11 | partiel |
| ST-10 | 19 | 19 | 3 | 1 | 1 | 18 | partiel |
| ST-11 | 15 | 15 | 1 | 4 | 0 | 11 | partiel |
| ST-12 | 17 | 17 | 1 | 4 | 0 | 13 | partiel |
| ST-13 | 35 | 19 | 3 | 0 | 0 | 19 | partiel; variantes/réimpressions présentes |
| ST-14 | 17 | 17 | 1 | 3 | 0 | 14 | partiel |
| ST-15 | 15 | 15 | 1 | 3 | 3 | 12 | partiel |
| ST-16 | 15 | 15 | 1 | 1 | 0 | 14 | partiel |
| ST-17 | 15 | 15 | 1 | 3 | 0 | 13 | partiel |
| ST-18 | 15 | 15 | 1 | 1 | 1 | 14 | partiel |
| ST-19 | 15 | 15 | 1 | 3 | 0 | 13 | partiel |
| ST-20 | 15 | 15 | 1 | 3 | 0 | 13 | partiel |
| ST-21 | 32 | 17 | 1 | 5 | 5 | 12 | partiel; variantes/réimpressions présentes |
| ST-22 | — | — | — | — | — | — | BLOCKED: fiche locale `cardJson` absente; composition présente dans le script |
| ST-23 | 15 | 15 | 1 | 2 | 2 | 13 | partiel |
| ST-24 | 15 | 15 | 1 | 0 | 0 | 15 | partiel |
| ST-25 | 15 | 15 | 1 | 2 | 0 | 14 | partiel |
| ST-26 | 15 | 15 | 1 | 3 | 2 | 12 | partiel |
| ST-27 | 15 | 15 | 1 | 2 | 0 | 14 | partiel |
| ST-28 | 15 | 15 | 1 | 0 | 0 | 15 | partiel |
| ST-29 | 31 | 17 | 1 | 3 | 0 | 15 | partiel; variantes/réimpressions présentes |
| ST-30 | 34 | 17 | 1 | 2 | 1 | 15 | partiel; variantes/réimpressions présentes |
| ST-31 | 15 | 15 | 1 | 2 | 2 | 13 | partiel |
| ST-32 | 15 | 15 | 1 | 1 | 0 | 14 | partiel |
| ST-33 | 15 | 15 | 1 | 3 | 0 | 13 | partiel |
| ST-34 | 15 | 15 | 1 | 1 | 1 | 14 | partiel |
| ST-35 | 15 | 15 | 1 | 0 | 0 | 15 | partiel |
| ST-36 | 15 | 15 | 1 | 1 | 0 | 14 | partiel |

Les nombres « connus » et « certifiés » comparent les numéros canoniques à `engineCatalog()`; « effet local non certifié » compte les numéros ayant au moins un texte `effect` ou `trigger` non certifié. Les compositions proviennent des lignes DB et, pour ST-01..ST-28, de la liste de quantités du script. L'interrogation locale DB a échoué (`localhost:5432` injoignable), donc les quantités persistées n'ont pas été comparées aux entrées de script. Le * indique le profil Killer ajouté depuis ST-02; son catalogue courant n'a pas été retesté.

Les comptes de lignes et de numéros canoniques reproductibles sont conservés dans [`starter-source-inventory.json`](evidence/m6/starter-source-inventory.json).

Les profils locaux compilés depuis `cards-ST-01.json` couvrent les douze numéros à effet par programmes/scénarios ciblés, sans certification nouvelle. Cinq cartes gardent leurs certificats préexistants; les profils locaux restent `faqChecked=false` et `errataChecked=false`. Le manifeste de `rebuildStarterDecks.ts` contient pour ST-01 1 Leader + 50 non-Leaders, mais la base n'a pas été interrogée et le deck n'est pas certifié complet.

### ST-02 — progression sans test intermédiaire

Le manifeste de reconstruction liste 17 noms avec quantités totalisant 51 exemplaires (1 Leader + 50 autres). Le fichier `cardJson` contient 17 numéros. Le moteur avait cinq profils ST-02 reconnus; `ST02-005 Killer` a été ajouté depuis la source locale avec une définition On Play et Trigger et le sélecteur générique « Character adverse reposé, coût ≤3 ». Ce changement n'a pas été testé/typé après ajout; la carte reste non certifiée. Les autres capacités ST-02 restent à compiler ou sont hors couverture. Aucune exécution du script de reconstruction n'a eu lieu.

La table ci-dessous est l'état historique du 12 octobre et n'est pas la matrice locale courante.

Calcul effectué depuis `engineCatalog()` le 12 octobre 2026. « Reconnu » compte les numéros canoniques présents dans le catalogue; « Certifié » compte les révisions avec enregistrement explicite de certification. Ces colonnes ne sont **pas** une mesure de complétude du contenu du Starter Deck. Aucun nombre n'est fourni pour le total imprimé d'un produit : la liste complète de chacun des 36 produits n'est pas intégrée ici.

| Starter | Reconnu | Certifié | État de l'inventaire |
|---|---:|---:|---|
| ST-01 | 8 | 5 | partiel |
| ST-02 | 5 | 0 | partiel |
| ST-03 | 6 | 0 | partiel |
| ST-04 | 7 | 5 | partiel |
| ST-05 | 5 | 5 | partiel |
| ST-06 | 5 | 0 | partiel |
| ST-07 | 4 | 0 | partiel |
| ST-08 | 4 | 0 | partiel |
| ST-09 | 4 | 0 | partiel |
| ST-10 | 0 | 0 | absent |
| ST-11 | 0 | 0 | absent |
| ST-12 | 4 | 0 | partiel |
| ST-13 | 0 | 0 | absent |
| ST-14 | 3 | 0 | partiel |
| ST-15 | 0 | 0 | absent |
| ST-16 | 0 | 0 | absent |
| ST-17 | 0 | 0 | absent |
| ST-18 | 0 | 0 | absent |
| ST-19 | 0 | 0 | absent |
| ST-20 | 0 | 0 | absent |
| ST-21 | 5 | 5 | partiel |
| ST-22 | 6 | 0 | partiel |
| ST-23 | 0 | 0 | absent |
| ST-24 | 0 | 0 | absent |
| ST-25 | 0 | 0 | absent |
| ST-26 | 0 | 0 | absent |
| ST-27 | 0 | 0 | absent |
| ST-28 | 0 | 0 | absent |
| ST-29 | 3 | 0 | partiel |
| ST-30 | 2 | 1 | partiel |
| ST-31 | 0 | 0 | absent |
| ST-32 | 0 | 0 | absent |
| ST-33 | 0 | 0 | absent |
| ST-34 | 0 | 0 | absent |
| ST-35 | 0 | 0 | absent |
| ST-36 | 0 | 0 | absent |

Totaux de ces 36 préfixes : **71 numéros reconnus**, dont **21 révisions certifiées**. Les certifications globales incluent aussi les séries OP/P et d'autres numéros hors de cette matrice; après le lot M6 ci-dessous, elles sont 120.

Après le lot M6 du 12 octobre 2026, les chiffres ST restent **71 numéros reconnus et 21 révisions certifiées** : Otama, Caribou et Nami sont OP-01; Luffy OP06-013 est une carte OP. **Aucun starter n'est complet ni nouvellement débloqué.** Les 120 certifications globales comprennent ces quatre profils/révisions OP, mais ne doivent pas être additionnées au total ST.

## Prochaine étape pour une certification de deck

Lire en local les enregistrements `DeckCard.quantity` par `DeckVersion` et les joindre à `Card`/aux numéros canoniques, puis comparer ces compositions enregistrées aux fiches locales. Distinguer les decks déjà créés dans l'application des listes officielles de produit. Réconcilier chaque numéro et variante avec une définition; exécuter ensuite la validation de construction puis une partie contre un deck de couverture équivalente. Refuser la certification au moindre effet obligatoire non compilé. La lecture locale reste à faire lorsque le service PostgreSQL local sera disponible; ne pas interroger la production pour contourner ce blocage.
