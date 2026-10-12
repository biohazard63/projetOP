# M1.5B — Fondations exécutables du moteur d'effets

11 octobre 2026. Verdict : **PASS pour le périmètre de fondations couvert ci-dessous**. Aucun moteur d'effets complet ni gameplay officiel complet déclaré. M1.5C n'est pas commencé.

## Arbitrage de périmètre

Les dix documents M1.5A, M1_REPORT, M1_5_REPORT, la référence `cardgame/docs/ONE_PIECE_TCG_RULES.md`, types et tests existants ont été relus. Les règles [Bandai v1.2.1, 28/08/2026](https://en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf), notamment §8-1-3-4, ont été reconsultées.

Le prompt du plan M1.5A envisageait l'activation de ST01-001/ST01-007 et leur ancien `giveRestedDon` (attacher un DON épuisé déjà en zone coût). La mission actuelle demande un **ajout depuis le deck DON vers la zone coût, épuisé**, uniquement avec une démonstration synthétique. Cette instruction prime : la nouvelle primitive versionnée `giveRestedDon@1.0.0` suit cette définition ; elle n'est jamais reliée aux anciennes specs M0. Luffy, Nami et Blocker restent inactivables. Aucun texte/règle de carte réelle n'a été modifié.

## Fichiers créés et modifiés

Créés :

- `cardgame/src/game/effects/contracts.ts` : unions strictes, schémas Zod, manifest des primitives, validation de registre, contrats de modificateurs et diagnostic de dépendances.
- `cardgame/src/game/effects/runtime.ts` : auxiliaire du dispatch existant, propositions/remplacements/commit, continuations/choix, invariants et projection des effets.
- `cardgame/tests/game-m1-5b.test.ts` : 43 tests, uniquement fixtures synthétiques pour les effets.
- Ce rapport et `docs/game/evidence/m1_5b/` : logs, état des validations, empreintes de préservation.

Modifiés dans le noyau : `core/types.ts`, `core/game.ts`, `core/invariants.ts`, `core/index.ts`. Documents de conception concernés : architecture, DSL, résolution, certification, plan d'implémentation. Aucun ajout de dépendance ; Zod était déjà installé. `package.json` conserve ses modifications préexistantes, sans ajout pendant M1.5B.

## Contrats réellement implémentés

EffectDefinition, EffectInstance, EffectSource, EffectContext/ResolutionContext, Condition, Selector, Cost, ProposedOperation, CommittedEvent, PendingChoice, SerializableContinuation, ResolutionStatus, EffectDuration, EffectUsageLimit, EffectRegistry, PrimitiveRegistry et CharacteristicModifier sont exportés et validables. Aucun `any` explicite, fonction, closure, eval ou texte interprété dans les nouvelles structures persistées.

Un seul GameState/Command/LegalAction et le même `applyCommand`. Les contrats sont volontairement fermés : conditions ALWAYS/DON_AVAILABLE ; coûts NONE exécutables (REST_DON représenté mais explicitement refusé) ; source CARD représentée mais binding non implémenté, donc refusée. Les définitions arbitraires et les primitives inconnues ne deviennent jamais des effets vides.

## Pipeline opérationnel

`START_EFFECT → validation de fenêtre/condition/usage → continuation → ProposedOperation → restrictions → remplacement unique admissible → commit DON → CommittedEvent → instruction suivante/choix/fin`.

Les opérations conservent instance physique, génération de présence, destinataire dérivé de la définition, source/context/résolution et liste des remplacements appliqués. Les propositions remplacées ou empêchées restent dans la trace privée ; seules les mutations réellement confirmées produisent `DON_MOVED`. Le journal confirmé est contrôlé contre sa proposition et son résultat. Les IDs sont déterministes et les compteurs de génération/événements vérifiés à la restauration.

Le commit se fait dans la copie privée déjà utilisée par applyCommand. Un refus technique ne laisse aucune mutation dans l'état initial, y compris après une précédente opération du même appel. Une commande acceptée avant suspension demeure conservée ; l'échec d'une commande de reprise ne revient pas sur les commandes précédentes.

**Limite importante :** paiement réglementaire interrompu, exécution partielle des capacités officielles et traitement immédiat des règles au milieu de déplacements de cartes ne sont pas implémentés. Les primitives actuelles ne déplacent que des DON, donc ne vident ni deck principal ni Vie. La démonstration multiséquence qui manque de DON refuse la commande et conserve son état initial ; ne pas généraliser ce rollback aux futurs coûts/effets officiels (8-3). Aucun coût de carte réel n'utilise ce parcours.

## Primitives disponibles

| Primitive | Exécution couverte | Limites |
|---|---|---|
| giveRestedDon@1.0.0 | DON existant du deck DON vers cost, épuisé ; contrôleur ou adversaire défini côté registre ; première instance ou références sélectionnées | Absence DON = refus explicite ; restrictions contrôlées ; jamais attachement M0 |
| moveDon@1.0.0 | Déplacement DON entre donDeck et cost, état d'arrivée contrôlé | Aucun déplacement Card, attachement, KO ou changement de contrôle |

`subjectBinding` peut utiliser les présences sélectionnées auparavant : tests avec deux DON non consécutifs choisis, ordre conservé, et sélection zéro produisant zéro attribution. Les instances ne sont jamais créées : 122 restent conservées.

## Choix suspendus

SELECT facultatif/obligatoire, min/max et plusieurs éléments ; ORDER permutation complète. Options opaques liées à une présence, acteur, version, contexte et continuation ; aucun callback. Le curseur pc et les bindings restent JSON. Tests avec deux suspensions successives, restauration intermédiaire et reprise exacte.

Pendant un choix, getLegalActions fournit uniquement ANSWER_CHOICE au bon acteur. Ni END_MAIN ni START_EFFECT concurrent ne contourne la décision. Rejeu exact de la même réponse utilise la déduplication M1 et n'ajoute aucun événement ; autre clé périmée, ancien choix ou mauvais token sont refusés. Les commandes M1/M1.5 gardent leurs règles de version/idempotence.

Les choix sont limités aux propres main/cost/donDeck, sans filtre de texte ou inspection adverse. Les recherches sur deck/Vie, options modales, paiement alternatif et délais de déconnexion restent absents. ORDER enregistre une permutation dans un binding ; il ne réorganise pas silencieusement une zone. Toute future opération d'ordre doit la consommer explicitement.

## Remplacements minimaux

Un remplacement déclaratif peut examiner primitive/destinataire/condition, laisser passer par non-applicabilité, empêcher ou remplacer par une opération DON autorisée. Test : ajout épuisé remplacé par ajout actif ; seul ce dernier est confirmé. Un remplacement se marquant lui-même déjà appliqué ne peut boucler sur sa propre nouvelle proposition.

Deux remplacements admissibles simultanément donnent `REPLACEMENT_ORDER_NOT_IMPLEMENTED`, sans priorité lexicale ni pile LIFO inventée. Les règles synthétiques sont obligatoires/non optionnelles dans ce sous-ensemble. Aucun choix de remplacement, batch multi-carte, attribution de cause à un autre propriétaire, Marco ou Shirahoshi n'est implémenté. Transformation invalide ou inexécutable donne refus explicite ; aucun remplacement officiel ne peut être certifié sur cette seule preuve.

## Confidentialité et frontières de confiance

Snapshot complet, registry, usage, trace, continuation, bindings et historique des choix sont privés. projectState ajoute une projection explicite des effets : options privées visibles seulement au choisissant, options publiques seulement sur zones publiques (choix main PUBLIC refusé). L'adversaire/spectateur voit l'attente, sans identifiant de choix privé ni cartes/options. Journaux DON publics/privés filtrés par audience ; aucune trace interne projetée.

Les errors ne contiennent ni token retourné, ni identité de carte cachée, ni texte/registre. Tests mauvais acteur/token/choice/version et projections après restauration. Les événements DON privés ne rendent pas invisibles les DON eux-mêmes : leurs zones restent publiques selon les règles. Transition.events conserve le journal public M1 ; les nouveaux journaux sont dans state.effects.events et sont transmis uniquement via projectState.

Les snapshots restent des données autoritaires **privées** : les schémas/invariants ne constituent pas une signature d'authenticité. Le futur service doit authentifier l'acteur, sécuriser stockage/transport, sérialiser les écritures et limiter les appels. Tests de concurrence ici = commandes concurrentes sur révision du noyau, pas concurrence HTTP/PostgreSQL. PRNG M1 reste destiné aux tests.

## Versions et sauvegardes

Sans effectRegistry, createGame garde schemaVersion1 et le comportement historique. Un effectRegistry validé et BASIC_TURNS explicite crée schemaVersion2 dans le même état, avec engine `m1.5b-1`, DSL/registry/primitives `1.0.0`, règles `1.2.1` et définitions révisées copiées dans le snapshot. Modifier le registre d'entrée après création ne change pas une partie sauvegardée.

restoreGame accepte les anciennes sauvegardes v1 ; refuse v1 contenant effects, v2 sans effects, versions/continuations/primitives incompatibles. Aucune migration implicite de partie en cours. Une migration v1→v2 n'est pas fournie : créer un jeu laboratoire v2 explicitement, ou continuer son snapshot v1. Pas de relecture d'un bundle `latest` ni de récupération distante.

`TEST-FUTURE-SET` n'existe que dans les fixtures. Son programme utilise les primitives existantes, est validé, exécuté, sérialisé et rejoué à résultat déterministe sans branche de série dans le noyau. Cela n'est pas une certification Bandai.

## Effets continus : structure seulement

Contrats imprimée/base/courante distincts, null distinct de zéro, mode, source/présence, zone, condition, durée et dépendances. Diagnostic graphe acyclique/non implémenté ou cycle/non supporté. Aucun ordre arbitraire de calcul. Les modificateurs actifs sont refusés dans le runtime (`modifiers` doit rester vide) : pas d'effet silencieusement ignoré. Le calcul de puissance/DON déjà livré en M1.5 reste intact.

## Vérifications exécutées

Depuis cardgame :

```bash
node --import tsx --test tests/game-m1-5b.test.ts
npm test
npx tsc --noEmit
npx eslint src/game/core src/game/effects tests/game-m1-5b.test.ts
npm run lint
```

Build : `npm run build` dans la copie isolée indiquée par `evidence/m1_5b/build-directory.txt`, sources/configurations/tests actuels, dependencies et public locaux, sans .env. Le premier essai échouait au téléchargement Inter dans le sandbox ; relance avec accès réseau autorisé puis vérification finale. Le serveur local et .next du dépôt sont préservés.

| Vérification | Résultat | Preuve |
|---|---|---|
| Nouveaux tests | PASS — 43/43 | unit.log |
| Suite complète | PASS — 158/158 ; 115 anciens conservés, zéro échec/skip | tests.log |
| TypeScript | PASS | typecheck.log |
| ESLint noyau/effets/tests | PASS — zéro erreur/avertissement | core-lint.log |
| ESLint application | PASS — zéro erreur, 99 avertissements préexistants | lint.log |
| Production build isolé | PASS | build.log |
| Empreintes sources hors périmètre | PASS | preservation.json |
| Vérification whitespace / Git | PASS | validation.json |
| Concurrence serveur/DB, UI/appareils, partie officielle complète | NOT_TESTED | Aucun service ni interface branché |

Les 43 tests couvrent contrats/version/unknown primitives, proposition/commit/annulation/remplacement, disponibilité/restrictions/identité/état DON, reprise privée/public, sélection zéro/multiple/ordre, deux suspensions, idempotence/concurrence, rollback technique, corruption de sauvegarde, cycles, namespace d'identifiants, compatibilité v1/v2 et vingt graines avec conservation.

## Architecture, exécution et certification séparées

- Architecture définie : couvre la cible long terme dans les documents M1.5A.
- Architecture implémentée : seulement fondations strictes et sous-ensemble synthétique décrit ici.
- Fonctionnalités testées : trois preuves fondamentales et invariants/projections/compatibilité, preuves ci-dessus.
- Capacités de cartes réelles certifiées jouables par ce jalon : **zéro**. Le registre de cartes M0 et les decks sauvegardés sont inchangés ; automaticPlayReady reste false.

## Risques et suite

M1.5C recommandé après validation : ordonnanceur réglementaire, coûts et remplacements optionnels/batches, contextes de cause, évaluateur continu/durées et source de carte avec reset d'usage par présence. Compléter les rulings/textes ouverts avant certifier des cartes. Combat/Trigger/victoire complète sont ultérieurs. Prévoir migration explicitement testée si des sauvegardes d'effets doivent évoluer.

Aucune collecte, DB, migration, modification des boosters/coins/collection/UI/scraper, push, déploiement ou refactorisation générale. Arrêt à M1.5B.
