# ONE PIECE CARD GAME — Référence fonctionnelle pour le moteur de jeu

> Statut : spécification de développement, non reproduction exhaustive des règles officielles.
> Date de contrôle : 2026-10-10. Toujours vérifier les errata et FAQ avant d'implémenter une carte.

## Sources prioritaires
1. Règles complètes officielles FR : https://fr.onepiece-cardgame.com/pdf/rule_comprehensive.pdf
2. Règles complètes officielles EN : https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf
3. FAQ, errata, restrictions et annonces : https://en.onepiece-cardgame.com/rules/
4. Index consultable communautaire (non normatif) : https://onepiece.gg/rules/comprehensive-rules/

**Hiérarchie :** texte officiel à jour, errata et FAQ applicables > cette synthèse. Ne jamais inventer une règle pour combler une ambiguïté. Consigner la version exacte du PDF utilisée.

## 1. Configuration et victoire
- Deux joueurs ; chacun possède un Leader, un deck principal de 50 cartes et un deck DON!! de 10 cartes.
- Respecter les couleurs autorisées par le Leader et la limite générale de 4 exemplaires par numéro de carte, sous réserve des restrictions officielles.
- Main initiale : 5 cartes ; Vie initiale : valeur imprimée du Leader ; appliquer la procédure officielle de mulligan et de choix du premier joueur.
- Défaite si le Leader reçoit des dégâts alors que la zone Vie est vide, ou si le deck est vide lors du traitement des règles. Ne pas supposer que l'absence de carte à piocher est la seule condition liée au deck.

## 2. Types de cartes et zones
Types : Leader, Character (Personnage), Event (Événement), Stage (Lieu), DON!!.
Zones à modéliser séparément : deck, main, Vie (face cachée et ordonnée), défausse, Leader, personnages, lieu, deck DON!!, zone de coût DON!!, DON!! attachés, zones temporaires selon effets.
- Maximum de 5 personnages en jeu ; gérer les remplacements selon les règles.
- Un seul Lieu en jeu par joueur ; appliquer les règles de remplacement.
- Les cartes possèdent une identité d'instance distincte du numéro de carte et de leur illustration.
- Modéliser les états actif/épuisé, face visible/cachée, propriétaire, contrôleur et provenance.

## 3. Tour et phases
Ordre général : Recharge (Refresh) → Pioche (Draw) → DON!! → Principale (Main) → Fin (End).
- Au premier tour du premier joueur, appliquer les exceptions officielles de pioche et de distribution DON!!.
- La phase principale permet, lorsque légal : jouer un personnage, jouer un événement, jouer/remplacer un lieu, attacher des DON!!, activer un effet, déclarer une attaque et terminer le tour.
- Chaque action doit être validée sur l'état courant avant toute mutation.
- Aucun client graphique ne décide lui-même qu'une action est légale.

## 4. Ressources DON!!
- Distinguer les DON!! dans le deck DON!!, disponibles, épuisés et attachés.
- Payer un coût en épuisant les DON!! appropriés ; vérifier les coûts et réductions applicables.
- Un DON!! attaché peut modifier la puissance dans les conditions prévues par les règles ; ne pas confondre attachement et paiement de coût.
- Prévoir les effets de retour de DON!! vers le deck DON!! et leurs conséquences sur l'état.

## 5. Attaque et combat
- Déclaration d'un attaquant éligible et d'une cible légale (Leader adverse ou personnage adverse épuisé, sauf effet contraire).
- Un personnage nouvellement joué ne peut normalement pas attaquer pendant ce tour, sauf effet l'autorisant.
- Pipeline explicite : déclaration → effets de déclaration → fenêtre de blocage → fenêtre de contre → comparaison de puissance → dégâts ou KO → effets/règles consécutifs.
- Blocker peut rediriger une attaque si ses conditions sont remplies.
- La fenêtre Counter autorise les actions de défense prévues : cartes avec valeur Counter et événements Counter dont les coûts sont payables.
- Si la puissance de l'attaquant est supérieure ou égale à celle de la cible après modifications, l'attaque réussit selon les règles ; sinon elle échoue.
- Une attaque réussie contre un personnage provoque normalement son KO ; contre un Leader, elle inflige les dégâts appropriés à la Vie.
- Traiter séparément les mots-clés et effets modifiant les dégâts, le KO et le retrait de Vie (ex. Double Attack, Banish).
- Une carte de Vie prise en main peut déclencher un Trigger, dans sa fenêtre officielle.

## 6. Effets et fenêtres de résolution
Prévoir une structure de données pour :
- Timing : On Play, When Attacking, On K.O., On Block, Activate: Main, End of Your Turn, Trigger, Counter, et autres timings officiels.
- Coût d'activation, condition, cibles, choix, résolution et durée.
- Effets continus, effets déclenchés, effets activés et remplacements.
- Ordre de résolution, simultanéité, priorité du joueur actif et traitement des règles.
- Restrictions « une fois par tour », identifiées par instance et portée exactes.
- Mots-clés comme Rush, Blocker, Double Attack, Banish et leurs interactions.

