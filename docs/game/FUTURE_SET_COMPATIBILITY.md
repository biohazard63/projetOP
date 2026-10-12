Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Compatibilité des futures extensions

Aucune condition dans le noyau du type setCode==OP17. Extension est appartenance produit, identité réglementaire = numéro + révision validée. Illustration/édition est liée au même programme lorsque les règles sont identiques. Les anciens Card.id et quantités joueurs restent hors migration moteur.

## Scénario A — mécanismes connus

Fixture synthétique `TEST-KNOWN-001` (pas une vraie carte Bandai) : personnage rouge, caractéristiques complètes explicitement fixtures, auto On Play draw1. On ajoute une définition dans registre de test avec IR DRAW existant, refs fixture (jamais certification officielle), puis tests condition/main privée/défaite deck vide/replay. Ajouter ses artworks et édition ne change que printing bindings. Hash moteur/primitives identique, hash définitions différent. Acceptation : diff central zéro, mêmes événements pour anciennes defs, nouvelle carte seulement sous ruleset synthétique. Démonstration de conception, NOT_TESTED : moteur effects absent. Ne pas prétendre que canonicalNumber M0 accepte aujourd'hui ce nom fixture ; adapter fixtures hors catalogue officiel ou utiliser un numéro de fixture autorisé explicitement au test.

## Scénario B — mécanisme inédit

Une mécanique fictive X nécessite une opération absente. Import conserve carte/illustrations en collection et marque UNSUPPORTED_MECHANIC. Ajouter `effects/primitives/X.ts` et schéma args version1, registration whitelist, read/write/visibility/cost/rollback contracts et suite dédiée. Compiler à `EXTENSION opcg.X@1.0.0`. Noyau de scheduling/opérations ne reçoit aucune branche par série ; dispatcher spécialisé dans registre central versionné minimal. Si nouvelle sémantique de fenêtres requise, nouvelle version engine/DSL avec migration documentée, pas promesse « aucune modification jamais ».

Acceptation : primitive malformée/inconnue refusée, M0/M1/M1.5 inchangés, reprise avec ancien manifest encore disponible, nouveau jeu pin manifest, anciens jeux ne voient jamais X. Ce scénario est conçu, pas implémenté.

## Versions et sauvegardes

Pins : engineVersion, stateSchemaVersion, dslVersion, definitions hash, rulesVersion datée, ruleset hash/région/format/restrictions, primitive versions et errataRevision. Chaque partie conserve bundle immutable ou référence content-addressed disponible. Jamais `latest` en reprise. Nouvelle collecte ne réécrit aucun jeu.

Schéma1 existant continue via version1. Migration1→2 explicite seulement pour snapshot compatible et sans résolution en attente ; définie et testée avant livraison M1.5B. Impossible/inconnue => VERSION_INCOMPATIBLE, snapshot original conservé. ProgramHash/pc ne peuvent être traduits automatiquement vers nouveau programme en cours de choix ; reprendre ancien bundle ou procédure de migration spécifique vérifiée. Ne pas altérer quantité/ID collection ou deck sauvegardé.

Errata/restriction : nouvelles parties selon date/région ; parties existantes selon policy pins explicite, pas rétroactivité silencieuse. Mise à jour sécurité d'un moteur peut nécessiter suspension/migration contrôlée sans modifier issue d'une partie arbitrairement.

La présentation PC/mobile/tablette reste consommatrice des mêmes LegalActions/choices. Son, swipe, animation/PWA ne modifient jamais la compatibilité des définitions. Cache public assets seulement ; bundle autoritaire/état privé pas dans serviceworker public.

## Preuve exécutée M1.5C (2026-10-11)

Le test « future new card definition executes an actual attachment… » enregistre une carte fictive OP99-999@TEST-FUTURE-SET, son printing et son programme attachRestedDon dans le registre existant. Elle est jouée avec paiement par PLAY_CARD, active sa capacité, choisit un DON et un destinataire, attache réellement ce DON, puis sauvegarde/relecture JSON et compare deux exécutions. Aucune branche de série dans le noyau.

200 tests globaux PASS (158 antérieurs +42 M1.5C). Primitives inconnues et versions incompatibles refusées ; anciens programmes/sauvegardes préservés. Bundle laboratoire DSL1.1.0/engine m1.5c-1, définition de carte m15c-2026-10-11, règles1.2.1. Pas de remplacement automatique de définitions dans une partie sauvegardée, pas de certification officielle du jeu fictif. La prise en charge d'une mécanique nouvelle requiert toujours une évolution localisée/versionnée et des tests.

## Preuve M1.5D

La fixture OP99-999@TEST-FUTURE-SET est ajoutée aux définitions, illustrations de fixture, ruleset de test et registre déclaratif. Son ON_PLAY utilise l'attachement existant ; il est capturé, résolu et repris après JSON sans modifier le noyau. Des observations synthétiques de KO et des capacités simultanées emploient aussi la file. Cela prouve la réutilisation des primitives couvertes, pas la compatibilité automatique d'une mécanique inédite. Versions inconnues et primitives inconnues restent refusées.
