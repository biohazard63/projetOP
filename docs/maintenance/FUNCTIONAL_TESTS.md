# Tests fonctionnels réellement exécutés

Serveur Next dev local sur 3007, PostgreSQL 16 Docker sur 55432, uniquement comptes example.test et 14 cartes synthétiques. Navigateur Chrome existant lancé via Playwright, desktop puis viewport 390×844. Les tests API utilisent de véritables requêtes et cookies ; ils ne remplacent pas une recette complète du catalogue réel.

## Résultats

| Scénario | Statut | Preuve |
|---|---|---|
| Public cards and sets | PASS | functional-results.json |
| Unauthenticated API protection | PASS | functional-results.json |
| Private pages redirect metadata | PASS | functional-results.json |
| Registration and normalized email | PASS | functional-results.json |
| Invalid registration types | PASS | functional-results.json |
| Login and session persistence | PASS | functional-results.json |
| Collection add and quantities persist | PASS | functional-results.json |
| Collection invalid payload | PASS | functional-results.json |
| Deck creation and load | PASS | functional-results.json |
| Deck ownership GET PUT DELETE | PASS | functional-results.json |
| Deck rejects forged types and quantities | PASS | functional-results.json |
| Deck update and activation | PASS | functional-results.json |
| Booster generation and add to collection | PASS | functional-results.json |
| Missing booster set is explicit | PASS | functional-results.json |
| Solo game initialization and isolated IDs | PASS | functional-results.json |
| Unsupported effects explicit | PASS | functional-results.json |
| Private pages redirect in browser | PASS | functional-results.json |
| Desktop navigation and JavaScript | PASS | functional-results.json |
| Collection search and type/color filters | PASS | functional-results.json |
| Mobile collection layout and images | PASS | functional-results.json |
| Deck delete | PASS | functional-results.json |
| Logout clears session | PASS | functional-results.json |

9 tests unitaires PASS ; aucun échec final. Ils vérifient règles de deck/leader/couleurs/quantités/variantes, captcha, octets bcrypt, rate-limit/verrou de login, mal d'invocation/capacité du terrain/tour et normalisation des couleurs. TypeScript PASS ; ESLint PASS (0 erreur, 130 avertissements) ; build de production PASS ; Prisma validate/generate PASS. Réinstallation npm ci PASS avec génération automatique du client et aucun lien temporaire.

16 migrations appliquées à op_recovery_migrations (base neuve distincte) : PASS. Comparaison avec schema.prisma : migration vide, aucun drift. Les données de l'ancienne base ne sont pas testées.

Le premier test de logout échouait parce qu'il attendait un objet alors que NextAuth renvoie null après déconnexion ; assertion corrigée puis scénario rejoué. Une redirection privée pouvait avoir HTTP 200 avec NEXT_REDIRECT à cause du streaming ; contrôle dans Chrome ajouté. Un rejeu durant hot reload a expiré, inspection indépendante puis rejeu stabilisé réussi. Ces essais intermédiaires ne sont pas présentés comme des régressions applicatives résolues sans preuve.

Production locale : 8 contrôles HTTP/Chrome PASS (home/login/register, cartes/sets, refus API anonyme, redirection privée et absence de pageerror). Preuve : evidence/production-smoke.json. Cela ne valide pas les sessions HTTPS de production.

## Limites et cas non accessibles

| Fonctionnalité | Statut | Raison |
|---|---|---|
| Google/GitHub OAuth réels | BLOCKED | comptes et credentials de test dédiés non fournis |
| SMTP/liens magiques | BLOCKED | service de test absent, configuration EMAIL_SERVER non active |
| Captcha externe réel | BLOCKED | provider dédié de test absent ; logique de refus testée |
| Retrait de cartes de la collection | BLOCKED | aucun parcours/endpoint de retrait implémenté identifié |
| Banlist et règles spécifiques complètes | NOT_TESTED | aucune validation exhaustive disponible |
| Probabilités officielles des boosters | NOT_TESTED | règles maison/fallback, absence de référence statistique validée |
| Ajout de booster idempotent et reçu inviolable | FAIL | les IDs valides fournis par client peuvent être rejoués ; revue du code |
| Effets de cartes réels | BLOCKED | fonctions non transportables en JSON, endpoint 501 |
| Deux joueurs, matchmaking, Socket.IO, reconnexion, états synchronisés | BLOCKED | aucun serveur/protocole multijoueur dans le dépôt |
| Combat exhaustif, counter/trigger, fin de partie complète | NOT_TESTED | tests limités au solo initialize/keep/end-turn et aux règles unitaires |
| PWA offline et OAuth installé | NOT_TESTED | worker de purge vérifié au code, pas de recette mobile installée |
| Images externes et catalogue réel | NOT_TESTED | images fixtures locales testées uniquement |
| Import/sync/traduction, backup/restore | NOT_TESTED | aucune écriture externe ni script destructif exécuté |
| Sessions sous HTTPS en production | NOT_TESTED | scénario credentials exécuté en dev ; cookies Secure exigent HTTPS |

Le PASS d'« Unsupported effects explicit » signifie seulement que l'erreur 501 est correctement retournée, pas que le moteur d'effets fonctionne. De même, initialisation solo PASS ne valide jamais le multijoueur.

## Commandes et incidents d'environnement

- git status/diff, branch creation, sw_vers, node/npm/git versions : exécutés ; branche créée après autorisation d'écriture .git.
- npm ci initial : PASS (868 paquets), avertissements d'obsolescence.
- npm outdated/audit en sandbox : DNS ENOTFOUND ; relancés avec autorisation réseau. Rapport initial conservé.
- prisma validate/generate initial : EPERM sur cache utilisateur, relancés avec autorisation ; client ARM64 généré.
- tsc initial sans génération : FAIL ; après génération et corrections : PASS.
- lint initial eslint src : FAIL (15 erreurs) ; commande npm réparée et erreurs corrigées ; PASS final avec avertissements.
- build initial : FAIL téléchargement Inter ENOTFOUND ; réseau autorisé, build puis build final PASS.
- Docker initial : moteur arrêté ; démarrage autorisé, conteneur test neuf ; db push uniquement sur op_recovery_test, migrate deploy uniquement sur op_recovery_migrations.
- npm audit fix compatible : ERESOLVE ; aucun --force ou contournement de peerDependencies. Verrou propre généré dans dossier neuf puis npm ci final PASS.
- npm audit final : code 1 attendu, 12 alertes élevées, zéro critique/modérée/faible ; sécurité globale reste FAIL.

Toutes les preuves sont dans evidence/. La capture mobile utilise uniquement des fixtures. Les bases et comptes de test sont conservés pour inspection.
