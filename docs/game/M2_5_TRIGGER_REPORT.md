# M2.5 — Trigger et zone Life

**Verdict : NOT_IMPLEMENTED; refus sûr activé.**

Le retrait Life ordinaire demeure compatible avec les anciennes parties, mais une résolution de dommage qui rencontre un `triggerOriginal` non vide échoue explicitement avec `TRIGGER_RESOLUTION_NOT_IMPLEMENTED`. Le clone transactionnel de `applyCommand` conserve la bataille et toutes les cartes dans leur état d'avant la commande. Banish ne traite pas un Trigger et envoie la Life au Trash conformément à la règle du mot-clé.

Tests exécutés : refus explicite d'un Trigger et égalité JSON avant/après l'échec; Banish sans déclenchement. Aucun choix facultatif, projection de révélation, suspension/reprise ou résolution d'effet Trigger n'est pris en charge. Références officielles : Comprehensive Rules §§8-6-2, 10-1-3, 10-1-5. Statut général Trigger : **FAIL** au critère M2.5, comportement inconnu refusé sans mutation.
