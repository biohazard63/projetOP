# Signalements de bugs et de cartes

Entrées : fiches de carte de `/play` (inspection et sélection), menu de partie et écran `/booster-opening` (fiche de carte et signalement général). L’envoi est réservé aux joueurs connectés.

Chaque signalement conserve la description, une copie des informations affichées de la carte (identité exacte, image, rareté, variantes, caractéristiques, textes), et un contexte filtré. Il ne conserve jamais le GameState, la graine, la main adverse, les cookies ou les paramètres de connexion. Les dernières actions jointes sont limitées aux types et numéros de séquence des vingt derniers événements visibles. Les informations signalées sont une observation du joueur, pas une correction automatique du catalogue.

Signalements privés : `/admin/reports`, depuis la vue d’ensemble `/admin`. Compteurs par statut, filtres par origine et catégorie, recherche côté serveur dans les cartes, descriptions et joueurs, tableau paginé avec détails et changement de statut. Les compteurs portent sur tous les résultats de la recherche et des filtres d’origine/catégorie, indépendamment de la page et du statut sélectionné. Le tableau défile dans son propre cadre sur mobile.

Configurer `REPORT_ADMIN_EMAILS` côté serveur avec les adresses autorisées séparées par des virgules. Aucune adresse autorisée par défaut. Cette variable ne doit jamais être préfixée `NEXT_PUBLIC_`. Toutes les pages `/admin`, ainsi que les API GET/PATCH, vérifient l’autorisation côté serveur. Le lien « Administration » apparaît dans la barre latérale et le menu mobile seulement après confirmation de l’accès par `/api/admin/access`. Quatre statuts : Nouveau, En cours, Corrigé, Non confirmé.

La migration additive `20261018120000_issue_reports` crée la table. Elle est appliquée en local ; pour toute autre base, **ne pas l’appliquer sans autorisation explicite**. Aucun signalement ne peut être enregistré avant son application ; le formulaire garde la description et affiche une erreur récupérable si le stockage est indisponible. Après autorisation, suivre la procédure de migration habituelle du projet (sauvegarde et contrôle des autres migrations en attente inclus).

Protection : validation Zod, contexte partie/ouverture appartenant au joueur, identifiant de requête unique par joueur pour les réessais, dix envois par quinze minutes selon le rate limiter mémoire existant, protection Origin sur POST/PATCH, accès privé et réponses non mises en cache. Le rate limiter reste local à chaque instance comme les autres limites actuelles du projet.

Vérifications ciblées : `node --import tsx --test tests/reports.test.ts tests/reports-http.test.ts`, `npm run typecheck`, lint des fichiers concernés. `node tests/admin-reports.browser.mjs` lance un serveur isolé avec un administrateur synthétique, des API simulées et une URL de base volontairement inaccessible, puis arrête ce serveur. Ce test ne lit aucun compte réel et ne modifie aucune base. Aucun test ne doit créer de signalement dans une base réelle sans autorisation.

## Activation locale — 18 octobre 2026

Sur autorisation explicite de l’utilisateur : sauvegarde locale protégée créée, migration `20261018120000_issue_reports` appliquée à PostgreSQL `localhost:5432/cardgame` uniquement. Le compte administrateur demandé existe en local ; son adresse a été ajoutée à `REPORT_ADMIN_EMAILS` dans la configuration locale ignorée par Git. Aucune base Neon ni configuration de production n’a été modifiée.

Préparation Neon : suivre `docs/maintenance/NEON_ADMIN_MIGRATION.md`. Aucune migration distante exécutée pendant la préparation.
