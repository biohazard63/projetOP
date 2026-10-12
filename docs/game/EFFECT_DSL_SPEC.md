Date : 11 octobre 2026. M1.5A : conception uniquement, aucun moteur ou service modifié.

# DSL/IR déclarative versionnée

Statut : représentation proposée, aucune compilation ni exécution de capacités dans M1.5A. Les regex d'audit ne produisent pas un programme fiable. Un auteur/relecteur traduit le texte officiel/FAQ vers AST et scénarios.

```ts
type PlayerExpr = { kind:'SELF'|'OPPONENT'|'ACTIVE' } | { kind:'BOUND'; key:string };
type Value = { kind:'INT'; value:number } | { kind:'COUNT'; selector:Selector }
  | { kind:'CHARACTERISTIC'; selector:Selector; field:'PRINTED_COST'|'BASE_COST'|'COST'|'PRINTED_POWER'|'BASE_POWER'|'POWER'|'COUNTER' };
type Predicate = { kind:'AND'|'OR'; items:Predicate[] } | { kind:'NOT'; item:Predicate }
  | { kind:'COMPARE'; left:Value; op:'EQ'|'LT'|'LE'|'GE'|'GT'; right:Value }
  | { kind:'CARD_MATCH'; selector:Selector; property:'NAME'|'NAME_CONTAINS'|'TYPE'|'TYPE_CONTAINS'|'COLOR'|'CATEGORY'|'KEYWORD'|'NUMBER'; value:string }
  | { kind:'TURN_IS'; player:PlayerExpr } | { kind:'STATE_IS'; selector:Selector; state:'ACTIVE'|'RESTED'|'FACE_UP'|'FACE_DOWN' }
  | { kind:'HISTORY_MATCH'; patternId:string; scope:'TURN'|'BATTLE' };
type Selector = { kind:'SOURCE' } | { kind:'BINDING'; key:string }
  | { kind:'ZONE'; player:PlayerExpr; zone:string; filter:Predicate|null; slice:{edge:'TOP'|'BOTTOM'; count:Value}|null };
type Op = { kind:'DRAW'; player:PlayerExpr; amount:Value }
  | { kind:'MOVE'; subjects:Selector; destination:{player:PlayerExpr; zone:string; position:'TOP'|'BOTTOM'|'APPEND'}; cause:'EFFECT'|'COST'|'RULE' }
  | { kind:'KO'; subjects:Selector }
  | { kind:'REST'|'READY'; subjects:Selector }
  | { kind:'LOOK'|'REVEAL'; subjects:Selector; audience:PlayerExpr[] }
  | { kind:'SET_FACE'; subjects:Selector; face:'UP'|'DOWN' }
  | { kind:'PLAY'; subjects:Selector; rested:boolean; payPrintedCost:boolean }
  | { kind:'DON'; action:'ADD'|'ATTACH'|'RETURN'; subjects:Selector; target:Selector|null; rested:boolean }
  | { kind:'MODIFY'; subjects:Selector; field:string; mode:'ADD'|'SET_BASE'|'GRANT'|'REMOVE'|'PROHIBIT'; value:Value|string; duration:DurationSpec; membership:'SNAPSHOT'|'DYNAMIC' }
  | { kind:'NEGATE'; subjects:Selector; abilityScope:'PRINTED'|'SPECIFIED'; duration:DurationSpec }
  | { kind:'EXTENSION'; primitiveId:string; version:string; args:Json };
type DurationSpec = { kind:'THIS_BATTLE'|'THIS_TURN'|'SOURCE_PRESENT' }
  | { kind:'NEXT_BOUNDARY'; player:PlayerExpr; phase:'REFRESH'|'END'; edge:'START'|'END' }
  | { kind:'WHILE'; predicate:Predicate };
type Node = { kind:'SEQUENCE'; nodes:Node[] }
  | { kind:'IF'; condition:Predicate; yes:Node; no:Node|null }
  | { kind:'OPTIONAL'; player:PlayerExpr; node:Node }
  | { kind:'ALTERNATIVES'; player:PlayerExpr; options:{id:string; node:Node}[]; mode:'COST'|'EFFECT' }
  | { kind:'SELECT'; player:PlayerExpr; selector:Selector; min:number; max:Value; bind:string; next:Node }
  | { kind:'ORDER'; player:PlayerExpr; subjects:Selector; bind:string; next:Node }
  | { kind:'DO'; operation:Op; bindResult:string|null }
  | { kind:'IF_RESULT'; resultKey:string; requirement:'PERFORMED'|'FULLY_PERFORMED'; yes:Node; no:Node|null };
```

