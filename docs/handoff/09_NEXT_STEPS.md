# 09 — Prochaines étapes opérationnelles

Priorités au 12 octobre 2026, après M5 (`docs/game/M5_REPORT.md`, section 12). Aucune étape n'est commencée.

## P0 — Urgent
1. Préproduction : voir `docs/game/PREPROD_REPORT.md` (migrations Neon, branche, isolation Vercel à confirmer).
2. Revoir puis commiter le travail M4 + M5 (branche `feature/tcg-m5`). Cela demande une autorisation explicite.
3. Tester `/play` sur un iPhone (Safari) et un Android réels.

## P1 — Avant tout déploiement
1. Sauvegarder la base, puis appliquer les migrations additives `20261012120000_engine_games` et `20261012180000_engine_bot_level` (`prisma migrate deploy`) **avec autorisation**. Vérifier ensuite `migrate status`.
2. Remplacer la limitation de débit en mémoire par une limitation partagée si le serveur tourne en plusieurs instances.
3. Relire les journaux de preuves (chemins locaux) avant un push.

## P2 — Certification (C3)
- Corriger la révision de P-015 (attribut Wisdom), puis la certifier.
- Certifier les capacités déjà exécutables : Kaido ST04-001, Blast Breath, ST01-001/007, ST01-014, OP06-xxx, OP01-016. Chaque certification exige ses preuves et ses scénarios réels.

## P3 — Jeu (M6)
- Faits en M5 : animations pas à pas du bot, nom de la capacité dans les choix, bots à 3 niveaux, tutoriel, statistiques.
- Traduire dans le DSL des familles de capacités fréquentes, puis certifier par révision ; ajouter des Leaders d'autres couleurs pour certifier les 203 cartes M5 reconnues.
- Afficher les illustrations alternatives.
- Ajouter un délai d'inactivité et l'historique de fin de partie.
- Joueur contre joueur (`BattleInvite`), puis retrait programmé de l'ancien `/game`.
- Élargir le pool de cartes, sans branche par numéro de carte dans le noyau.

## Axe collection (indépendant)
Aucune modification en M4. La monnaie reste indépendante du jeu.
