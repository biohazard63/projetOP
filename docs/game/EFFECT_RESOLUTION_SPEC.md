Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Spécification de résolution

Référence consultée : [Bandai v1.2.1, 28/08/2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), sections 1, 3, 8 à 11. Document de conception ; protocoles à tester avant activation.

## Les trois objets

Commande = intention authentifiée (pas un résultat client). Opération proposée = changement encore remplaçable avec cause/controller/source/sujets et batch. Événement confirmé = photographie d'un changement réellement effectué. Une tentative empêchée ne produit ni CARD_LEFT ni KO. Un NO_OP peut être conservé dans la trace privée, jamais assimilé à un événement déclencheur.

## Automate

1. Parser strictement enveloppe et version, dédupliquer acteur/clé/intention ; l'acteur devra provenir du serveur. Bloquer toute action étrangère pendant un choix, sauf politiques explicites futures.
2. Vérifier fenêtre, texte valide, conditions d'activation, interdictions et usage. Si effet invalidé, aucun choix/coût (8-2). Déclarer l'effet ; révéler si activation depuis la main (8-4).
3. Déterminer coûts et alternatives. Vérifier intégralement leur payabilité préalable. Paiement ordonné ; chaque opération peut rencontrer un remplacement et des traitements de règles. Si impossibilité survenue en cours de paiement, garder le paiement possible et ne pas résoudre le corps, gérer usage selon 8-3-1-3 et 10-2-13-5. Ne pas faire un rollback réglementaire de tout coût déjà payé ; distinguer refus initial, paiement interrompu et erreur technique de transition.
4. Activer, puis exécuter le programme dans l'ordre des clauses. Les choix du corps se font lorsqu'ils sont demandés en résolution (8-4-4), pas automatiquement au moment de la déclaration. « Puis » n'impose pas une dépendance de succès ; représenter explicitement « si vous le faites » par résultat d'opération.
5. Construire opération/batch simultané ; appliquer restrictions/protections, trouver remplacements admissibles. Présenter choix aux contrôleurs autorisés dans l'ordre réglementaire ; choisir n'est pas payer une activation par défaut.
6. Recalculer admissibilité après transformation. Commit du batch simultané dans un état cohérent, événements correspondants avec causes effectivement appliquées. Les mouvements depuis deck/DON suivent leurs instructions séquentielles, ne pas rendre toute séquence atomique par commodité.
7. Traitements des règles immédiatement aux occurrences prévues (9-1), même dans une résolution ; ne pas attendre la fin de commande pour détecter deck vide après une pioche avant un remélange.
8. Capturer activations automatiques pertinentes, fenêtres et conditions ; reprendre le parent après corps et enfants dans l'ordre 8-6. Émettre une projection autorisée, contrôler invariants à chaque frontière. Arrêter proprement si partie terminée.

## Remplacements

8-1-3-4 : priorité au remplacement de la carte qui génère la situation, puis ceux du joueur actif selon ses choix, puis ceux de l'autre. Chaque proposition garde l'ensemble des remplacements déjà appliqués : un même remplacement ne se réapplique pas à cette situation. Transformation peut créer une autre situation remplaçable, sans perdre causalité. Refuser remplacement inexécutable. Après remplacement d'une clause, poursuivre les clauses restantes. Une partie remplacée est attribuée au propriétaire de ce remplacement selon 8-1-3-4-7, indispensable pour les protections « effet adverse ».

Batch multi-carte : conserver l'opération groupe et sujets distincts ; jamais forEach(callback) qui ferait payer Marco deux fois ou oublier un sujet. Règle de défausse pour limite de terrain ≠ KO. Une protection de sortie par effet adverse n'interdit pas le coût auto-défausse de Kuzan.

## Ordre des automatiques

Une fenêtre retient un lot initial de capacités éligibles, la sélection du contrôleur et des lots différés ; l'ordre interne légal est une PendingChoice quand nécessaire. Ne pas trier par numéro/artwork.

Scénario 8-6-1 : actif A, non-actif B déclenchés ensemble ; A déclenche actif C → A puis B puis C. Scénario 8-6-1-1 : actif A et B ensemble ; A crée C → préserver B avant C selon cet exemple. Les nouveaux timings dus à activation attendent la résolution précédente (8-6-3). Pendant dégâts, automatiques ordinaires différés jusqu'au traitement complet, exception Trigger suspendant les dégâts (8-6-2). Représenter le curseur de dégâts restant dans la continuation.

Pas de droit général d'interrompre avec une carte Counter, pas de passes de priorité universelles. Les fenêtres de combat futures viennent de section 7. On KO est spécial : activation sur terrain avant mouvement, résolution dans Défausse (10-2-17) ; ne pas l'effacer avec la nouvelle présence. Une source d'auto ordinaire partie avant activation ne se comporte pas comme une ability déjà activée ; 8-1-3-1-3, 8-4-5.

## Choix différés et confidentialité