Références communes Json/Duration/context/EffectDefinition : EFFECT_ENGINE_ARCHITECTURE. La DSL doit interdire les sélecteurs circulaires hors profondeur bornée, variables non liées, accès à des propriétés sans existence, nombres non entiers, durations sans combat et champs inconnus. Le validateur spécialise chaque propriété/mode/primitive ; `field:string` ci-dessus est une liste de familles à fermer dans M1.5B, jamais un chemin libre dans GameState.

## Coûts, triggers et permanents

Ability inclut timing structurés (`PLAYED`, `ATTACK_DECLARED`, `OPPONENT_ATTACK`, `BLOCKED`, `KO`, `PHASE_BOUNDARY`, `ZONE_CHANGED`, `RESOURCE_CHANGED`, `CARD_ACTIVATED`...), condition d'activation, validZones, coûts ordonnés et corps. Mots-clés sont définitions versionnées, pas includes(text).

Coût contient opérations et conditions `FULLY_PERFORMED`, alternatives avec payabilité ; coût jouant un événement distinct de son coût d'activation. Corps utilise branches de succès seulement quand le texte le demande. Continue effect porte selector dynamique/predicate/modifier ; temporaire acquis a liste de présences SNAPSHOT, sauf texte contraire. Replacement porte un pattern d'opération, périmètre batch/sujet, choix optionnel, transformation et garde d'application unique. Permissions/restrictions gardent provenance et zone.

## Exemples d'IR à valider

ST01-001/ST01-007 : ACTIVATE_MAIN, une fois par tour ; SELECT zéro à un DON de OWN_COST_RESTED ; si sélection non vide, SELECT un Leader/Personnage propre, DON ATTACH. Les coûts ne comprennent pas REST_SELF. Ne pas demander cible obligatoire pour le choix zéro. Primitive simple existante M0 peut être adaptée sans modifier l'identité.

OP10-078 : deux fenêtres MAIN et COUNTER, même programme ; coût événement 1 DON. LOOK top3 pour contrôleur ; SELECT 0..1 matching type et exclusion nom exact ; REVEAL puis MOVE main ; ORDER restant puis MOVE bottom selon permutation. LOOK laisse les cartes dans leur zone et accorde uniquement droit temporaire. Le nom réglementaire doit être un alias validé, pas traduction FR pour égalité.

OP17-020 : ACTIVATE_MAIN, once ; ALTERNATIVES COST : défausser une carte de main OU épuiser DON valide. Corps SELECT 0..1 Personnage adverse épuisé puis PROHIBIT READY pendant prochaine Refresh adverse. Cette IR reste provisoire tant que texte complet officiel OP17 n'est pas récupéré ; FAQ confirme la branche DON avec main vide.

OP17-015 : REPLACEMENT pour batch sortie due effet adverse, KO source à la place ; séparément AUTO KO avec coût discard matching type et PLAY cette carte depuis trash. Ne pas coder numéro OP17 dans le résolveur, ne pas exécuter callbacks arbitraires.

## Extension spécialisée

