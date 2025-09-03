# 🎴 Deck Builder - Règles Officielles One Piece TCG

Ce deck builder implémente les règles officielles du One Piece Trading Card Game pour la construction de decks.

## 📋 Règles Implémentées

### 1. **Leader Obligatoire** ✅
- Chaque deck doit avoir **exactement 1 carte Leader**
- Le choix du Leader détermine les couleurs autorisées pour le deck
- Impossible d'ajouter un second Leader

### 2. **Nombre de Cartes** ✅
- **Total du deck : 51 cartes exactement**
- **1 Leader + 50 cartes non-Leader**
- Ni plus, ni moins

### 3. **Restrictions de Copies** ✅
- **Maximum 4 copies** d'une même carte (même nom + même numéro)
- Exemple : impossible d'avoir 5 × "OP01-025"
- Validation automatique lors de l'ajout

### 4. **Validation des Couleurs** ✅
- Les cartes du deck doivent correspondre aux couleurs du Leader
- **Leaders mono-couleur** : seules les cartes de cette couleur sont autorisées
- **Leaders multi-couleurs** : les cartes des couleurs du Leader sont autorisées
- **Cartes multicolores** : peuvent être jouées si le Leader a au moins une de leurs couleurs

## 🎨 Système de Couleurs

### Leaders Mono-Couleur
- **Rouge** : Seules les cartes rouges
- **Bleu** : Seules les cartes bleues
- **Vert** : Seules les cartes vertes
- **Violet** : Seules les cartes violettes
- **Noir** : Seules les cartes noires
- **Jaune** : Seules les cartes jaunes

### Leaders Multi-Couleurs (Détectés automatiquement)
- **Luffy, Zoro, Sanji, Nami** → Rouge + Vert
- **Law, Robin, Chopper** → Bleu + Violet
- **Ace, Sabo** → Rouge + Bleu
- **Yamato, Kaido** → Vert + Jaune
- **Akainu, Blackbeard** → Rouge + Noir
- **Moria, Doflamingo** → Violet + Noir

### Cartes Multicolores
- **Rouge/Vert** : peuvent être jouées avec un Leader Rouge OU Vert
- **Bleu/Jaune** : peuvent être jouées avec un Leader Bleu OU Jaune
- **Noir/Jaune** : peuvent être jouées avec un Leader Noir OU Jaune
- **Bleu/Violet** : peuvent être jouées avec un Leader Bleu OU Violet
- **Vert/Jaune** : peuvent être jouées avec un Leader Vert OU Jaune
- **Rouge/Bleu** : peuvent être jouées avec un Leader Rouge OU Bleu
- **Vert/Violet** : peuvent être jouées avec un Leader Vert OU Violet
- **Vert/Noir** : peuvent être jouées avec un Leader Vert OU Noir
- **Bleu/Noir** : peuvent être jouées avec un Leader Bleu OU Noir
- **Violet/Jaune** : peuvent être jouées avec un Leader Violet OU Jaune
- **Rouge/Noir** : peuvent être jouées avec un Leader Rouge OU Noir
- **Vert/Bleu** : peuvent être jouées avec un Leader Vert OU Bleu
- **Rouge/Violet** : peuvent être jouées avec un Leader Rouge OU Violet
- **Violet/Noir** : peuvent être jouées avec un Leader Violet OU Noir

## 🔍 Fonctionnalités

### Filtrage Automatique
- **Une fois le leader choisi** : seules les cartes compatibles sont affichées
- **Avant la sélection du leader** : toutes les cartes sont visibles
- **Cartes multicolores** : visibles si le Leader a au moins une de leurs couleurs
- Message informatif expliquant le filtrage automatique
- Indicateur visuel des couleurs autorisées

### Validation en Temps Réel
- Vérification des règles lors de l'ajout de cartes
- Messages d'erreur détaillés
- Validation complète avant sauvegarde

### Interface Utilisateur
- Compteurs en temps réel (Leader: 1/1, Cartes: X/50)
- Indicateur des couleurs autorisées avec code couleur
- Statistiques par type de carte
- Validation visuelle du bouton de sauvegarde

## 🚫 Restrictions

### Cartes Non Autorisées
- Cartes de couleur différente du Leader
- Plus de 4 copies d'une même carte
- Plus de 50 cartes non-Leader
- Plus d'1 Leader

### Messages d'Erreur
- "Cette carte (Couleur) ne correspond pas aux couleurs de votre leader (Couleurs)"
- "Vous ne pouvez pas avoir plus de 4 copies de la même carte"
- "Le deck doit contenir exactement 1 leader"
- "Le deck doit contenir exactement 50 cartes non-leader"

## 💾 Sauvegarde

Le deck n'est sauvegardé que si **TOUTES** les règles sont respectées :
1. ✅ 1 Leader exactement
2. ✅ 50 cartes non-Leader exactement  
3. ✅ Couleurs conformes au Leader
4. ✅ Maximum 4 copies par carte
5. ✅ Nom du deck renseigné

## 🔧 Personnalisation

Les règles sont codées en dur selon les spécifications officielles du One Piece TCG. Pour modifier les couleurs des leaders ou ajouter de nouvelles règles, consultez la fonction `getLeaderColors()` dans le code source.
