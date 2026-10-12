Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# Architecture du moteur intégré

## État constaté

Les six rapports demandés et la référence réelle `cardgame/docs/ONE_PIECE_TCG_RULES.md` ont été lus. Le rapport M1.5 est indispensable : contrairement au contexte de la demande, `core/turns.ts` implémente déjà Recharge, Pioche, DON, Principale, Fin, paiements, personnages, Lieux, attachements et défaite par deck vide. Les 17 tests M1.5 complètent les 17 M1 et les 10 M0. Ce sous-ensemble n'exécute aucune capacité et n'implémente aucun combat.

M0 contient 14 définitions relues, 33 impressions et 29 anciens identifiants du snapshot local. Onze définitions sans effet ont été vérifiées ; deux capacités `giveRestedDon` et `blocker` sont décrites sur trois cartes, sans interpréteur. Les 139 Leaders / 284 illustrations ont une Vie vérifiée dans un sidecar ; le maître reste sans Vie. Aucun accès à une base actuelle pendant cet audit.

Conserver `createGame`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame`, l'adaptateur, le registre d'impressions et les tests. Un seul dispatch ; les sous-modules ne deviennent pas des moteurs concurrents. Pas de React/DOM/Prisma/transport dans `src/game`.

## Modules proposés et frontières

| Module futur | Responsabilité | Intégration |
|---|---|---|
| core/types, invariants | État, conservation, versions | Évolution explicite du schéma M1, pas de second état |
| effects/definitions | AST validé, programmes immuables | CardDefinition conserve numéro/révision ; binding séparé pour M0 |
| effects/resolver | Machine de résolution et continuations | Appelé uniquement par applyCommand |
| effects/operations | Validation/commit des changements | Les mouvements de turns deviennent des opérations communes |
| effects/replacements | Transformations avant commit | Jamais abonnements après mutation |
| effects/characteristics | Évaluateur coût/puissance/types/permissions | Partagé entre légalité, paiement, résolution, projection |
| effects/scheduler | Lots déclenchés et fenêtres réglementaires | Suspension des frontières de phases existantes |
| effects/visibility | Droits temporaires et projections | Aucun export direct du snapshot |
| cards/registry | Defs et programmes certifiés, hashes | Sans import d'images ni textes en cours de partie |
| rulesets | Région, date, format, errata, politiques vérifiées | Snapshot figé pour la partie |

## Contrats TypeScript proposés

Les types ci-dessous sont des contrats de conception, pas du code livré. Importer les types actuels ; `Instance` reçoit seulement l'alias CardInstance. Les noms suffixés Next désignent leur future révision, pas un moteur parallèle.

```ts
import type { GameState as M1State, PlayerState, Instance as CardInstance,
  Command as M1Command, LegalAction as M1LegalAction } from '../../cardgame/src/game/core/types'
import type { CardDefinition, CardPrinting } from '../../cardgame/src/game/cards/types'
import type { Ruleset } from '../../cardgame/src/game/rulesets/decks'
type Id = string;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type PresenceRef = { instanceId: Id; generation: number };
type VersionPin = { engine: string; state: 2; dsl: string; definitionsHash: string;
  rulesVersion: string; rulesetHash: string; primitiveVersions: Record<string,string> };
type Duration =
  | { kind: 'BATTLE'; battleId: Id }
  | { kind: 'TURN'; turnId: number }
  | { kind: 'BOUNDARY'; playerId: Id; playerTurn: number; phase: 'REFRESH'|'END'; edge: 'START'|'END' }
  | { kind: 'SOURCE_PRESENCE'; source: PresenceRef }
  | { kind: 'CONDITIONAL'; predicateId: Id };
type UsageLimit = { max: number; scope: 'TURN'|'BATTLE'; identity: 'SOURCE_PRESENCE'|'PLAYER';
  consumption: 'ACTIVATION_PROTOCOL'; key: Id };
type ResolutionContext = { controllerId: Id; source: PresenceRef | null;
  cause: { kind: 'RULE'|'CARD_EFFECT'|'CARD_ACTIVATION'|'BATTLE'|'COST'; playerId: Id|null;
    effectId: Id|null }; turnId: number; battleId: Id|null; windowId: Id;
  bindings: Record<string, Json> };
type EffectDefinition = { id: Id; revision: string; dslVersion: string;
  category: 'AUTO'|'ACTIVATE'|'PERMANENT'|'REPLACEMENT'|'KEYWORD';
  programId: Id; validZones: string[]; conditionId: Id|null; costProgramId: Id|null;
  triggerPatternId: Id|null; usage: UsageLimit|null; references: string[] };