**Interdit :** utiliser un simple `eval` du texte de carte ou déduire un effet uniquement par regex. Les textes sont des données non fiables ; convertir les effets en opérations typées, versionnées et testées. Si un effet n'est pas implémenté, le signaler explicitement et empêcher son utilisation en partie compétitive.

## 7. Architecture recommandée
```text
src/game/
  core/          # état immuable, identités, zones, invariants
  actions/       # commandes validées et transitions
  phases/        # automate du tour
  combat/        # fenêtres de combat et calculs
  effects/       # AST/DSL des effets et résolveur
  cards/         # adaptateur du scraper et errata
  rulesets/      # versionnement des règles et restrictions
  tests/         # tests unitaires, scénarios, propriétés
```

API conceptuelle :
```ts
type Command = { playerId: string; type: string; payload: unknown };
type GameResult = { state: GameState; events: GameEvent[] };
function getLegalActions(state: GameState, playerId: string): Command[];
function applyCommand(state: GameState, command: Command): GameResult;
```

Principes : serveur autoritaire, transitions déterministes, journal d'événements, graine de hasard contrôlée, information cachée par joueur, possibilité de rejouer une partie, aucune confiance dans le client.

## 8. Intégration au scraper
- Stocker le numéro de carte (`OP01-001`...), set, langue, type, couleur, coût, puissance, Counter, attribut, traits, texte d'effet et URL source.
- Séparer `card_definition_id`, `printing_id` (artworks/raretés) et `card_instance_id` (partie).
- Conserver texte brut FR et texte canonique, plus provenance et date de collecte.
- Ajouter une couche `effect_definition` structurée et validée manuellement/testée, non inférée aveuglément.
- Prévoir mises à jour incrémentales, corrections d'errata et changements de règles sans écraser les données historiques.

## 9. Tests obligatoires avant une première partie
1. Deck valide/invalide selon Leader, couleurs, copies et restrictions.
2. Installation initiale, mulligan, Vie, main et premier joueur.
3. Phases et exceptions du premier tour.
4. DON!! disponibles, attachés, épuisés, rendus et paiements.
5. Limite des personnages et remplacement du Lieu.
6. Attaque interdite d'un personnage nouvellement joué ; Rush.
7. Cibles valides, Blocker, Counter et comparaison de puissance à égalité.
8. Dégâts au Leader, Trigger de Vie, Double Attack et Banish.
9. Défaite par dégâts à Vie vide ; défaite par deck vide.
10. Effets simultanés, durée des buffs, KO, ordre de résolution.
11. Confidentialité des mains, decks et Vie de l'adversaire.
12. Relecture déterministe d'une partie à partir du journal.

## 10. Ordre de développement
**M0** : schémas des cartes et validation des decks.
**M1** : installation et boucle de tour sans effets complexes.
**M2** : DON!!, personnages, combats et victoire.
**M3** : moteur d'effets, choix et fenêtres de résolution.
**M4** : intégration des cartes set par set, avec tests par carte.
**M5** : interface, réseau, reconnexion et mode spectateur.

## 11. Consignes à Codex
1. Lire ce document et les règles officielles avant toute modification du moteur.
2. Pour chaque fonctionnalité, citer les sections officielles pertinentes dans le commentaire de test ou la PR.
3. Ne pas annoncer « conforme » tant que les tests de cas limites et FAQ ne passent pas.
4. Signaler toute ambiguïté en `RULES_OPEN_QUESTIONS.md` plutôt que de deviner.
5. Ne pas confondre disponibilité d'une carte dans le scraper et prise en charge de son effet par le moteur.
6. Maintenir une matrice de couverture : mécanique, référence officielle, état, tests et cartes concernées.

## 12. Compatibilité complète navigateur, mobile et tablette

Exigence commune : **une seule base de code**, un même moteur de règles et les mêmes services pour PC Windows/macOS/Linux, smartphones Android/iPhone, tablettes Android/iPad. Aucun développement de deux applications distinctes.

- Menus responsive en portrait ; parties optimisées en paysage avec solution utilisable en portrait, sans dépendre d'un verrouillage d'orientation.
- Plateau adapté à l'espace disponible, ratios des cartes conservés et safe areas prises en compte.
- Souris, tactile et clavier ; boutons/sélection explicite pour chaque action essentielle, sans drag-and-drop obligatoire.
- Cartes agrandissables et effets lisibles ; aucun accès supplémentaire aux cartes cachées lors du zoom.
- Fluidité mesurée sur smartphones de milieu de gamme ; animations réduites et indépendantes des transitions réglementaires.
- PWA installable depuis les navigateurs compatibles ; cache public seulement et comportement hors connexion explicite.
- Noyau TypeScript indépendant de React, du DOM, de la persistance et du transport.
- Architecture serveur autoritaire préparée pour WebSocket, avec projections privées, commandes versionnées, déduplication et reconnexion.
- Tests de menus/parties portrait/paysage, tactile/souris/clavier, tablettes et desktop. Les appareils réels sont distingués des émulations.

Conception et audit : [SIMULATOR_ARCHITECTURE.md](../../docs/game/SIMULATOR_ARCHITECTURE.md). Points non résolus : [RULES_OPEN_QUESTIONS.md](../../docs/game/RULES_OPEN_QUESTIONS.md). Aucune interface nouvelle développée à ce stade.
