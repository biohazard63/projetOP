Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Plan de livraison testable

Aucune étape ci-dessous n'est commencée automatiquement. Le noyau M1.5 existant demeure intact pendant M1.5A.

| Jalon | Travaux bornés | Porte de sortie |
|---|---|---|
| M1.5B | Contrats fermés et validateurs, registry/pins, localisation/presence, opérations proposées/commit et continuité SELECT/ORDER, projections ; primitives MOVE/REST/READY/LOOK/REVEAL/DON attach minimal ; adaptation giveRestedDon | Déterminisme, JSON reprise à chaque choix, refus versions/primitives, aucun effet automatique non couvert, tous anciens tests PASS |
| M1.5C | Scheduler auto lots, coûts alternatifs/interrompus, replacements batch, usage, évaluateur continu/durées ; petits cas sourcés, pas tout catalogue | Marco/Shirahoshi d'abord quand textes/rulings complétés, Usopp/Tsuru/Kaku, cascades FIFO réglementaires, once/re-entry/privacy PASS |
| M2 | Combat intégré : déclaration/Block/Counter/dégâts/fin, Rush/DoubleAttack/Banish/Trigger, victoire complète | Interdiction premier tour, égalité, cibles quittant terrain, deck vide immédiat, Trigger hors zone/reprise, deux ordres et défaites simultanées PASS |
| M3 | Compilation et certification par lots, effets annulés/accordés, zones/noms spéciaux/construction ; nouvelles primitives seulement justifiées | Toutes clauses de chaque carte admise + FAQ/tests inter-séries ; matrice compilée/testée/jouable publiée, unsupported rejeté |
| M4 | Parties purement scriptées avec deux vrais decks couverts, tests longs/replay/properties/future sets | Partie complète référencée, conservation/confidentialité/reprise/versioning, aucun handler inconnu ; toujours sans UI tant que non autorisée |

M5 ultérieur : service autoritaire authentifié, CAS/transactions, journal privé/projections WebSocket, hasard sûr. Aucun raccordement à `/game` avant porte propre, aucune modification de Prisma à l'occasion d'un test pur.

## Stratégie de tests

Unitaires : coût possible/impossible/alternative/partiellement interrompu, conditions avant/après paiement, optional decline vs zero, sélection fixe/up-to, permutations, génération invalide, base/current/printed, annulé vs sans effet, restriction prioritaire, modes SNAPSHOT/DYNAMIC, durées battle/turn/nextPhase, retour terrain rétablit once.

Intégration pure : A actif/B adverse/C cascade et A/B mêmes contrôleur ; On KO activate avant sortie/resolve trash ; replacements self+autre simultanés ; DON rendu sur retrait ; événement Main/Counter même programme ; Trigger damage pause, Banish noTrigger ; actions hors fenêtre et rejeu aucun deuxième paiement ; restauration JSON au milieu de chaque choix.

Propriétés : générer séquences de commandes avec RNG injecté à graines fixes et shrink reproductible ; nombre122/uniqueness/localisation exacts ; state original inchangé en refus ; same seed+commands+pins mêmes hashes ; serialize/restore identité résultat ; échanger uniquement main/deck adverse ne doit pas modifier projection propre ni erreurs/LegalActions tant que situation publique et droits restent identiques. Éviter propriété trop forte si règle permet observer des cartes adverses.

Robustesse : limites AST/profondeur/résolution ; variables invalides, primitives/versions inconnues, token d'autre choix/joueur, commandes dupliquées ou version stale, boucles certifiées vs dépassement technique, snapshot/progHash corrompus, reconnection sans nouvelle attribution. Aucun timeout arbitraire→défaite.

Non-régression : tests existants M0/M1/M1.5 et collection/boosters/coins/decks sans DB ; future intégration stockage seulement base isolée autorisée. Tests transport, vraie concurrence DB, PWA/appareils et performances UI sont NOT_TESTED dans cette conception.

## Prompt directement utilisable pour M1.5B

> Implémente uniquement M1.5B après lecture des dix documents M1.5A et rapports M0/M1/M1.5. Étends le noyau `cardgame/src/game/core` existant, sans second moteur ni raccordement `/game`. Ferme les unions TypeScript/validateurs de registry, pins, opération, event, continuation et SELECT/ORDER. Introduis localisation exclusive des 122 instances et références de présence, avec migration explicite de snapshots v1 et tests de compatibilité. Réutilise applyCommand/getLegalActions/projectState ; ajoute ANSWER_CHOICE et la capacité giveRestedDon ST01-001/ST01-007 seulement, avec coût zéro, choix0..1, cible Leader/Character propre, once-per-turn et reprise idempotente. Les données M0 restent liées aux anciens IDs. Centralise les primitives strictement nécessaires aux mouvements/DON/visibilité ; aucun scheduler auto général, combat ou remplacement complexe avant M1.5C. N'active pas Blocker hors fenêtre de combat. Préserve confidentialité (options/logs/erreurs), seed privé et snapshot immuable. N'utilise pas eval, closures sérialisées, texte FR interprété, React/DOM/Prisma/transport. Toute règle incertaine bloque la capacité concernée, pas une règle inventée. Tests : choix zéro, self-target Nami, DON rested uniquement, once/re-entry selon règles, choix falsifié/adversaire/stale/rejoué, sérialisation en attente, conservation/déterminisme/projections et régression complète. Exécute tests, tsc, lint et build isolé ; produire M1_5B_REPORT avec preuves. Ne touche ni DB ni collection/boosters/coins/decks/UI/scraper, ne pousse ni déploie. Garde automaticPlayReady=false et refuse toute autre capacité non couverte.

## Arbitrage et réalisation M1.5B

La mission utilisateur postérieure au plan remplace l'activation ST01-001/ST01-007 par trois preuves synthétiques : ajout DON épuisé depuis deck DON, choix suspendu/reprise et remplacement. Cette livraison est décrite dans [M1_5B_REPORT.md](M1_5B_REPORT.md). Le prompt historique ci-dessus ne doit pas être exécuté automatiquement ; M1.5C attend validation.

## Suite après M1.5D

Le plan concret exécuté est `M1_5D_IMPLEMENTATION_PLAN.md` ; les preuves sont dans `evidence/m1_5d/`. Avant M2, achever les cas de paiements non couverts et la couverture des choix/sources signalés dans le rapport. Ne pas étendre Sabo aux KO groupés en appliquant simplement le traitement une victime plusieurs fois : la décision doit porter sur le lot conforme à la FAQ. M2 n'est pas commencé.