type EffectInstance = { id: Id; definitionId: Id; context: ResolutionContext;
  status: 'WAITING'|'ACTIVATING'|'RESOLVING'|'FINISHED'; continuationId: Id|null };
type ProposedOperation = { id: Id; batchId: Id; ordinal: number;
  primitive: string; primitiveVersion: string; operands: Json; context: ResolutionContext;
  subjects: PresenceRef[]; appliedReplacementIds: Id[] };
type CommittedEvent = { sequence: number; operationId: Id; batchId: Id; kind: string;
  cause: ResolutionContext['cause']; before: Json; after: Json;
  audience: 'PUBLIC'|Id[]; rulesReferences: string[] };
type SerializableContinuation = { id: Id; programId: Id; programHash: string;
  pc: number; frames: { nodeId: Id; nextChild: number; bindings: Record<string,Json> }[];
  effectId: Id; context: ResolutionContext; parentId: Id|null;
  stage: 'COST'|'BODY'|'REPLACEMENT'|'DAMAGE'|'PHASE'; operationIds: Id[] };
type PendingChoice = { id: Id; actorId: Id; expectedVersion: number;
  kind: 'SELECT'|'ORDER'|'OPTION'|'NUMBER'|'DECLINE'; min: number; max: number;
  optionTokens: string[]; privateOptions: Record<string,Json>;
  continuationId: Id; audience: Id[]; deadlinePolicyId: Id|null };
type CommandNext = M1Command | { id: Id; actorId: Id; expectedVersion: number;
  type: 'ANSWER_CHOICE'; choiceId: Id; selectedTokens: string[] } |
  { id: Id; actorId: Id; expectedVersion: number; type: 'ACTIVATE_EFFECT'; source: PresenceRef; effectId: Id };
type LegalActionNext = M1LegalAction | { type: 'ANSWER_CHOICE'; choiceId: Id;
  min: number; max: number; options: { token: Id; label: string }[] } |
  { type: 'ACTIVATE_EFFECT'; source: PresenceRef; effectId: Id };
type CardRegistry = { hash: string; definitions: Readonly<Record<Id,CardDefinition>>;
  printings: Readonly<Record<Id,CardPrinting>>; effects: Readonly<Record<Id,EffectDefinition>>;
  programs: Readonly<Record<Id,Json>>; certifications: Readonly<Record<Id,Json>> };
