# Problèmes restants

- Multijoueur : aucun serveur, matchmaking ni protocole de synchronisation. Création de partie à deux, reconnexion, déconnexion et tours synchronisés BLOCKED par absence d'implémentation. Ne pas présenter le solo comme du multijoueur.
- Effets : fonctions execute envoyées comme JSON, registre serveur absent. Activation réelle indisponible (501). Pas de nouvelle implémentation durant la maintenance.
- Règles du jeu : deck adversaire aléatoire potentiellement incomplet/illégal ; vie initiale fixe à 5 ; actions locales et serveur divergent ; les services ne constituent pas un moteur officiel complet. Combat exhaustif, triggers, counters et fin de partie NOT_TESTED.
- Collection : retrait non implémenté dans le parcours observé. Recherche et filtres testés sur fixtures ; validation du catalogue réel encore nécessaire.
- Boosters : trois générateurs, taux codés en dur et fallback modifiant les probabilités. Aucun reçu consommable/idempotent pour l'ajout ; un utilisateur peut ajouter/rejouer les identifiants d'autres cartes. À traiter avant toute économie payante.
- Dépendances : des vulnérabilités élevées transitives persistent (voir rapport npm final). Certaines n'ont aucun correctif disponible dans les versions compatibles ; Nodemailer corrigé exige une majeure hors peer NextAuth. Prisma majeur et ESLint 10 non migrés. NextAuth reste bêta.
- Rate-limit en mémoire, non distribué, sans purge bornée des clés ; IP issue des headers doit être contrôlée par le proxy. Protection concurrente du jeu et idempotence des écritures à renforcer.
- Banlist, exceptions de quatre exemplaires, leader bicolore particulier et propriété des cartes du deck ne sont pas toutes gérées.
- OAuth réel, email magique/SMTP et captcha externe BLOCKED faute de comptes/services de test dédiés ; aucun secret réel utilisé dans les scénarios.
- Historique Prisma maintenant versionné mais ancienne base non inspectée. Avant une migration sur des données réelles : sauvegarde vérifiée et comparaison du schéma, sans reset.
- Provisioning starter non entièrement atomique ; erreurs internes peuvent laisser des cartes/decks partiels. Le paramètre de template local doit rester administrateur.
- Nombreux avertissements ESLint et code mort restent, notamment panneaux de test, doublons de composants/booster generators et dépendances de hooks. Voir lint.log.
- PWA hors ligne et OAuth en mode installé NOT_TESTED. Le worker supprime les caches anciens pour protéger les sessions ; comportement hors ligne limité.
- Images distantes réelles, catalogue complet, importation externe, performances et accessibilité exhaustive NOT_TESTED. Optimiseur d'images désactivé dans la configuration existante.
- Vercel distant, configuration production, sauvegarde/restauration et intégration CI non vérifiés. Ne pas déployer sur la seule base de cet audit.
