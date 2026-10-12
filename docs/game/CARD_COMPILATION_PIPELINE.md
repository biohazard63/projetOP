Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Pipeline de préparation et compilation

Audit du scraper : `scrape-onepiece-fr.js` délègue à `scripts/catalog/sync-cli.ts`; `scraper.ts` extrait déjà Life/bloc/effet/Trigger/traits. `files.ts.observations` lit les sources avec réparation en mémoire NaN/virgules finales ; `core.ts` préserve variantes, éditions, anciennes IDs et originales. Aucun fichier scraper modifié ; aucun besoin de nouvelle collecte pour définir le moteur.

| Étape | Entrée → sortie | Validation/erreur |
|---|---|---|
| 1 Import local | JSON autorisé → observations SHA/source/langue | Limites taille/shape, malformed en quarantine sans effacer original |
| 2 Normaliser | observation → CardInput et printing/edition bindings | Numéro canonique connu, valeurs null≠0, Leader multicolore, Vie sidecar |
| 3 Réconcilier | anciennes+nouveaux → revision candidates | Artwork identique ne change pas règles ; réédition conserve appartenance ; conflits explicites |
| 4 Comparer | fingerprint sémantique → change report | Nom réglementaire, traits/couleurs/caractéristiques/texte/errata ; exclure image/langue/sourcehash du fingerprint |
| 5 Analyser | clauses officielles → capacité candidate | Auto/permanent/remplacement/coût/durée/cause/choix ; heuristiques = suggestions seulement |
| 6 Traduire DSL | candidate → AST relu | Original conservé ; texte FR ne pilote pas runtime ; chaque clause + Trigger couverts |
| 7 Dépendances | AST → primitive requirements | Version/règle manquante explicite, UNSUPPORTED_MECHANIC ou AMBIGUOUS_RULE |
| 8 Valider | AST → normalized typed IR | Scope bind, zones, types, integer, targets, durations, coût, guards, profondeur |
| 9 Compiler | IR → programme indexed + hash/source map | Instructions whitelist, no eval, stable order, no dynamic imports |
| 10 Tester | programme + fixtures → preuves | Scénarios positifs/négatifs/FAQ/interactions/property/privacy/replay |
| 11 Certifier | dossier de preuves → certification | Différent de validité deck ou disponibilité collection |
| 12 Publier local | bundle immutable + manifest → registre compatible | Pas publication réseau/production dans cet audit |

## Diagnostic précis

`{code, number, definitionRevision, printingKeys, clausePath, sourceHash, primitiveId, requiredVersion, rulesReference, severity, suggestedAction}`. Ne jamais mettre données de main adversaire dans diagnostic renvoyé au client. INVALID_DATA porte un champ précis ; une carte valide mais non exécutée reçoit EFFECT_PENDING et non INVALID_DATA. Revue automatique peut utiliser IA hors partie : résultat reste candidate non officiel.

Conserver les éditions multigroupes et le mapping legacyIds : compilation ne recrée pas Card Prisma. Le programme dépend du numéro réglementaire, pas du set d'où provient le booster. Les aliases de famille inconnus ne sont pas tronqués par regex pour entrer artificiellement dans adaptateur M0.

## Limites de l'existant à corriger dans un jalon autorisé

M0 compare JSON complet de définition : provenance Life/traduction peut créer un faux conflit. Prévoir fingerprint réglementaire séparé de preuve/illustration, sans assouplir rejet de vraie divergence. `requiredCapabilities` string[] et flags faqChecked/errataChecked ne prouvent pas présence d'un handler ni certification. Remplacer l'autorisation runtime par manifest vérifié, en conservant CardReview historique.

`base` absent du modèle brut n'est pas à inventer : printed vient caractéristique vérifiée ; base/current sont valeurs évaluées. Master null power officiel '-' pour un Personnage doit être résolu par source/règle avant moteur, pas défaut0 silencieux. Le schéma M0 exige puissance ; OP12-102 demeure à revoir pour admission malgré texte trouvé.

Tests proposés : répétition import prépare même semanticHash ; export partiel ne supprime pas defs précédentes ; art ajouté ne compte pas nouvelle mécanique ; errata crée révision ; source inconnue ne certifie pas ; primitive inconnue bloque jeu mais pas collection ; anciens IDs identiques avant/après. Aucun import DB ni génération catalogue exécuté pendant M1.5A.
