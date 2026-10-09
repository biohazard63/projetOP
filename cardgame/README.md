# 🏴‍☠️ One Piece Card Game

Maintenance du 9 octobre 2026 : consulter le [guide de récupération Mac](../docs/maintenance/RECOVERY_GUIDE.md), le [diagnostic](../docs/maintenance/AUDIT.md) et les [tests vérifiés](../docs/maintenance/FUNCTIONAL_TESTS.md). Certaines commandes et promesses ci-dessous sont historiques ; les guides de maintenance font foi pour le démarrage actuel.

Une application web pour gérer votre collection de cartes One Piece, construire des decks et jouer en ligne.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies utilisées](#-technologies-utilisées)
- [Installation](#-installation)
- [Structure du projet](#-structure-du-projet)
- [Commandes disponibles](#-commandes-disponibles)
- [Base de données](#-base-de-données)
- [Sauvegarde et restauration](#-sauvegarde-et-restauration)
- [Déploiement](#-déploiement)
- [Contribution](#-contribution)
- [Licence](#-licence)

## ✨ Fonctionnalités

- **Authentification** : Inscription et connexion des utilisateurs
- **Collection de cartes** : Visualisation et gestion de votre collection
- **Filtres et tri** : Filtrage par type, couleur, rareté et set
- **Détails des cartes** : Vue détaillée avec toutes les informations
- **Construction de deck** : Création et gestion de decks
- **Ouverture de boosters** : Simulateur d'ouverture de boosters
- **Jeu en ligne** : Jouez contre d'autres utilisateurs

## 🛠️ Technologies utilisées

- **Frontend** : Next.js, React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : NextAuth.js
- **UI Components** : shadcn/ui
- **Animations** : Framer Motion

## 🚀 Installation

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-username/projetOP.git
   cd projetOP/cardgame
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer la base de données**
   - Créer un fichier `.env` à la racine du projet
   - Ajouter les variables d'environnement suivantes :
     ```
     DATABASE_URL="postgresql://user:password@localhost:5432/cardgame"
     NEXTAUTH_SECRET="votre-secret"
     NEXTAUTH_URL="http://localhost:3000"
     ```

4. **Initialiser la base de données**
   ```bash
   npm run prisma:push
   ```

5. **Importer les cartes depuis l'API**
   ```bash
   npm run import-cards
   ```

6. **Lancer l'application en mode développement**
   ```bash
   npm run dev
   ```

## 📁 Structure du projet

```
cardgame/
├── prisma/              # Schéma et migrations Prisma
├── public/              # Fichiers statiques
├── scripts/             # Scripts utilitaires
├── src/
│   ├── app/             # Pages et routes Next.js
│   │   ├── (auth)/      # Pages d'authentification
│   │   ├── api/         # Routes API
│   │   ├── collection/  # Page de collection
│   │   ├── deck-builder/# Page de construction de deck
│   │   ├── game/        # Page de jeu
│   │   └── ...
│   ├── components/      # Composants React
│   │   ├── ui/          # Composants UI réutilisables
│   │   └── ...
│   ├── lib/             # Utilitaires et configurations
│   └── types/           # Types TypeScript
└── ...
```

## 🛠️ Commandes disponibles

### Développement
- `npm run dev` : Lancer le serveur de développement
- `npm run build` : Construire l'application pour la production
- `npm run start` : Démarrer l'application en mode production
- `npm run lint` : Vérifier le code avec ESLint

### Base de données
- `npm run prisma:generate` : Générer le client Prisma
- `npm run prisma:push` : Pousser le schéma vers la base de données
- `npm run prisma:studio` : Ouvrir Prisma Studio pour visualiser les données

### Gestion des données
- `npm run backup` : Créer une sauvegarde de la base de données
- `npm run restore` : Restaurer une sauvegarde
- `npm run import-cards` : Importer les cartes depuis l'API
- `npm run add-test-cards` : Ajouter des cartes de test
- `npm run create-test-user` : Créer un utilisateur de test
- `npm run add-cards-to-user` : Ajouter des cartes à un utilisateur

### Vérification des données
- `npm run check-cards` : Vérifier les cartes dans la base de données
- `npm run check-user-cards` : Vérifier les cartes d'un utilisateur
- `npm run check-card-values` : Vérifier les valeurs des cartes
- `npm run check-collection-values` : Vérifier les valeurs des collections
- `npm run check-sets` : Vérifier les sets de cartes
- `npm run check-total-cards` : Vérifier le nombre total de cartes
- `npm run check-user-collection` : Vérifier la collection d'un utilisateur

## 💾 Base de données

Le projet utilise PostgreSQL avec Prisma ORM. Le schéma comprend trois modèles principaux :

- **User** : Utilisateurs de l'application
- **Card** : Cartes du jeu
- **Deck** : Decks créés par les utilisateurs

## 🔄 Sauvegarde et restauration

Le projet inclut des scripts pour sauvegarder et restaurer les données :

- **Sauvegarde** : `npm run backup`
  - Crée une sauvegarde complète de la base de données
  - Stocke les données dans le dossier `backups`
  - Nomme les fichiers avec la date et l'heure

- **Restauration** : `npm run restore`
  - Liste les sauvegardes disponibles
  - Permet de choisir une sauvegarde à restaurer
  - Remplace toutes les données actuelles par celles de la sauvegarde

## 🚀 Déploiement

Pour déployer l'application :

1. **Construire l'application**
   ```bash
   npm run build
   ```

2. **Configurer la base de données de production**
   - Mettre à jour l'URL de la base de données dans les variables d'environnement

3. **Déployer sur Vercel**
   ```bash
   vercel
   ```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Commit vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
