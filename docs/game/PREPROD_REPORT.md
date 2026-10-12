# Préproduction M4 + M5 — mode libre, navigation `/play`, livraison

Date : 12 octobre 2026. Branche locale `feature/tcg-m5`. **Aucun push, aucun déploiement.** La production n'a pas été touchée.

## 1. Mode libre permanent — FAIT

- **Audit.** `validateEngineDeck` comparait `ruleset.date` (constante `2026-10-12`) à `restrictionWindow` (constante `2026-10-12 → 2026-10-12`). Il n'y avait donc **aucune expiration calendaire** : l'alerte « decks refusés dès le 13/10 » des rapports précédents était fausse et a été rectifiée. Aucune autre dépendance à la date du jour dans le moteur ou dans `/play` (seuls `createdAt`, `finishedAt` et l'identifiant de partie utilisent l'horloge).
- **`MUGIWARA_FREE`** (`cardgame/src/game/rulesets/free.ts`, format `FREE`) : pas de fenêtre, aucune liste officielle (ni bannissement, ni limitation, ni paire). C'est le ruleset par défaut des nouvelles parties (`engineRuleset()`).
- **Conservé.** Règles CR 1.2.1 : 1 Leader, 50 cartes, 4 exemplaires au plus, couleurs du Leader, règles DON!! et de combat. Seules les 331 cartes implémentées sont admises, et une capacité sans exécuteur est refusée. Légalité des commandes, sécurité et confidentialité sont inchangées.
- **Garde-fou.** Un ruleset `FREE` qui porterait une fenêtre ou des restrictions est refusé (`INVALID_FREE_FORMAT`). Le mode libre ne peut donc pas expirer.
- **Parties existantes.** Elles gardent le ruleset stocké dans leur état (`state.ruleset`), ce qui est testé pour les rulesets M4 (`m3-reviewed-subset-…`) et M5.
- **Futur format officiel.** `officialSubsetRuleset()` conserve l'instantané officiel du 12/10/2026 comme format distinct.
- Aujourd'hui, aucune des 9 cartes restreintes par Bandai n'est implémentée : les deux formats acceptent donc les mêmes decks. La différence est testée avec une restriction synthétique.
- **Tests** (`tests/game-free-ruleset.test.ts`, 8 tests) : créations de parties avec les trois decks de référence les 12/10/2026, 13/10/2026, 01/11/2026 et 28/02/2031 (horloge simulée) ; règles structurelles ; cartes non implémentées refusées ; parties M4/M5 existantes rejouables. Intégration PostgreSQL : `rulesetId = MUGIWARA_FREE` en base.

## 2. Lien `/play` dans la navigation — FAIT

- Entrée **« Jouer »** avec l'icône `Swords` (lucide), dans la barre latérale desktop, le menu mobile et la barre du bas mobile (6 entrées). `aria-current="page"` sur `/play`. Thèmes clair et sombre.
- Les autres entrées (Accueil, Boosters, Collection, Mes decks, Extensions, Historique, Profil) sont inchangées et vérifiées dans le navigateur.
- Authentification : `/play` redirige toujours vers `/login` sans session. Pendant une partie, le plateau (`z-index` 1000) passe au-dessus de la navigation (`z-index` 50), sans chevauchement.

## 3. Vérifications

