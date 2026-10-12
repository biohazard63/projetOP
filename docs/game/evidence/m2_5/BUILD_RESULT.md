# Résultat du build isolé M2.5

Commande finale exécutée avec le répertoire de travail explicitement fixé à `/private/tmp/m2_5-build.XIlTLS/cardgame/`. Les sources ont été synchronisées depuis `cardgame/` en excluant `.env*`, `.next`, `node_modules` et `.git`; la copie réutilise ses dépendances locales. Journal complet : `isolated-build-success.log`.

Résultat réel du build isolé final après l'ajout du sous-ensemble Counter Event Blast Breath :

```text
Next.js 15.5.27
Creating an optimized production build ...
Compiled successfully (build final après l'ajout des commandes Counter Event)
Linting and checking validity of types ...
Collecting page data ...
Generating static pages (41/41)
Finalizing page optimization ...
Collecting build traces ...
exit 0
```

Une tentative de build précédente avait échoué avec `getaddrinfo ENOTFOUND fonts.googleapis.com`; elle est conservée dans `isolated-build.log`. Deux commandes intermédiaires ont été lancées par erreur depuis le dossier source et ont utilisé son `.next`; la seconde a été interrompue par moi. Le build final ci-dessus est isolé. La vérification des processus locaux a été refusée par les permissions sandbox (`ps: operation not permitted`); aucun autre processus n'a été arrêté. Aucune dépendance ou configuration du dépôt n'a été changée pour contourner le téléchargement.
