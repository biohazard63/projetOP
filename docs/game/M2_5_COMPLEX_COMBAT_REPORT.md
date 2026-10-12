# M2.5 — interruptions et combat complexe

**Verdict : PARTIAL.**

Les vérifications de présence déjà en place pour les réponses Blocker/Counter restent actives. Le combat est sérialisable par `GameState` et le KO de combat réutilise le scheduler M1.5D (preuve historique M2D). Le refus d'un Trigger pendant les dommages utilise le rollback transactionnel de `applyCommand` et a un test de non-mutation.

Les capacités qui déplacent l'attaquant ou la cible pendant les étapes, annulent le combat, créent des modificateurs de puissance en cours de bataille, et les remplacements simultanés/KO multiples restent incomplets. Aucun nouvel ordre n'est inventé pour ces cas. Les batailles reprennent après sérialisation uniquement pour le flux existant sans Trigger.

KO simple + ON_KO existe dans le laboratoire M1.5D/M2D; aucune certification nouvelle n'est attribuée. Remplacements concurrents : **NOT_IMPLEMENTED**.
