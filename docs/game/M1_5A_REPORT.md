Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Rapport M1.5A

## Résultat

Les dix documents demandés sont livrés. Le moteur, `/game`, scraper, Prisma, données catalogue et services utilisateurs sont préservés. Aucun effet implémenté, aucun accès DB, push ou déploiement. Branche auditée : maintenance/catalog-rebuild ; modifications locales préexistantes conservées.

## Chiffres et preuves

- 1625 JSON examinés, dont 824 avec fiches candidates, anciennes générations incluses ; 67 sources historiques, 20849 observations, deux fichiers réparables seulement en mémoire et zéro erreur de lecture.
- 2667 numéros / 4179 variantes / 74 groupes / 485 variantes multigroupes. Tous les numéros/keys découverts dans les JSON sont dans le maître : coverage.numbersOutsideMaster et keysOutsideMaster vides. Pas de certification d'exhaustivité officielle.
- 56 catégories textuelles positives, non disjointes et non certifiées. Table compte séparément numéros/illustrations et conserve liste de représentants/regex.
- 15 écarts caractéristiques entre variantes ; 1978 différences de texte par numéro/champ/langue à revoir, pas autant de bugs prouvés. Les éditions/langues/errata doivent être arbitrées.
- Maître Life284 Leaders absents et block4179 absents ; Life139 numéros déjà résolu côté M0. Aucun changement du maître. 658 effets + Trigger séparés, 863 indices de paragraphes/marqueurs, 319 sans texte observé ne sont pas certifiées vanilla.

Preuves : [inventory.json](evidence/m1_5a/inventory.json), [mechanics.json](evidence/m1_5a/mechanics.json), [script reproductible](evidence/m1_5a/audit.ts). Hash maître `373045edebc1b43a02d382e65a48c4582f70fe7511ceb345cb2770de548a022e`. Les générations sont inventoriées mais ne gonflent pas les comptes de capacités du maître.

## Constat réel / décisions

M1.5 est déjà implémenté, et non seulement M1. Conserver API/déterminisme/instances/mapping/préparation/private projections/dispatch. Onze defs sans effets relues, deux specs sur trois autres ; aucune exécution des capacités. La déclaration capabilities ou un booléen FAQ ne vaut pas certificat runtime. Aucun combat ni gameplay complet.

Architecture retenue : IR typée versionnée + interpréteur déterministe dans même dispatch + opérations proposées/remplacements/commit + scheduler réglementaire par lots + continuations JSON + évaluateur unique. Les choix sont explicites et repris après reconnexion, les événements privés/publics distincts. Remplacement avant mutation, pas callback après KO ; séparation printed/base/current et coût/effect/cause indispensables.

Évolutions nécessaires : invariants Vie variable/face-up/Trigger hors zone, générations vs identité réglementaire, journaux de révélation historique, coûts interrompus non annulés arbitrairement, snapshots/pins immutable, fingerprint sémantique distinct des preuves, whitelist/certification. Toutes proposées, aucune appliquée dans ce jalon.

## Complexité et risques

Familles les plus délicates : remplacement multi-sujets + source sortante ; continus dépendants/seuils/base ; coûts alternatifs et paiement interrompu ; auto simultanés/cascades/On KO ; choix secrets/recherche/Vie/Trigger ; durées inter-tours et effet accordé/annulé. Une simple séquence de callbacks ne conserve ni choix ni contexte de batch/ordre ni reprise.

Réglementation consultée : v1.2.1 datée28/08/2026, FAQ OP10/12/17. Catalogue OP10/12 accessible ; catalogue OP17 échoue dans outil FR/EN, FAQ ne remplace pas texte intégral. Questions Q-E01..06 dans EFFECT_EDGE_CASES : elles empêchent certaines certifications, pas la définition de contrats.

Risque réseau futur : PRNG32bits essais uniquement ; acteur du noyau dépend caller ; pas autorisation/persistence CAS/transactions multiworker. Mobile/tablette/desktop partagent moteur ; aucun affichage, cache privé, animation ou nouvelle technologie graphique ajouté.

Futures extensions : série mécaniques connues change définitions/tests seulement ; nouvelle mécanique ajoute primitive whitelist versionnée et preuve, avec nouvelle version engine si timing inédit. Scénarios A/B documentés mais NOT_TESTED en l'absence d'interpréteur. Anciennes parties pin bundles, aucune migration silencieuse.

## Vérifications

| Contrôle exécuté | Résultat |
|---|---|
| Inventaire et cohérence / conservation empreintes métier | PASS |
| npm test | PASS — 115/115, zéro échec/skip |
| npx tsc --noEmit | PASS |
| npm run lint | PASS — zéro erreur, 99 avertissements existants |
| git diff --check et espaces des nouveaux documents | PASS |
| Build pendant M1.5A | NOT_TESTED — documents seulement |
| Effets futurs / UI / DB / réseau / appareils | NOT_TESTED |

Résultats courants et commandes dans [checks.json](evidence/m1_5a/checks.json). Tests d'effets futurs, concurrence serveur, UI/appareils, simulation complète : NOT_TESTED. Build M1.5 PASS est une preuve antérieure ; build non relancé pour cet audit documentaire. Aucun code application modifié.

Le contrôle des empreintes exclut `.DS_Store`, métadonnée Finder ayant changé pendant le travail ; tous les fichiers métier protégés sont identiques.

Deux erreurs initiales du lanceur d'audit (chemin relatif puis top-level await en mode CJS) ont été corrigées dans le seul script documentaire ; exécution finale PASS. Elles ne sont pas des erreurs du moteur.

## Livrables / suite

Les dix fichiers EFFECT_ENGINE_ARCHITECTURE, EFFECT_MECHANICS_MATRIX, EFFECT_RESOLUTION_SPEC, EFFECT_DSL_SPEC, EFFECT_EDGE_CASES, FUTURE_SET_COMPATIBILITY, CARD_COMPILATION_PIPELINE, PLAYABILITY_CERTIFICATION, EFFECT_IMPLEMENTATION_PLAN et ce rapport sont les documents créés. Les preuves d'audit sont sous evidence/m1_5a. Aucun fichier métier modifié.

M1.5A livré comme étude, pas comme couverture complète du catalogue. Éléments restant à vérifier : textes OP17 complets/errata, interprétation détaillée de batches/cycles, format/région/restrictions actualisés, adaptation power '-' selon règles, puis prototypes et tests des contrats proposés. Le prompt M1.5B prêt à copier figure dans EFFECT_IMPLEMENTATION_PLAN. M1.5B attend validation explicite et n'est pas lancé.
