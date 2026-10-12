# Matrice de certification M2.5

| Carte / définition | Source officielle consultée | Capacités considérées | État moteur testé | Certification |
|---|---|---|---|---|
| `ST01-006` Tony-Tony Chopper | Card List ST-01 déjà référencée dans le laboratoire M0/M1.5 | Blocker (activation et redirection de base) | Test M2B historique, suite actuelle | `DATA_VALID_EFFECT_PENDING` — pas de vraie interaction `On Block` |
| `ST04-016` Blast Breath | Card List ST-04 et FAQ ST-01–ST-04 | Counter Event, coût 1, DON!! −1 facultatif, +4000 | Sous-ensemble du Counter Event exercé en fixture; le moteur ne compile pas toutes les définitions d'Event ni toutes leurs capacités | `DATA_VALID_EFFECT_PENDING` — ne pas utiliser comme certification complète de carte |
| `OP01-025` Roronoa Zoro | Card List OP-01 | Rush | Texte consulté; aucune définition exécutable dédiée ajoutée | `DATA_VALID_EFFECT_PENDING` |
| `OP01-121` Yamato | Card List OP-01 | Alias de nom, Double Attack, Banish | Mécaniques testées avec métadonnées synthétiques; alias et intégralité de la carte non pris en charge | `UNSUPPORTED_MECHANIC` |
| Fixtures `TEST-FUTURE-SET` | Aucune carte réelle; identifiant de test seulement | M1.5B/M1.5C scheduler historique | Test antérieur hors des nouveaux scénarios M2.5 | Non certifiable comme carte |

Aucune définition réelle de carte n'a reçu `PLAYABLE_VERIFIED`. La définition Blast Breath du test utilise les références officielles ST-04/FAQ pour couvrir son texte Counter et les règles de paiement; elle reste une définition de laboratoire, pas une activation de la carte dans le catalogue. Les scénarios de Rush, Double Attack, Banish et Unblockable sont synthétiques et ne certifient pas les cartes listées.
