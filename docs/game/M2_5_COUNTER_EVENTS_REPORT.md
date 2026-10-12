# M2.5 — Counter Events

**Verdict : PARTIAL — un sous-ensemble Counter Event est exécutable.**

La commande `PLAY_COUNTER_EVENT` et l'action légale correspondante sont intégrées à la fenêtre Counter. Une définition validée de `counterEvent` est disponible dans l'adaptateur. Le sous-ensemble testé est ST04-016 Blast Breath : coût imprimé d'un DON!!, DON!! −1 facultatif, choix d'un Leader/Character allié, +4000 jusqu'à la fin de cette bataille, puis mise au Trash de l'Event.

La validation distingue trois cas. Un coût initialement impossible est refusé avant mutation (`COUNTER_EVENT_INITIAL_UNPAYABLE`). Si une restriction rend impossible la suite d'un paiement déjà commencé, les opérations confirmées restent payées, l'opération empêchée est tracée, et l'Event n'est pas activé. Une erreur technique reste atomique via le clone transactionnel de `applyCommand`. La FAQ Bandai confirme que Blast Breath peut être activée sans payer DON!! −1; le test vérifie alors que l'Event est défaussé sans appliquer son effet optionnel.

Ce résultat ne couvre pas les Counter Events arbitraires : pas de DON!! −X configurable au-delà de la forme générique bornée, de coûts alternatifs, d'effets d'Event compilés depuis la DSL, de plusieurs Counter Events/Characters séquencés par une continuation, ni de modifications de zone complexes. La carte de test n'est pas certifiée `PLAYABLE_VERIFIED`; la fixture teste uniquement le chemin Counter vérifié.

Références : [Card List ST-04](https://en.onepiece-cardgame.com/cardlist/?series=569004), FAQ officielle [ST-01–ST-04](https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405=), Comprehensive Rules §8-3. Test exécuté : `tests/game-m2a.test.ts`, test « reviewed Counter Event pays printed cost and DON!! minus through the operation pipeline » — **PASS**. Trace : `evidence/m2_5/blast-breath-counter-event.json`.