type GameStateNext = Omit<M1State,'schemaVersion'|'automaticPlayReady'|'commands'|'events'> & {
  schemaVersion: 2; automaticPlayReady: boolean; pins: VersionPin;
  commands: CommandNext[]; events: CommittedEvent[];
  resolution: { effects: Record<Id,EffectInstance>; continuations: Record<Id,SerializableContinuation>;
    pendingChoice: PendingChoice|null; scheduler: Json; proposed: ProposedOperation[] };
  modifiers: Json[]; usageLedger: Record<Id,number>; visibilityGrants: Json[];
  privateEvents: CommittedEvent[]; battle: Json|null;
};
```

`PlayerState`, `CardDefinition`, `CardInstance`, `Ruleset` restent les types M1. Leurs futures extensions portent respectivement ressources/compteurs existants, programmes certifiés, présence et localisation, et pins/région/format. Les unions DSL précises sont dans EFFECT_DSL_SPEC ; les `Json` du contrat transport ne dispensent pas des validateurs discriminés de chaque primitive. Les champs `commands/events` M1 seront remplacés explicitement par unions Next/journaux projetés lors de la migration, sans cast silencieux. Ces extraits ne prétendent pas compiler tels quels en remplacement de types actuels.

## Invariants à faire évoluer avant activation

Les 122 instances physiques restent conservées, y compris une carte Trigger en cours de résolution hors zone : registre de localisation exclusif `zone | resolvingTrigger`, sans appeler cette dernière une zone réglementaire. L'invariant actuel exige toute instance dans une zone, Vie constante et face cachée : il faut le spécialiser pour setup puis jeu, autoriser la Vie face visible, sans supprimer la conservation.

`zoneGeneration` est déjà incrémenté à chaque déplacement. Une référence de cible inclut cette génération, mais la réinitialisation réglementaire suit séparément 3-1-6 : sortie Personnage/Lieu et déplacement DON. Une carte quittant puis revenant sur le terrain n'est pas la même présence. Le journal garde une photographie pertinente (LKI) et la cause, pas une référence à un objet mutable.

Les événements publics M1 vérifient l'état public actuel de l'instance ; cela ne permet pas de conserver une révélation historique d'une carte redevenue cachée. Introduire audience et photographie au moment de l'événement, sans publier l'identité persistante d'une carte dans un deck mélangé.

## Évaluateur unique

Entrée : snapshot, présence, caractéristique, contexte/zone, policies du ruleset. Sortie : valeur + justification structurée privée. Distinguer imprimée, base fixée et courante ; puissance base concurrente selon 4-9, pas dernier écrit arbitraire. Ajouter DON seulement au tour concerné. Coûts intermédiaires signés, plancher zéro après calcul ; puissance peut être négative. Types/couleurs multiples, aliases de noms, attributs et Counter sont évalués aussi ; une capacité annulée n'est pas une absence d'effet de base.

Dépendances entre permanents : graphe de lectures/écritures, ordre joueur actif puis autre avec choix de leurs effets, stabilisation conformément à 8-1-3-3-5. Les modificateurs continus déjà résolus entrent dans le calcul. Ne pas inventer des couches empruntées à un autre jeu. Cas de référence Usopp OP10-042 + Tsuru OP02-106/Kaku OP07-080/Issho OP03-078 : coût courant et seuil réévalués. Si plusieurs ordres influencent l'état, choix sérialisé, pas tri lexical. Cycle non certifié : diagnostic technique et suspension, jamais victoire artificielle.

## Garanties et limites

Copie transactionnelle pure par commande ; seul le serveur futur authentifie l'acteur, verrouille/CAS la révision et persiste. Idempotence du noyau n'est pas une garantie de concurrence en DB. PRNG xorshift32 actuel réservé aux tests ; futur hasard secret versionné/rejouable côté autorité. Aucun choix ne dépend de Date.now, animation, écran, texte français ou numéro d'extension. Une seule API pour PC/mobile/tablette ; UI future projette les mêmes choix et fournit toujours un bouton alternatif aux gestes.

Risques conservés ouverts : dates de format, restrictions après 12/10, cycles continus spécifiques, textes OP17 non entièrement vérifiables via outil, règles de noms multiples et provenance des traductions historiques. Voir EFFECT_EDGE_CASES et M1_5A_REPORT.

## Livraison M1.5B — 11/10/2026

Les contrats proposés ci-dessus demeurent la cible générale. Le sous-ensemble exécuté est documenté dans [M1_5B_REPORT.md](M1_5B_REPORT.md) : même GameState/dispatch, schema1 historique ou schema2 explicitement activé avec registre synthétique versionné, continuation JSON et projections. Les types stricts se trouvent dans cardgame/src/game/effects/contracts.ts. Aucune capacité réelle, automate complet ou migration implicite n'est activé.

## État exécutable M1.5C (2026-10-11)

Le noyau existant a été étendu en place : cards/effectPrototype.ts fournit sept révisions déclaratives laboratoire ; core/game.ts capture un ON_PLAY après CARD_PLAYED ; effects/runtime.ts interprète les programmes et continue ses choix JSON ; effects/characteristics.ts centralise les consultations. Pas de nouveau moteur, pas de branchement /game. Voir M1_5C_REPORT.md et EFFECT_RUNTIME_COVERAGE.md.

DSL1.1.0/engine m1.5c-1 coexistent avec les snapshots DSL1.0.0 M1.5B. Sources CARD_DEFINITION liées à une instance et génération au déclenchement. Source/usage/continuation/opérations restent privés. Évaluateur limité aux additions indépendantes, base=imprimée. MAIN/ON_PLAY et un remplacement SELF_KO_BY_EFFECT sont exécutables ; cascades et ordonnanceur simultané restent non implémentés.

## Mise à jour exécutée M1.5D (11 octobre 2026)

La version 1.2.0 réutilise `applyCommand` et le runtime existants. `effects/scheduler.ts` conserve les lots JSON et sépare choix d'ordre, capacité courante et historique. `effects/operations.ts` fournit une frontière commune de validation/confirmation pour repos, puissance et déplacements ; le runtime prépare les remplacements avant confirmation. Aucune partie ancienne n'est automatiquement réinterprétée. Les registres 1.0/1.1 gardent leurs comportements historiques.

Les sources ON_KO portent une génération de terrain et une génération de défausse attendue, liées à un KO confirmé. Aucun bypass général de génération. Les primitives inconnues et les configurations non couvertes restent refusées. La collection, les boosters et les interfaces n'utilisent pas ce laboratoire.