PendingChoice contient acteur, version, min/max exacts, options opaques, audience, continuation. SELECT : tokens uniques et présents ; ORDER : permutation exacte des options, aucun ajout/oubli ; OPTION : une branche légale ; NUMBER : entier borné. « Jusqu'à » permet zéro ; quantité fixe impose autant que possible ; zones secrètes filtrées ont exception 8-4-4-2. Coût insuffisant diffère d'un effet partiellement faisable.

Les options et bindings restent dans snapshot privé ; projection adversaire indique seulement joueur attendu et nature publique autorisée. Inspection d'une Vie adverse n'est visible qu'au joueur autorisé, sauf face publique. Autorisations temporaires expire après la résolution ; regarder n'est pas déplacer (11-3). Révélation ponctuelle photographiée, sans rendre publiquement traçables les cartes cachées après mélange.

Reprise JSON : version/pins/programHash/pc/options et présence validés. Même clé et même réponse → ack, aucune reprise supplémentaire ; autre réponse même clé → conflit ; ancien choiceId rejeté. Une déconnexion ne paie ni ne choisit ni ne termine la partie automatiquement. Politique de timeout produit indépendante et non définie ici.

## Interruptions, durées et limites

Fin de tour/combat a des sous-frontières explicites pour auto puis expiration selon 6-6/7-1-5 ; « prochaine Fin adverse » cible joueur et numéro de son prochain tour, pas un compteur +1 vague. Prohibition prochain redressement conserve cible présence et frontière Recharge désignée.

Once-per-turn : clé capacité + présence source + tour, avec règles d'activation/paiement interrompu (10-2-13). Revenir sur le terrain change la présence et rétablit l'éligibilité prévue, sans nouvel ID physique. Une source retirée ne supprime pas par défaut un effet temporaire déjà créé.

Limite technique de profondeur/steps : suspension `ENGINE_RESOLUTION_LIMIT`, sauvegarde privée et diagnostic, aucune victoire/nul automatique. Un cycle réglementaire démontré est traité avec choix de nombre d'itérations et procédure section 11-1 ; ne pas confondre boucle prouvée avec budget dépassé.

## Implémentation bornée M1.5B

Propositions, restrictions, commit DON, événements confirmés et choix JSON sont exécutables. Un seul remplacement admissible est accepté ; plusieurs => refus explicite, aucun ordre arbitraire. Les remplacements officiels optionnels et paiements interrompus ne sont pas livrés. Rollback technique de commande synthétique ne constitue pas la sémantique réglementaire d'un coût déjà payé. [Preuves et limites](M1_5B_REPORT.md).

## Implémentation M1.5C et écarts restants

Le chemin existant applyCommand -> copie privée -> opérations/choix -> validation -> publication est conservé. Capture d'un ON_PLAY uniquement après CARD_PLAYED confirmé. KO passe par une proposition PROPOSED, remplacement facultatif unique, suspension du choix au propriétaire, puis KO CONFIRMED ou KO REPLACED et TRASH_HAND CONFIRMED. Aucun CARD_KO pour un KO remplacé. Les traces réelles figurent dans EFFECT_RESOLUTION_TRACES.md.

REST_SOURCE et addPower n'ont pas encore de ProposedOperation unifié. Plusieurs ON_PLAY simultanés ou remplacements admissibles sont refusés, sans priorité arbitraire ; cette sécurité n'est pas une règle officielle et maintient le verdict PARTIAL. L'ordonnanceur général 8-6 et ON_KO/cascades restent à implémenter. Les règles cibles de ce document demeurent requises.

## Sous-ensemble M1.5D exécuté

Références : règles complètes 1.2.1, §§8-6-1, 8-6-1-1, 8-6-3 et 10-2-17 ; FAQ OP10-042 et OP10-058 pour les décisions d'ordre, FAQ OP10-042 pour les cascades. Les lots initiaux sont terminés avant les lots produits pendant leur résolution. Le joueur actif traite ses capacités du lot avant le non-actif. Plusieurs capacités du même contrôleur produisent un choix privé de la prochaine capacité ; aucun tri technique ne remplace cette décision.

ON_KO : conditions capturées sur le terrain pour le KO réellement confirmé ; résolution en défausse. Un KO empêché ou remplacé ne crée pas de capture ON_KO. Les générations et causes de confirmation sont conservées dans l'état autoritaire.

Paiement : §§8-3-1-1, 8-3-1-3, 8-3-1-3-1, 8-3-1-7 et 10-2-13-5. `INITIAL_UNPAYABLE` ne paie rien ; `INTERRUPTED` conserve les opérations confirmées et n'exécute pas le corps ; une erreur technique retourne une transition refusée et l'état d'entrée demeure intact. Les alternatives non exécutables sont refusées, pas choisies automatiquement.

Plusieurs remplacements éligibles : `REPLACEMENT_ORDER_NOT_IMPLEMENTED`. Plusieurs victimes d'une même opération KO : `KO_BATCH_NOT_IMPLEMENTED`. La FAQ OP05 précise que Sabo peut remplacer un lot de victimes ; le laboratoire actuel ne couvre pas ce cas et le refuse.