Manifest primitive `{id:'opcg.operation.X', version:'1.0.0', argsSchemaHash, reads, writes, deterministic:true, visibilityPolicyId, rulesReferences, testEvidenceHash}`. Handler statique TypeScript livré avec moteur, whitelist serveur ; `EXTENSION` ne charge ni module distant ni code JSON. Si absent/version différente : UNSUPPORTED_MECHANIC. Chaque nouvelle primitive a tests propriétés, scénarios officiels et regressions ancien catalogue. Pas d'eval, new Function, fonctions dans état, accès FS/network/random global/DOM.

AST relu → bytecode/IR indexé immutable avec hash. Continuation contient programHash/pc/frames/bindings JSON et non une closure. Pas de synchronisation sur animation. Primitives spécialisées seulement quand composition générique ne respecte pas la règle ; documenter pourquoi.

## Sous-ensemble exécutable M1.5B

L'IR effectivement validée comprend séquence plate OPERATION/CHOICE, SELECT/ORDER, conditions ALWAYS/DON_AVAILABLE et coûts NONE. giveRestedDon@1.0.0 signifie ajout depuis donDeck vers cost épuisé dans la mission M1.5B ; la spec M0 homonyme d'attachement reste distincte et inactive. moveDon et subjectBinding consomment les présences choisies. Toutes les autres constructions de cette proposition restent non implémentées, rejetées plutôt qu'interprétées comme vides. Voir [rapport M1.5B](M1_5B_REPORT.md).

## Sous-ensemble livré M1.5C : DSL 1.1.0

Contrats stricts dans effects/contracts.ts. Nouveau source CARD_DEFINITION{definitionId,zone:leader|characters|stage}, liée à CARD{presence,definitionId} pendant la résolution. timing MAIN|ON_PLAY ; coût NONE|REST_SOURCE (REST_DON toujours explicitement non exécuté). Conditions ALWAYS|DON_AVAILABLE conservées. Usage UNLIMITED|ONCE_PER_TURN.

SELECT ajoute OWN_RESTED_DON, OWN_FIELD{trait?}, OPPONENT_CHARACTER{maximumPower}. whenBindingNonempty évite de demander un destinataire si le premier choix contient zéro DON. Opérations attachRestedDon{subjectBinding,targetBinding}, addPower{amount,duration:THIS_TURN}, koCharacter{subjectBinding} en plus des deux primitives antérieures.

continuous accepte uniquement des modificateurs indépendants POWER|COST, zone characters et seuil minimumAttachedDon. cardReplacements accepte SELF_KO_BY_EFFECT -> TRASH_HAND_INSTEAD{categories:EVENT|STAGE,usage:ONCE_PER_TURN}. Il s'agit de schémas déclaratifs génériques, sans numéro de carte dans l'interpréteur.

Aucun SET_BASE, durée avancée, dépendance cyclique, ON_KO, alternative ou JavaScript arbitraire n'est admis. Ces contrats restreints ne remplacent pas la DSL cible générale décrite plus haut. Exemples réels : cards/effectPrototype.ts ; test fictif : game-m1-5c.test.ts.

## Extension 1.2.0 M1.5D

Ajouts : `ON_KO`, observation `ON_CHARACTER_KO`, sélecteur `OPPONENT_CHARACTER.powerBasis` (`CURRENT` ou `BASE`), coûts ordonnés `SEQUENCE` de coûts atomiques, contrat `ALTERNATIVE` explicitement non exécutable. Les versions précédentes refusent ces extensions. ON_KO avec coût d'activation n'est pas couvert et est rejeté.

Le registre peut fournir un remplacement de Leader avec seuil DON attachés, seuil de puissance actuelle et modificateur négatif. La définition Sabo ajoute les restrictions de tour adverse et une fois par tour dans son chemin générique. Le choix d'acceptation ne consomme la limitation que si le remplacement est appliqué. Aucune branche sur un numéro de série dans le noyau.

Le choix d'ordre est distinct des choix de cartes : ses options désignent des `triggerId`, pas des instances physiques. Il passe par la commande existante `ANSWER_CHOICE` avec un seul token. Le journal interne d'opérations et de paiements est absent des projections.
