# 03 — Historique des jalons

Les comptes ci-dessous reprennent les rapports enregistrés. Ils ne remplacent pas la vérification courante. Les statuts PARTIAL restent tels quels.

| Jalon | Objectif / résultat rapporté | Limites à conserver | Rapport |
|---|---|---|---|
| M0 | Normaliser les cartes, variantes et identifiants; fournir adaptation initiale et valeurs Leader vérifiées. Rapport historique de préparation du catalogue. | Le catalogue brut/extrait n’est pas un corpus entièrement relu; le rapport d’audit indique 2 667 numéros et 4 179 variantes à sa date, pas une certification de couverture. | `docs/game/M0_REPORT.md`, `M0_COVERAGE.md` |
| M1 | État déterministe sérialisable, instances, setup, mulligan, Life, projections et API pure. | Ne couvrait pas le jeu; tests de son époque seulement. | `M1_REPORT.md` |
| M1.5 | Phases de base et premières commandes/tours. | Combat et capacités encore limités. | `M1_5_REPORT.md` |
| M1.5A | Audit de conception DSL, familles d’effets, pipeline, versions, choix et futures séries. | Conception n’était pas preuve de code exécutable. | `M1_5A_REPORT.md` et spécifications `EFFECT_*` |
| M1.5B | Fondations sérialisables: opérations, `giveRestedDon`, choix différés/reprise, remplacement synthétique. | Primitive unique ne signifie pas moteur d’effets complet. | `M1_5B_REPORT.md` |
| M1.5C | Prototype vertical de capacités activées, déclenchées, continues et remplacements sur petit laboratoire. | Rapport PARTIAL; familles et cartes nombreuses non couvertes. | `M1_5C_REPORT.md`, matrices runtime/validation |
| M1.5D | Ordonnancement et pipeline, ON_KO et remplacements dans un sous-ensemble. | Respecter les refus explicites des situations réglementairement ouvertes. | `M1_5D_REPORT.md`, `evidence/m1_5d/` |
| M2 | Combat: attaque, Blocker, Counter Character, dégâts/fin de partie sur un sous-ensemble. | `M2_FINAL_REPORT.md` dit PARTIAL; ne pas extrapoler à Counter Events, Trigger ou combat complet. | `M2A…M2D_REPORT.md`, `evidence/m2/` |
| M2.5 | Extension des capacités de combat, mots-clés et Trigger, tests/scénarios. | Lire le verdict précis; ce jalon ne démontre pas tout le catalogue. | `M2_5_FINAL_REPORT.md`, lots et `evidence/m2_5/` |
| Universal Ability Engine | DSL 1.3, Main, Activate: Main, recherche du dessus, reveal, mélange, mouvement limité, profils OP06. Le rapport global reste PARTIAL. | Aucun moteur universel; recherche limitée, règles et coûts non exhaustifs. `ST04-016` Blast Breath reste en attente faute de deck violet légal vérifié. | `UNIVERSAL_ABILITY_ENGINE_REPORT.md`, matrices et preuves `evidence/universal-ability/` |
| M3 | Généraliser Counter Events/recherche, valider Blast Breath en deck violet légal, scénarios interséries, partie complète. | **PARTIAL, en cours localement.** Ajout du profil M3 et quatre tests ciblés. Pas de full suite post-M3, pas de deck légal/partie complète, pas de nouvelle certification établie. | `M3_ROADMAP.md`, `evidence/m3/`, présent handoff |

## Décisions d’architecture à préserver

Un seul noyau; definitions déclaratives au lieu de branches par numéro; types discriminés et validation runtime; état JSON; moteur déterministe; instance distincte du numéro canonique/printing; génération de présence; choix différés sans closure; projection privée; ruleset et DSL versionnés; refus sûr des capacités inconnues.

## Journaux historiques contradictoires

Le checkpoint Universal Ability Engine accumule plusieurs récits datés où le nombre de cartes certifiées varie. Pour le présent, seule la section `CURRENT STATE` ajoutée au début du checkpoint prévaut. Les sections suivantes restent historiques et ne doivent pas servir à annoncer l’état actuel sans vérification.
