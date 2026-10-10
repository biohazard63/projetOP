# Mugiwara V2 — installation et mode hors connexion

## Comportement

Manifest public : nom Mugiwara TCG, nom court Mugiwara, display standalone, navigation libre en portrait/paysage, icônes PNG 192 et 512 px et icône maskable 512 px. Dimensions vérifiées avec sips. Les anciens screenshots de manifest aux dimensions incorrectes ont été retirés ; aucune capture fictive déclarée.

Le worker est enregistré en mode production uniquement. Cache versionné mugiwara-public-v2-1, limité à offline.html et trois icônes statiques. Aucune page utilisateur, API, session, collection, liste ou résultat d’ouverture n’est mis en cache. En cas d’échec réseau d’une navigation, seul un écran public générique est affiché. Les actions métier nécessitent toujours le serveur. Les autres requêtes et mutations passent directement au réseau. Le worker ne consulte que son propre cache et ne purge que ses anciennes versions publiques.

Une mise à jour en attente propose Mettre à jour et Plus tard. Aucune activation forcée automatique ni rechargement automatique pendant une ouverture. L’interface est masquée sur booster-opening/opening-demo et pendant une cinématique ; avant activation, l’intention de l’utilisateur courant en sessionStorage est vérifiée. Une ouverture non confirmée bloque la mise à jour. Une première installation sans worker actif n’est pas présentée comme une mise à jour. Si toutes les fenêtres sont fermées, le cycle standard du navigateur peut activer un worker en attente : ce mécanisme ne crédite aucune carte.

## Démarrer et vérifier

Depuis cardgame : npm run build, puis npm run start. Ne pas lancer build et dev simultanément sur le même dossier .next. En développement npm run dev ne réenregistre volontairement pas le worker.

Le service worker nécessite un contexte sécurisé : HTTPS, ou localhost pour les tests locaux compatibles. Une adresse IP locale en HTTP permet de consulter l’interface sur le réseau, mais ne valide pas l’installation PWA. Aucun déploiement n’est effectué dans cette mission.

Chrome/Android compatible : bouton Installer lorsque beforeinstallprompt est proposé, ou menu du navigateur. Le refus est mémorisé lorsque le stockage est disponible. Profil fournit toujours une aide explicite.

iOS : dans Safari, Partager → Sur l’écran d’accueil → Ajouter. iPadOS peut se présenter comme un Mac ; la détection prend aussi les capacités tactiles en compte. Il n’existe pas de prompt automatique équivalent garanti sur iOS.

Ce travail prépare une PWA de navigateur, pas une publication App Store ou Google Play.

## Preuves et limites

Tests de politique du worker dans tests/pwa-policy.test.ts : liste publique, absence d’activation automatique, purge limitée au namespace, API et mutations hors cache, navigation privée hors ligne servie par un écran public.

tests/mobile-pages-pwa.browser.mjs vérifie la vraie inscription du worker, le contenu de CacheStorage et le passage hors ligne/retour en ligne sur la version compilée avec PostgreSQL isolée. Les interfaces de prompt et d’activation sont aussi exercées avec des événements/objets navigateur simulés ; ceci ne constitue pas une installation native réelle. L’aide iOS est contrôlée avec un user-agent iPhone dans Chrome, pas dans Safari physique.

Les appareils physiques, les safe areas réelles, le changement de version sur une PWA déjà installée et la vibration matérielle restent NOT_TESTED. Les journaux/captures et états détaillés sont dans MOBILE_V2_PROGRESS.md et evidence/phase-6-pwa/.

Ne jamais lancer les tests d’écriture avec une base réelle : le script navigateur vérifie strictement 127.0.0.1:55432/op_boosters_test. Aucune migration, ouverture ni modification de données exécutée sur Neon.