| Contrôle | Résultat |
|---|---|
| `npm test` (workspace, mode libre et navigation compris) | **354/354 PASS**, preuves historiques inchangées (hachage) |
| Instantané du commit M4 + M5 seul (extrait de l'index, sans fichiers ignorés) | typecheck PASS, 345/346 (1 test ignoré volontairement : catalogue local absent) |
| typecheck / lint | PASS / 0 erreur (99 avertissements antérieurs) |
| Build depuis `git archive HEAD` + `npm ci` + `npm run vercel-build`, sans `.env` | PASS |
| Intégration PostgreSQL isolée | 4/4 |
| Navigateur (Chrome headless, émulation ; ni Safari ni appareil réel) | Dernier passage terminé (`evidence/m5/preprod/browser-3`) : **13/14**. L'échec (navigation, téléphone, thème sombre) vient de la limitation de connexion (10/10 min/IP) après des essais répétés ; isolément, le même scénario arrive sur `/play` 4 fois sur 4. Navigation thème clair et desktop clavier : PASS. Un passage final était en cours au moment du commit et n'est pas inclus. |

Points vérifiés en particulier : création de parties après le 12/10 (horloge simulée) ; trois decks de référence (navigateur : Luffy Interséries, Kaido, Luffy Équipage) ; victoire et défaite à l'écran ; navigation vers `/play` ; reprise après rafraîchissement ; confidentialité des réponses `/api/play/*` ; compatibilité des parties M4/M5 existantes.

**Défaut de livraison corrigé.** `m5Catalog.ts` importait `data/onepiece/game/m5-reviewed-cards.json`, que Git ignore. Un build Vercel aurait échoué ; le build local passait parce que `rsync` copie aussi les fichiers ignorés. Les données ont été copiées dans `cardgame/src/game/cards/m5-reviewed-cards.json` (fichier suivi) et l'original est conservé. Le build depuis `git archive` le confirme.

**Limitation de connexion.** NextAuth Credentials limite les connexions à 10 tentatives par 10 minutes et par IP (`src/lib/auth.config.ts`). Des essais rapprochés finissent redirigés vers `/login`. C'est voulu, pas un défaut de `/play`.

## 4. Base Neon `ep-jolly-waterfall-abgp5rsh` (PostgreSQL 17)

Analyse en lecture seule (`default_transaction_read_only=on`) :
- 5 utilisateurs, 4 074 cartes, 105 decks, 3 773 `UserCard`.
- 17 migrations enregistrées. **4 manquent** : `20261010180000_nullable_card_cost`, `20261010190000_nullable_set_release_date` (leurs `DROP NOT NULL` sont déjà effectifs, sans être enregistrés ; leur relecture est sans effet) et `20261012120000_engine_games`, `20261012180000_engine_bot_level`.
- `prisma migrate diff` (base → schéma du code) ne crée que `EngineGame`, `EngineCommand` et leurs index et clés étrangères. **Purement additif**, aucune modification ni suppression de l'existant.
- Cartes : 405 lignes `Card` se rattachent au moteur, **0 conflit** ; toutes les cartes des 3 decks de référence sont présentes. 319 des 331 définitions existent en base ; 12 manquent (ST22-004/008/009/010/013/014, EB03-002/019/030/040, P-110, P-119). Elles restent jouables dans les decks de référence, mais un joueur ne peut pas les posséder.

**Sauvegarde** : `~/mugiwara-backups/neondb-before-engine-migrations-20261012-200126.dump` (format custom, `pg_dump` 18.6, droits 600, SHA-256 `f5ed177b5511a76831e9b03cef597435b26ade0a467001544e2a16376348746a`). Restauration testée dans une base jetable : nombres de lignes identiques sur les 31 tables.

**Migrations : NON appliquées.** `prisma migrate deploy` a été bloqué par le contrôle de sécurité de Claude Code. Commande à lancer depuis `cardgame/` après confirmation que cette base est bien celle de la préproduction :

```bash
DATABASE_URL='<URL Neon directe, sans -pooler>' npx prisma migrate deploy
DATABASE_URL='<URL Neon directe>' npx prisma migrate status   # attendu : "Database schema is up to date"
```

Restauration en cas de problème (écrase la base cible) :

```bash
/opt/homebrew/opt/libpq/bin/pg_restore --clean --if-exists --no-owner --no-privileges -d '<URL Neon directe>' ~/mugiwara-backups/neondb-before-engine-migrations-20261012-200126.dump
```

Le mot de passe de cette base a circulé en clair dans la conversation : une rotation dans Neon est recommandée.

## 5. Git et Vercel

| Commit | Contenu |
|---|---|
| `37d0a1d` | M4 + M5 : `/play`, moteur côté serveur, bots, animations, catalogue, migrations, tests |
| `bc75ee0` | Ruleset permanent `MUGIWARA_FREE` |
| `d9ed7b3` | Entrée « Jouer » dans la navigation |
| (ce commit) | Rapports, passation et preuves M4/M5/préproduction |

M4 et M5 ont modifié les mêmes fichiers : un commit M4 seul ne compilerait pas, d'où un commit commun.

Hors des commits (préservés, non suivis) : `.DS_Store`, `cardgame/carteJson/nouvelle/`, les 3 maquettes PNG de `cardgame/public/images/`, et les passages navigateur de préproduction intermédiaires (`evidence/m5/preprod/browser`, `browser-2`, échecs du test lui-même) et le passage `final` encore en cours.

**Push : non effectué** (déploiement laissé de côté à ta demande). Points non vérifiables depuis ce poste (pas de CLI Vercel, pas de `gh`, pas de projet `.vercel` lié) :
1. **Branche de préproduction** : aucune branche n'est identifiée comme telle. Branches distantes : `main`, `game`, `maintenance/catalog-rebuild`, `feature/mugiwara-mobile-v2`, `feature/premium-collector-ui`, `v2_booster`, `vercel/react-server-components-cve-…` (cette dernière, créée par le bot Vercel, confirme l'intégration GitHub ↔ Vercel).
2. **Branche de production Vercel** : `main` par défaut, non vérifié. Aucun workflow GitHub Actions dans le dépôt.
3. **Base des déploiements Preview** : inconnue. Si la variable `DATABASE_URL` de l'environnement Preview pointe vers la base de production, une partie jouée en préproduction écrirait en production.
4. **Base Neon ci-dessus** : rien n'indique si c'est la préproduction ou la production.
5. **Root Directory Vercel** : le `vercel.json` est à la racine, mais `package.json` est dans `cardgame/`. Le réglage « Root Directory » du projet Vercel est à confirmer.

Pour débloquer :
- Confirmer dans Vercel (Settings → Git) la branche de production, et dans Settings → Environment Variables que `DATABASE_URL` (Preview) est distincte de celle de Production.
- Choisir le nom de la branche de préproduction. Je propose `preprod/tcg-m4-m5` : un nom neuf ne peut pas être la branche de production, son push ne crée qu'un déploiement Preview.
- Appliquer les migrations sur la base Preview, puis pousser.

Variables nécessaires à `/play` (noms seulement) : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (ou `AUTH_TRUST_HOST=true` sur Vercel). Fournisseurs facultatifs : `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_ID`/`SECRET`, `EMAIL_SERVER_*`, `EMAIL_FROM`, et un captcha s'il est configuré.

## 6. Tester sur la préproduction (une fois déployée)

1. Ouvrir l'URL Preview Vercel de la branche, puis se connecter.
2. Menu « Jouer » (barre du bas sur mobile, barre latérale sur desktop).
3. Choisir une difficulté et un deck de référence (ou « Lancer le tutoriel »), jouer, rafraîchir la page en cours de partie (reprise), puis gagner ou abandonner.
4. Vérifier dans « Statistiques » que la partie est comptée.

URL de préproduction : **inconnue et non vérifiée**.
