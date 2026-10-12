# M2D — rapport d'intégration

**Verdict : PARTIAL.** Un scénario de combat se connecte au scheduler M1.5D et reprend une capacité ON_KO synthétique après sérialisation. Aucun scénario complet combinant Counter Event, Trigger et capacités de combat officielles n'est certifié.

## Preuve bout en bout exécutée

Le test `M2D: confirmed battle KO enters M1.5D ON_KO scheduler and resumes after a private serialized choice` fait une attaque, passe Blocker/Counter, confirme un KO, capture un ON_KO défini pour `TEST-FUTURE-SET`, sauvegarde/recharge le JSON, puis répond au choix privé. La trace générée est [battle-onko-trace.json](evidence/m2/battle-onko-trace.json). Le test vérifie que l'adversaire ne voit pas l'identifiant du choix.

Le test M2C génère [leader-life-damage-trace.json](evidence/m2/leader-life-damage-trace.json), avec un événement Life sans identité de carte.

## Limites

La preuve ON_KO est synthétique. Les anciennes définitions M1.5D conservent leur comportement et le noyau ne branche aucune logique sur un code OP/EB/ST/PRB. Il manque les fenêtres automatiques d'attaque et On Block, Counter Events, Trigger, Double Attack, Banish, traitements de déplacements avant Damage, capacités simultanées déclenchées pendant le combat et une interaction complète issue de deux séries réelles. Aucun statut `PLAYABLE_VERIFIED` n'est ajouté.
