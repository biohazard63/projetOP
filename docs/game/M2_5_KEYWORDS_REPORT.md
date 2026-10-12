# M2.5 — mots-clés de combat

**Verdict : PARTIAL.**

Ajout de `CardReview.combatKeywords` avec validation d'une liste explicite : Rush, Rush: Character, Double Attack, Banish et Unblockable. Aucun texte libre n'est analysé pendant la partie.

Couverture implémentée :
- Rush et Rush: Character permettent l'attaque au tour d'entrée, sous réserve de la règle de premier tour; Rush: Character limite la cible aux Characters adverses.
- Unblockable retire les actions Blocker légales et rejette aussi une commande forgée.
- Double Attack fait traiter deux dommages Life sur une attaque réussie contre un Leader.
- Banish envoie chaque Life touchée au Trash public et saute Trigger.
- Un dommage non Banish qui rencontre une carte portant un Trigger est rejeté tant que la suspension Trigger n'existe pas.

Tests : Rush: Character, Double Attack, Banish, Unblockable et refus transactionnel Trigger — **PASS** en fixtures synthétiques. Les permissions sont couvertes au niveau moteur, mais aucune carte réelle n'est certifiée; combinaisons conditionnelles/règles de nom, capacités continues et effets de cartes pendant ces fenêtres restent **NOT_TESTED**. Références : Comprehensive Rules §§10-1-1 à 10-1-3, 10-1-6, 10-1-7; [Card List OP-01](https://en.onepiece-cardgame.com/cardlist/?series=569101).
