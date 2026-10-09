# Dépendances

Versions réellement verrouillées, avant/après ; aucune migration Next 16, React 20, Prisma 7/8, Tailwind 5, ESLint 10 ou TypeScript 7. Next initial 15.4.7, pas 15.4.10 ; React 19.1.1, Prisma 6.14.0, NextAuth beta.29.

| Dépendance | Initiale | Finale |
|---|---|---|
| @auth/prisma-adapter | 2.10.0 | 2.11.3 |
| @headlessui/react | 2.2.7 | 2.2.10 |
| @playwright/test | — | 1.64.0 |
| @prisma/client | 6.14.0 | 6.19.3 |
| @radix-ui/react-alert-dialog | 1.1.15 | 1.1.24 |
| @radix-ui/react-dialog | 1.1.15 | 1.2.0 |
| @radix-ui/react-dropdown-menu | 2.1.16 | 2.1.25 |
| @radix-ui/react-label | 2.1.7 | 2.1.16 |
| @radix-ui/react-select | 2.2.6 | 2.3.8 |
| @radix-ui/react-slot | 1.2.3 | 1.4.0 |
| @radix-ui/react-tabs | 1.1.13 | 1.1.22 |
| @radix-ui/react-toast | 1.2.15 | 1.2.24 |
| @tailwindcss/forms | 0.5.10 | 0.5.11 |
| @tailwindcss/postcss | 4.1.12 | 4.3.3 |
| @types/node | 24.3.0 | 24.19.1 |
| @types/react | 19.1.10 | 19.3.0 |
| @types/react-dom | 19.1.7 | 19.3.0 |
| @vercel/analytics | 1.5.0 | 1.6.1 |
| @vercel/edge | 1.2.2 | 1.3.3 |
| autoprefixer | 10.4.21 | 10.6.1 |
| bcryptjs | 3.0.2 | 3.0.3 |
| canvas-confetti | 1.9.3 | 1.9.4 |
| deepl-node | 1.19.0 | 1.28.1 |
| dotenv | 17.2.1 | 17.4.2 |
| eslint | 9.33.0 | 9.39.5 |
| eslint-config-next | 15.4.7 | 15.5.27 |
| framer-motion | 12.23.12 | 12.43.0 |
| fs | 0.0.1-security | retiré |
| next | 15.4.7 | 15.5.27 |
| next-auth | 5.0.0-beta.29 | 5.0.0-beta.32 |
| next-pwa | 5.6.0 | retiré |
| nodemailer | 6.10.1 | 8.0.11 |
| postcss | 8.5.6 | 8.5.29 |
| prisma | 6.14.0 | 6.19.3 |
| react | 19.1.1 | 19.1.9 |
| react-dom | 19.1.1 | 19.1.9 |
| react-hook-form | 7.62.0 | 7.89.0 |
| react-virtuoso | 4.14.0 | 4.18.16 |
| socket.io-client | 4.8.1 | 4.8.4 |
| sonner | 2.0.7 | 2.0.8 |
| tailwind-merge | 3.3.1 | 3.7.0 |
| tailwindcss | 4.1.12 | 4.3.3 |
| tsx | 4.20.4 | 4.23.15 |
| typescript | 5.9.2 | 5.9.3 |
| zod | 4.0.17 | 4.6.5 |

Les mises à jour compatibles dans les contraintes existantes ont également actualisé les dépendances transitives. Le verrou a été résolu dans un dossier temporaire neuf après ERESOLVE entre NextAuth beta.29 et les nouvelles exigences Nodemailer, puis copié et vérifié par npm ci. Une première utilisation de npm --prefix a produit un verrou incohérent ; elle a été abandonnée, sans --force ni --legacy-peer-deps. Le verrou final ne comporte aucune dépendance file: ou lien vers /tmp.

NextAuth beta.32 exige Nodemailer 7/8 ; Nodemailer 8.0.11 a été choisi après examen des peerDependencies. Migration majeure limitée à ce composant SMTP pour satisfaire le provider existant ; SMTP réel reste non testé. Le registre propose Nodemailer 10.0.16 sécurisé mais hors de la plage peer actuelle : pas de remplacement forcé.

next-pwa retiré car sa chaîne Workbox/Terser était obsolète et vulnérable ; conservation de l'installation PWA via un service worker de purge des caches. fs était un faux package npm inutile, le module natif Node reste utilisé par les scripts. PostCSS 8.5.29 imposé sous Next via override pour corriger ses dépendances anciennes ; build et tests vérifiés.

## Sécurité

Premier npm audit : 56 alertes (5 critiques, 42 élevées, 6 modérées, 3 faibles). Verrou final : consulter evidence/npm-audit-final.json ; le rapport distingue les paquets impactés des avis de vulnérabilité, qui peuvent compter plusieurs fois dans l'arbre.

Les alertes restantes portent sur Nodemailer et sa chaîne Auth, braces/micromatch/fast-glob via ESLint Next, deepmerge-ts via Prisma. Braces 3.0.3 est toujours la dernière version disponible constatée ; deepmerge-ts corrigé exige une majeure 8 incompatible non validée sous Prisma 6. Les chaînes de build/CLI doivent rester exposées uniquement à des configurations administrateur ; SMTP ne doit pas être considéré sécurisé simplement parce que credentials passe.

Sources primaires consultées : [avis Next.js](https://nextjs.org/blog/security-update-2025-12-11), [avis React Server Components](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components), métadonnées et avis npm obtenus par npm view/outdated/audit. Les versions retenues viennent des résultats actuels du registre, au-delà des minima des anciens avis.

## Commandes exécutées

npm ci --no-audit ; npm outdated --json ; npm audit --json ; npm view next@15/react@19.1/prisma@6 version ; installation ciblée Next/React/Prisma ; tentative npm audit fix --ignore-scripts (ERESOLVE, aucun --force) ; résolution coordonnée Auth/Nodemailer dans dossier neuf ; npm ci final. npm audit retourne un code non nul lorsqu'il reste des alertes : ce n'est pas un PASS sécurité global.
