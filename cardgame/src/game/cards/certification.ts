import type { CardDefinition, SourceReference } from './types'
import type { EffectRegistry } from '../effects/contracts'
import { M5_CARDS, M5_REVISION } from './m5Catalog'
import { M3_ABILITY_CARDS } from './m3Abilities'
import { keywordOnlyText } from './keywordText'
import { faqUrlFor } from './officialSources'
import { officialDefinitionId, officialRow } from './officialCards'
import { compileCardText } from './textCompiler'

// M4-C1 — certification per definition revision. A certification is a separate, explicit record bound to
// one definitionId (number@revision); it is never carried by `review.playabilityStatus`, never inherited by
// a clone and never granted to a whole deck. The historic `playabilityStatus` field stays as laboratory
// metadata and cannot by itself make a card PLAYABLE_VERIFIED.
export type CertifiedAbility = { kind: 'blocker' | 'declarative' | 'giveRestedDon' | 'counterEvent' | 'trigger' | 'keyword'; id: string; tests: string[] }
export type Certification = {
  definitionId: string
  certifiedAt: string
  rulesVersion: '1.2.1'
  rulesetId: string
  // Each check is a source re-read on `checkedAt` for this exact revision.
  cardText: SourceReference
  faq: SourceReference
  errata: SourceReference
  abilities: CertifiedAbility[]
  // Real-engine tests (exact node:test titles) that execute this card in a game.
  tests: string[]
  notes: string
}
export type CertificationBlocker = { definitionId: string; reason: 'DATA_CONFLICT' | 'ABILITY_NOT_CERTIFIED' | 'NOT_REVIEWED'; detail: string; checkedAt: string }

const today = '2026-10-12'
const cardList = (series: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}`, checkedAt: today, language: 'en', detail })
const faq = (pdf: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/pdf/${pdf}`, checkedAt: today, language: 'en', detail })
const errata = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: today, language: 'en', detail })
const series: Record<string, string> = { ST01: '569001', ST04: '569004', OP01: '569101', OP02: '569102', OP04: '569104', P: '569901' }
const faqPdf: Record<string, string> = { ST01: 'qa_st-01-st-04.pdf?20240405=', ST04: 'qa_st-01-st-04.pdf?20240405=', OP01: 'qa_op01.pdf?20240405=', OP02: 'qa_op02.pdf?20240405=', OP04: 'qa_op04.pdf?20240405=', P: 'qa_promotion-cards.pdf?20260206=' }
const setOf = (number: string) => number.startsWith('P-') ? 'P' : number.slice(0, 4)

export const CERTIFIED_PLAY_TEST = 'M4-C2: every certified character is played for its printed cost, battles with its printed power and counters with its printed value'
export const CERTIFIED_DECK_TEST = 'M3-3: the purple deck satisfies every construction rule in playable mode and wrong variants are refused'
export const FULL_GAME_TEST = 'M3-5: the reference game reaches a regulatory victory through real commands'
export const BLOCKER_TEST = 'M4-C2: certified [Blocker] characters redirect a real attack by resting themselves'
export const M5_CERTIFIED_TEST = 'M5-5: every certified M5 Character is played in a legal deck for its cost, keeps its power and defends with its Counter or [Blocker]'
const M6_OTAMA_TEST = 'M6 official Otama lowers only a chosen opposing Character and permits choosing zero'
const M6_OTAMA_DECLINE_TEST = 'M6 official Otama choosing zero does not create a power modifier'
const M6_CARIBOU_TEST = 'M6 official Caribou On K.O. resolves only after a confirmed battle K.O. and filters current power'
const M6_OP06_ON_PLAY_TEST = 'universal engine: official OP06-013 On Play executes the same declarative search program'
const M6_OP06_TRIGGER_TEST = 'universal engine: official OP06-013 Trigger privately searches, reveals a FILM card, orders the rest, then resumes Life damage'
const M6_OP06_CROSS_SET_TEST = 'universal engine: complete official cross-set battle resolves Shuraiya, Meteor-Strike Counter and OP06-013 Trigger'
const M6_NAMI_SEARCH_TESTS = [
  'M3-2: Nami with zero candidates offers an empty selection, reveals nothing and puts the 5 cards at the bottom',
  'M3-2: Nami excludes Nami, may choose zero cards, and a choice above the maximum is refused',
  'M3-2: two successive Nami searches each look at the current top 5 and keep both remainders at the bottom',
  'M3-2: a search on a deck shorter than its amount looks at every remaining card (FAQ OP01-016)',
  'M3-2: taking the last card of the deck makes its owner lose at once, even before the rest is ordered (CR 9-1-2, 9-2-1-2)',
]

function vanilla(number: string, revision: string): Certification {
  const set = setOf(number)
  return {
    definitionId: `${number}@${revision}`, certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'm3-reviewed-subset-2026-10-12',
    cardText: cardList(series[set], `${number}: name, category, cost, power, counter, colour, attribute, types and block equal the engine definition; Effect "-" and no [Trigger]`),
    faq: faq(faqPdf[set], `No individual entry for ${number}`), errata: errata(`No errata entry for ${number}`),
    abilities: [], tests: [CERTIFIED_PLAY_TEST], notes: 'Card without ability: certification covers its printed characteristics in play, battle and Counter step.',
  }
}
function blocker(number: string, revision: string): Certification {
  return { ...vanilla(number, revision),
    cardText: cardList(series[setOf(number)], `${number}: characteristics equal the engine definition; text is exactly [Blocker] with its reminder; no [Trigger]`),
    abilities: [{ kind: 'blocker', id: 'blocker', tests: [BLOCKER_TEST] }], tests: [CERTIFIED_PLAY_TEST, BLOCKER_TEST],
    notes: '[Blocker] (CR 1.2.1 §10-1-4): rest this card after an attack is declared to become the new target.' }
}
// C2 — the cards whose regulatory evidence is complete on 2026-10-12 (automatic field comparison against the
// official card list, FAQ and errata re-read, executed in real-engine tests).
export const CERTIFICATIONS: Certification[] = [
  ...['ST01-003', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-010', 'OP01-012', 'OP01-018', 'OP01-023', 'P-012', 'P-016'].map(n => vanilla(n, 'm0-2026-10-10')),
  blocker('ST01-006', 'm0-2026-10-10'),
  ...['ST04-007', 'ST04-009', 'ST04-012', 'ST04-013', 'OP01-092', 'OP01-103', 'OP01-107', 'OP01-110', 'OP02-077', 'OP02-080', 'OP04-062'].map(n => vanilla(n, 'm3-2026-10-12')),
  blocker('ST04-011', 'm3-2026-10-12'),
]
// M5 batch: single-colour red or purple M5 Characters (the colours of the executable Leaders), each played in
// a real legal game by M5_CERTIFIED_TEST. Other M5 cards are recognised by the engine but not certified.
export const M5_CERTIFIABLE = M5_CARDS.filter(c => Array.isArray(c.colors) && c.colors.length === 1 && ['RED', 'PURPLE'].includes(c.colors[0]))
CERTIFICATIONS.push(...M5_CERTIFIABLE.map(card => {
  const blocker = card.review!.effects.length > 0, number = card.number
  return { definitionId: `${number}@${M5_REVISION}`, certifiedAt: today, rulesVersion: '1.2.1' as const, rulesetId: 'm5-reviewed-subset-2026-10-12',
    cardText: { ...card.review!.references[0], detail: `${number}: characteristics equal the engine definition; ${blocker ? 'exact [Blocker] text' : 'Effect "-"'}; no [Trigger]` },
    faq: { ...card.review!.references[1] }, errata: { ...card.review!.references[2] },
    abilities: blocker ? [{ kind: 'blocker' as const, id: 'blocker', tests: [M5_CERTIFIED_TEST] }] : [], tests: [M5_CERTIFIED_TEST],
    notes: 'M5 batch: data extracted from the official card list; executed through the generic Character and [Blocker] rules.' }
}))
// M6 official ability profiles are certified only against their exact revisions and real game-command tests.
const m6OfficialAbilityCertifications: Certification[] = [
  { definitionId: 'OP01-006@m6-2026-10-12', certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
    cardText: cardList('569101', 'OP01-006: official text, stats, optional target and −2000 duration verified'),
    faq: faq('qa_op01.pdf?20240405=', 'Official OP-01 FAQ checked; no card-specific ruling for OP01-006'), errata: errata('Official errata page checked; no applicable erratum'),
    abilities: [{ kind: 'declarative', id: 'OP01-006.on-play-power', tests: [M6_OTAMA_TEST, M6_OTAMA_DECLINE_TEST] }],
    tests: [M6_OTAMA_TEST, M6_OTAMA_DECLINE_TEST],
    notes: 'On Play up-to-one target, including an unrestricted target power; generic power modifier expires at turn end.' },
  { definitionId: 'OP01-007@m6-2026-10-12', certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
    cardText: cardList('569101', 'OP01-007: official text, stats and On K.O. current-power threshold verified'),
    faq: faq('qa_op01.pdf?20240405=', 'Official OP-01 FAQ checked; no card-specific ruling for OP01-007'), errata: errata('Official errata page checked; no applicable erratum'),
    abilities: [{ kind: 'declarative', id: 'OP01-007.on-ko', tests: [M6_CARIBOU_TEST] }],
    tests: [M6_CARIBOU_TEST],
    notes: 'On K.O. is captured only from a confirmed K.O.; the optional target is filtered by current power.' },
]
CERTIFICATIONS.push(...m6OfficialAbilityCertifications)
const nami = M3_ABILITY_CARDS.find(card => card.number === 'OP01-016')!
CERTIFICATIONS.push({
  definitionId: `${nami.number}@${nami.review!.revision}`, certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: { ...nami.review!.references[0], detail: 'OP01-016: official card text and characteristics checked; On Play search and bottom-in-any-order procedure' },
  faq: faq('qa_op01.pdf?20240405=', 'Official OP-01 FAQ checked; fewer than five cards means inspect all remaining cards'),
  errata: errata('Official errata page checked; no applicable erratum for OP01-016'),
  abilities: [{ kind: 'declarative', id: 'OP01-016.search', tests: M6_NAMI_SEARCH_TESTS }],
  tests: M6_NAMI_SEARCH_TESTS,
  notes: 'Official On Play search: top five, up to one {Straw Hat Crew} card other than Nami, then bottom the remainder in any order. Search and order choices are private; short-deck behavior follows the OP-01 FAQ.',
})
CERTIFICATIONS.push({
  definitionId: 'OP06-013@official-2026-10-11', certifiedAt: today, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: cardList('569106', 'OP06-013: full On Play and Trigger text, characteristics and zones checked'),
  faq: faq('qa_op06.pdf?20240419=', 'FAQ OP06-013: Trigger activates the On Play ability; Trigger resolution does not count as playing the Character'),
  errata: errata('Official errata page checked; no applicable OP06-013 erratum'),
  abilities: [
    { kind: 'declarative', id: 'OP06-013.on-play-film-search', tests: [M6_OP06_ON_PLAY_TEST] },
    { kind: 'trigger', id: 'OP06-013.on-play-film-search.trigger', tests: [M6_OP06_TRIGGER_TEST, M6_OP06_CROSS_SET_TEST] },
  ],
  tests: [M6_OP06_ON_PLAY_TEST, M6_OP06_TRIGGER_TEST, M6_OP06_CROSS_SET_TEST],
  notes: 'Both printed abilities are covered: On Play and Trigger. The Trigger suspends for private search/order choices and resumes the existing Life-damage flow after JSON restoration.',
})
// M6 Lot A — ST-01 Straw Hat Crew. Official card list, ST-01..04 FAQ (pdf 20240405) and errata page re-read on
// 2026-10-13 (docs/game/evidence/m6/sources/); every FAQ ruling for these numbers has a dedicated scenario.
const st01Day = '2026-10-13'
const st01Ref = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569001#${number}`, checkedAt: st01Day, language: 'en', detail })
const st01Faq = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405', checkedAt: st01Day, language: 'en', detail })
const st01Errata = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/rules/errata_card/', checkedAt: st01Day, language: 'en', detail })
const T = {
  jinbe: ['M6 local ST-01 Jinbe resolves its cardJson When Attacking text through the shared scheduler', 'M6 local ST-01 Jinbe does not activate its DON!!-gated ability without an attached DON!!', 'M6 local ST-01 Jinbe permits declining its up-to-one target after the condition is met', 'M6 ST-01 FAQ ST01-005: Jinbe may give +1000 to another Jinbe (other than this card means this Character)'],
  pistolMain: ['M6 local ST-01 Gum-Gum Jet Pistol Main KOs only an opposing Character at 6000 power or less', 'M6 local ST-01 Gum-Gum Jet Pistol Main can decline and excludes Characters above its printed power limit', 'M6 ST-01 FAQ ST01-015: Gum-Gum Jet Pistol compares the current power (6000 or less)'],
  pistolTrigger: ['M6 local ST-01 Gum-Gum Jet Pistol Trigger reuses the declared KO program and resumes the suspended Life damage'],
  luffy: ['M6 ST-01 Rush Luffy attacks on entry and its When Attacking ability suppresses Blocker for that battle', 'M6 ST-01 FAQ ST01-012: after the Luffy battle, another attacker can be blocked again'],
  usopp: ['M6 ST-01 Usopp blocks only Blocker Characters with at least 5000 current power for this battle', 'M6 ST-01 FAQ ST01-002: a Blocker keeps the attack after a Counter raises it above the Usopp limit'],
  usoppTrigger: ['M6 ST-01 Usopp Trigger plays the actual Life card into Characters through a serializable primitive'],
  jambeMain: ['M6 ST-01 Diable Jambe Main selects only a Straw Hat and suppresses Blocker when it attacks this turn'],
  jambeTrigger: ['M6 ST-01 Diable Jambe Trigger privately selects and KOs only an opposing Blocker costing at most 3', 'M6 ST-01 FAQ ST01-016: Diable Jambe Trigger only K.O.s a Character with its own [Blocker], not ST01-012'],
  sanji: ['M6 local ST-01 Sanji retains conditional Rush as a data-driven rule, not a printed always-on keyword', 'M6 local ST-01 Sanji gains Rush only after attaching two DON!! and can attack on its entry turn', 'M6 ST-01 FAQ ST01-004 and ST01-017: a rested Sanji cannot attack; Thousand Sunny can be used on the turn it is played'],
  brook: ['M6 local ST-01 Brook attaches up to two rested DON!! to one chosen character and survives JSON recovery', 'M6 ST-01 FAQ ST01-011: Brook gives up to 2 rested DON!! to a single card, and may give only 1'],
  sunny: ['M6 local ST-01 Thousand Sunny rests as its activation cost and boosts only a Straw Hat target', 'M6 ST-01 FAQ ST01-004 and ST01-017: a rested Sanji cannot attack; Thousand Sunny can be used on the turn it is played'],
  zoro: ['M6 local ST-01 Zoro uses the shared continuous characteristic evaluator when DON!! is attached', 'M6 ST-01 FAQ ST01-013: Zoro keeps +1000 with an attached DON!! during the opponent turn'],
  leader: ['M6 ST-01 Leader Luffy reuses the generic once-per-turn rested-DON attachment ability', 'M6 ST-01 FAQ ST01-001 and erratum: Leader Luffy gives up to 1 rested DON!!, never an attached one'],
  nami: ['M6 ST-01 Nami may attach the selected rested DON!! to herself through the shared effect path'],
  guardCounter: ['M3: Guard Point Counter offers an optional target and keeps the battle modifier after JSON restore', 'M3: Guard Point can decline its optional target without creating a power bonus', 'M3-4: red OP06-009 Shuraiya blocks purple Kaido, copies its Leader power On Block, and ST01-014 Guard Point saves it'],
  guardTrigger: ['M3-1: Guard Point [Trigger] from real Life damage gives +1000 during this turn and stays private until revealed'],
  deck: 'M6 ST-01 deck: the exact Starter Deck composition is legal under MUGIWARA_FREE',
}
const st01Cert = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: st01Ref(number, detail), faq: st01Faq(faqDetail), errata: st01Errata('September 26, 2022 "up to" adjustment checked; the definition follows the post-errata text'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), T.deck])], notes })
const L = 'm6-cardjson-2026-10-13'
export const ST01_CERTIFICATIONS: Certification[] = [
  st01Cert('ST01-001', 'm0-2026-10-10', 'Leader: Activate Main, once per turn, up to 1 rested DON!! to this Leader or 1 Character', 'FAQ ST01-001: a DON!! already given is not rested; orientation irrelevant', [{ kind: 'giveRestedDon', id: 'ST01-001.activate-main-give-rested-don', tests: T.leader }], 'Optional (up to 1) attachment from rested cost DON!! only.'),
  st01Cert('ST01-002', L, 'Usopp: [DON!! x2] When Attacking, no Blocker with 5000+ power; Trigger play this card', 'FAQ ST01-002: the blocked target stays after a Counter', [{ kind: 'declarative', id: 'ST01-002.when-attacking-prevent-blocker', tests: T.usopp }, { kind: 'trigger', id: 'ST01-002.when-attacking-prevent-blocker.trigger', tests: T.usoppTrigger }], 'Battle-scoped Blocker restriction filtered by current power; Trigger plays the revealed Life card.'),
  st01Cert('ST01-004', L, 'Sanji: [DON!! x2] this Character gains [Rush]', 'FAQ ST01-004: a rested Character cannot attack', [{ kind: 'declarative', id: 'ST01-004.conditional-rush', tests: T.sanji }], 'Conditional keyword evaluated from attached DON!!.'),
  st01Cert('ST01-005', L, 'Jinbe: [DON!! x1] When Attacking, up to 1 Leader/Character other than this card +1000 this turn', 'FAQ ST01-005: another Jinbe is a valid target', [{ kind: 'declarative', id: 'ST01-005.when-attacking', tests: T.jinbe }], 'Optional target excluding the source instance only.'),
  st01Cert('ST01-007', 'm0-2026-10-10', 'Nami: Activate Main, once per turn, up to 1 rested DON!! to the Leader or 1 Character', 'FAQ ST01-007: Nami may give the DON!! to herself', [{ kind: 'giveRestedDon', id: 'ST01-007.activate-main-give-rested-don', tests: T.nami }], 'Same generic attachment as the Leader, any own Leader/Character including the source.'),
  st01Cert('ST01-011', L, 'Brook: On Play, give up to 2 rested DON!! to the Leader or 1 Character', 'FAQ ST01-011: one card may receive 1; no split between two cards', [{ kind: 'declarative', id: 'ST01-011.on-play-attach-rested-don', tests: T.brook }], 'Up to two DON!!, one recipient.'),
  st01Cert('ST01-012', L, 'Luffy: [Rush]; [DON!! x2] When Attacking, the opponent cannot activate [Blocker] during this battle', 'FAQ ST01-012: the restriction ends with that battle', [{ kind: 'declarative', id: 'ST01-012.when-attacking-prevent-blocker', tests: T.luffy }], 'Rush keyword and battle-scoped Blocker restriction.'),
  st01Cert('ST01-013', L, 'Zoro: [DON!! x1] this Character gains +1000 power', 'FAQ ST01-013: also during the opponent turn', [{ kind: 'declarative', id: 'ST01-013.attached-don-power', tests: T.zoro }], 'Continuous characteristic from attached DON!!, both turns.'),
  st01Cert('ST01-014', 'm3-2026-10-12', 'Guard Point: [Counter] up to 1 Leader/Character +3000 this battle; [Trigger] +1000 this turn', 'No FAQ entry for ST01-014', [{ kind: 'declarative', id: 'ST01-014.counter', tests: T.guardCounter }, { kind: 'counterEvent', id: 'ST01-014.counter', tests: T.guardCounter }, { kind: 'trigger', id: 'ST01-014.counter.trigger', tests: T.guardTrigger }], 'Counter Event paid at its printed cost; Trigger during Life damage.'),
  st01Cert('ST01-015', L, 'Gum-Gum Jet Pistol: [Main] K.O. up to 1 opposing Character with 6000 power or less; [Trigger] activate this [Main]', 'FAQ ST01-015: current power is compared', [{ kind: 'declarative', id: 'ST01-015.main-ko-character', tests: T.pistolMain }, { kind: 'trigger', id: 'ST01-015.main-ko-character.trigger', tests: T.pistolTrigger }], 'Main and Trigger share the same KO program.'),
  st01Cert('ST01-016', L, 'Diable Jambe: [Main] up to 1 Straw Hat Crew cannot be blocked this turn; [Trigger] K.O. up to 1 opposing Blocker of cost 3 or less', 'FAQ ST01-016: battle-scoped; only own [Blocker] counts', [{ kind: 'declarative', id: 'ST01-016.main-prevent-blocker', tests: T.jambeMain }, { kind: 'trigger', id: 'ST01-016.trigger-ko-blocker', tests: T.jambeTrigger }], 'Selector reads the printed [Blocker] ability, never the text.'),
  st01Cert('ST01-017', L, 'Thousand Sunny: Activate Main, rest this Stage: up to 1 Straw Hat Crew +1000 this turn', 'FAQ ST01-017: usable on the turn it is played', [{ kind: 'declarative', id: 'ST01-017.activate-main-boost', tests: T.sunny }], 'REST_SOURCE cost on the Stage.'),
]
CERTIFICATIONS.push(...ST01_CERTIFICATIONS)
// M6 Lot A — ST-02 Worst Generation (same sources and date as ST-01; series 569002).
const st02Ref = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569002#${number}`, checkedAt: st01Day, language: 'en', detail })
const U = {
  leader: ['M6 ST-02 FAQ ST02-001: Leader Kid rests 3 DON!!, trashes 1 card and sets itself active to attack again', 'M6 ST-02 Leader Kid is not offered without a card in hand or without 3 active DON!!'],
  urouge: ['M6 ST-02 FAQ ST02-003: Urouge gains +2000 with 1 DON!! and 3 Characters including itself, on both turns'],
  killer: ['M6 ST-02 Killer On Play K.O.s up to 1 opposing rested Character with cost 3 or less, and may choose none'],
  killerTrigger: ['M6 ST-02 Killer Trigger plays the revealed Life card', 'M6 CR 3-7-6-1: a Trigger "Play this card" with 5 Characters trashes 1 chosen Character first (rule processing)'],
  bonney: ['M6 ST-02 FAQ ST02-007: Bonney can search on the turn played; without {Supernovas} all 5 go to the bottom'],
  apoo: ['M6 ST-02 FAQ ST02-008: Apoo rests only an active DON!! of the opponent cost area'],
  law: ['M6 ST-02 FAQ ST02-009: Law sets a rested {Supernovas}/{Heart Pirates} Character active (never the Leader), which may attack again'],
  hawkins: ['M6 ST-02 FAQ ST02-010: Hawkins becomes active after battling a Character (also through a Blocker), once per turn, not after a Leader battle'],
  kid: ['M6 ST-02 FAQ ST02-013: Kid with a DON!! is set active at the end of the turn; without DON!! it stays rested'],
  drake: ['M6 ST-02 FAQ ST02-014: rested X.Drake with 1 DON!! gives +1000 once to {Supernovas}/{Navy} cards on your turn only'],
  counters: ['M6 ST-02 FAQ ST02-015/016: Scalpel and Repel give power then may set 0 or 1 DON!! active; Scalpel Trigger sets up to 2'],
  sword: ['M6 ST-02 FAQ ST02-017: Straw Sword rests up to 1 opposing Character (a rested one: nothing); its Trigger plays only a {Supernovas} Character/Stage of cost 2 or less'],
  plain: ['M6 ST-02 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
  deck: 'M6 ST-02 deck: the exact Starter Deck is legal, offered in /play and full bot games end with a winner, legal commands only',
}
const st02Cert = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: st02Ref(number, detail), faq: st01Faq(faqDetail), errata: st01Errata('Errata page checked; the definition follows the current (post-errata) text'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests, U.deck])], notes })
const M5 = 'm5-2026-10-12'
export const ST02_CERTIFICATIONS: Certification[] = [
  st02Cert('ST02-001', L, 'Leader: Activate Main, once per turn, rest 3 DON!! and trash 1 card from hand: set this Leader active', 'FAQ ST02-001: the Leader may attack again', [{ kind: 'declarative', id: 'ST02-001.activate-main-set-active', tests: U.leader }], 'REST_DON 3 cost, mandatory hand discard as part of the cost, set active.'),
  st02Cert('ST02-002', M5, 'Vito: no ability', 'No FAQ entry', [], 'Vanilla Character.', U.plain),
  st02Cert('ST02-003', L, 'Urouge: [DON!! x1] with 3 or more Characters, +2000 power', 'FAQ ST02-003: counted at the Damage Step, itself included, both turns', [{ kind: 'declarative', id: 'ST02-003.don-power', tests: U.urouge }], 'Conditional continuous modifier.'),
  st02Cert('ST02-004', M5, 'Capone Bege: [Blocker]', 'No FAQ entry', [{ kind: 'blocker', id: 'blocker', tests: U.plain }], 'Printed [Blocker].', U.plain),
  st02Cert('ST02-005', L, 'Killer: On Play K.O. up to 1 opposing rested Character cost 3 or less; Trigger play this card', 'No FAQ entry; errata "up to" checked', [{ kind: 'declarative', id: 'ST02-005.on-play-ko-rested-character', tests: U.killer }, { kind: 'trigger', id: 'ST02-005.trigger-play-self', tests: U.killerTrigger }], 'Generic filtered selector; Trigger play follows CR 3-7-6-1.'),
  st02Cert('ST02-006', M5, 'Koby: no ability', 'No FAQ entry', [], 'Vanilla Character.', U.plain),
  st02Cert('ST02-007', L, 'Jewelry Bonney: Activate Main, ① and rest this Character: top 5, up to 1 {Supernovas} to hand, rest at the bottom', 'FAQ ST02-007: usable on the turn played; no {Supernovas}: all to the bottom', [{ kind: 'declarative', id: 'ST02-007.activate-main-search', tests: U.bonney }], 'Shared private search procedure.'),
  st02Cert('ST02-008', L, 'Scratchmen Apoo: [DON!! x1] When Attacking, rest up to 1 opposing DON!!', 'FAQ ST02-008: only an active DON!! of the cost area', [{ kind: 'declarative', id: 'ST02-008.when-attacking-rest-don', tests: U.apoo }], 'Selector restricted to active DON!! in the opposing cost area.'),
  st02Cert('ST02-009', L, 'Trafalgar Law: On Play, set up to 1 own rested {Supernovas}/{Heart Pirates} Character cost 5 or less as active', 'FAQ ST02-009: Characters only; it may attack again', [{ kind: 'declarative', id: 'ST02-009.on-play-set-active', tests: U.law }], 'Leader excluded by the Characters zone.'),
  st02Cert('ST02-010', L, 'Basil Hawkins: [DON!! x1] [Once Per Turn] [Your Turn] after battling an opposing Character, set active', 'FAQ ST02-010: at the end of a resolved battle against a Character, Blocker included', [{ kind: 'declarative', id: 'ST02-010.battle-set-active', tests: U.hawkins }], 'CHARACTER_BATTLED event after the Damage Step power comparison.'),
  st02Cert('ST02-011', M5, 'Heat: no ability', 'No FAQ entry', [], 'Vanilla Character.', U.plain),
  st02Cert('ST02-012', M5, 'Bepo: no ability', 'No FAQ entry', [], 'Vanilla Character.', U.plain),
  st02Cert('ST02-013', L, 'Eustass Kid: [Blocker]; [DON!! x1] End of Your Turn, set this Character as active', 'FAQ ST02-013: mandatory; nothing if already active', [{ kind: 'blocker', id: 'blocker', tests: U.plain }, { kind: 'declarative', id: 'ST02-013.end-of-turn-set-active', tests: U.kid }], 'End of Your Turn trigger captured from MAIN_ENDED.'),
  st02Cert('ST02-014', L, 'X.Drake: [DON!! x1] [Your Turn] while rested, own {Supernovas}/{Navy} Leader and Characters +1000', 'FAQ ST02-014: +1000 once even with both types', [{ kind: 'declarative', id: 'ST02-014.rested-aura', tests: U.drake }], 'Continuous aura evaluated from the serialized state.'),
  st02Cert('ST02-015', L, 'Scalpel: Counter +2000 this battle then up to 1 DON!! active; Trigger up to 2 DON!! active', 'FAQ ST02-015: 0 DON!! allowed; Trigger without enough DON!!', [{ kind: 'declarative', id: 'ST02-015.counter', tests: U.counters }, { kind: 'counterEvent', id: 'ST02-015.counter', tests: U.counters }, { kind: 'trigger', id: 'ST02-015.trigger', tests: U.counters }], 'Counter Event paid at its printed cost; Trigger free of the printed cost.'),
  st02Cert('ST02-016', L, 'Repel: Counter +4000 this battle then up to 1 DON!! active', 'FAQ ST02-016: 0 DON!! allowed', [{ kind: 'declarative', id: 'ST02-016.counter', tests: U.counters }, { kind: 'counterEvent', id: 'ST02-016.counter', tests: U.counters }], 'Counter Event paid at its printed cost.'),
  st02Cert('ST02-017', L, 'Straw Sword: Main rest up to 1 opposing Character; Trigger play up to 1 {Supernovas} card cost 2 or less from hand', 'FAQ ST02-017: rested target allowed; Character/Stage only; On Play activates', [{ kind: 'declarative', id: 'ST02-017.main-rest', tests: U.sword }, { kind: 'trigger', id: 'ST02-017.trigger-play', tests: U.sword }], 'playCard primitive captures On Play.'),
]
CERTIFICATIONS.push(...ST02_CERTIFICATIONS)
// M6 Lot B — ST-03 (series 569003) and ST-04 (series 569004). Same sources and date as ST-01.
// Not certified: ST04-017 Onigashima Island (its "Leader without {Animal Kingdom Pirates}: nothing happens" FAQ case is not yet tested).
const ref34 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=${number.startsWith('ST03') ? '569003' : '569004'}#${number}`, checkedAt: st01Day, language: 'en', detail })
const V = {
  croc: ['M6 ST-03 FAQ ST03-001: Leader Crocodile pays DON!! -4 to return any Character cost 5 or less, own included, once per turn'],
  crocBlock: ['M6 ST-03 FAQ ST03-003: Crocodile On Block bottoms the attacking Character (cost 2 or less) and the battle ends; own Characters allowed'],
  moria: ['M6 ST-03 FAQ ST03-004: Gecko Moria recovers a {Seven Warlords}/{Thriller Bark} Character cost 4 or less, never one named Gecko Moria'],
  mihawk: ['M6 ST-03 FAQ ST03-005: Mihawk with a DON!! draws 2 then trashes 2 cards from the hand'],
  sento: ['M6 ST-03 FAQ ST03-007: Sentomaru plays a [Pacifista] cost 4 or less from the deck then shuffles; without one it only shuffles'],
  bounce: ['M6 ST-03 FAQ ST03-009/014/015: Doflamingo, Teach and Sables return a Character (own allowed) to its owner hand within their cost limit'],
  triggers: ['M6 ST-03 Sables and Thrust Pad Cannon Triggers activate the same return effect; Boa Hancock and Kuma Triggers play themselves'],
  kuma: ['M6 ST-03 FAQ ST03-010: Kuma orders the top 3 and returns them all to the top or all to the bottom, never split; a short deck is allowed'],
  pad: ['M6 ST-03 FAQ ST03-016: Thrust Pad Cannon may return the attacker (the battle ends) or an own Character whose Counter can then be used'],
  plain: ['M6 ST-03/ST-04 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
  mellow: ['M3-1: Love-Love Mellow draws when the hand holds 3 cards once the Event is trashed (FAQ ST03-017)', 'M3-1: Love-Love Mellow does not draw when 4 cards remain in hand after the Event is trashed', 'M3-1: Love-Love Mellow resumes once from JSON and a repeated answer neither redraws nor rebuffs', 'M3-1: Love-Love Mellow still draws when its optional target is declined (CR 4-10-2)'],
  kaidoLeader: ['M3-3: Kaido pays DON!! -7, trashes the top Life card of the opponent and stays once per turn', 'M3-3: Kaido may choose zero Life cards after paying, and its cost requires 7 distinct own field DON!!, attached ones included', 'M3-3: Kaido is not offered below 7 field DON!! and a MOVE_DON prohibition makes its cost unpayable', 'M3-4: Kaido trashing a Life card with [Trigger] is not damage: no Trigger window opens and the Life count drops by one', 'M6 ST-04 FAQ ST04-001: Kaido may be activated when the opponent has no Life card; nothing happens'],
  blast: ['M3-1: Blast Breath with DON!! -1 returns one DON!! and grants +4000 during this battle', 'M3-1: Blast Breath without DON!! -1 is activated but its effect does not apply (FAQ ST04-016)', 'M3-3: Blast Breath from a naturally drawn hand defends in the legal purple deck, DON!! -1 returning the DON!! that paid it (CR 10-2-10-1)', 'M3-4: a MOVE_DON prohibition refuses Blast Breath DON!! -1 like Kaido DON!! -7, while the printed Counter stays playable without it'],
  ulti: ['M6 ST-04 FAQ ST04-002: Ulti pays DON!! -1 to play a [Page One] cost 4 or less from hand; it may be played without one'],
  kaido: ['M6 ST-04 FAQ ST04-003: Kaido pays DON!! -5, K.O.s up to 1 Character cost 6 or less and gains [Rush] even without a target'],
  donMinus: ['M6 ST-04 King, Who is Who, Queen and Sasaki pay DON!! -1 for their On Play; without enough DON!! the effect is not activated'],
  jack: ['M6 ST-04 FAQ ST04-008: Jack may trash 1 card to add an active DON!!; with an empty DON!! deck the card is still trashed; no hand: nothing'],
  events: ['M6 ST-04 FAQ ST04-014/015: Disaster draws then adds a DON!!; Brachio Bomber K.O.s then adds a DON!!; both work with an empty DON!! deck'],
}
const cert34 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref34(number, detail), faq: st01Faq(faqDetail), errata: st01Errata(number === 'ST04-001' ? 'Errata (Sept. 26, 2022): "from the top of their Life cards"; the program trashes the top Life card' : 'Errata page checked; the definition follows the current (post-errata) text'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
const M3 = 'm3-2026-10-12'
const d = (id: string, tests: string[]): CertifiedAbility => ({ kind: 'declarative', id, tests })
export const ST03_ST04_CERTIFICATIONS: Certification[] = [
  cert34('ST03-001', L, 'Leader: Activate Main, once per turn, DON!! -4: return up to 1 Character cost 5 or less to its owner hand', 'FAQ ST03-001: own Character allowed', [d('ST03-001.activate-main-bounce', V.croc)], 'DON!! -4 selected by the player (CR 10-2-10-1).'),
  cert34('ST03-002', M5, 'Edward Weevil: no ability', 'No FAQ entry', [], 'Vanilla Character.', V.plain),
  cert34('ST03-003', L, 'Crocodile: [Blocker]; [DON!! x1] On Block, bottom up to 1 Character cost 2 or less', 'FAQ ST03-003: battle ends if the attacker leaves; own Character allowed', [{ kind: 'blocker', id: 'blocker', tests: V.plain }, d('ST03-003.on-block-bottom', V.crocBlock)], 'Interrupted battle ends without damage.'),
  cert34('ST03-004', L, 'Gecko Moria: On Play, up to 1 {Seven Warlords}/{Thriller Bark} Character cost 4 or less other than [Gecko Moria] from trash to hand', 'FAQ ST03-004: no card named Gecko Moria', [d('ST03-004.on-play-recover', V.moria)], 'Name exclusion by rules name.'),
  cert34('ST03-005', L, 'Dracule Mihawk: [DON!! x1] When Attacking, draw 2 cards and trash 2 cards from your hand', 'FAQ ST03-005: drawing is mandatory whenever possible', [d('ST03-005.when-attacking-draw-trash', V.mihawk)], 'Mandatory trash clamped to the available hand.'),
  cert34('ST03-006', M5, 'Jinbe: no ability', 'No FAQ entry', [], 'Vanilla Character.', V.plain),
  cert34('ST03-007', L, 'Sentomaru: [DON!! x1] Activate Main, once per turn, ②: play up to 1 [Pacifista] cost 4 or less from deck, then shuffle', 'FAQ ST03-007: without Pacifista, only shuffle', [d('ST03-007.activate-main-play-pacifista', V.sento)], 'Private deck choice; playCard then SHUFFLE_DECK.'),
  cert34('ST03-008', M5, 'Trafalgar Law: [Blocker]', 'No FAQ entry', [{ kind: 'blocker', id: 'blocker', tests: V.plain }], 'Printed [Blocker].', V.plain),
  cert34('ST03-009', L, 'Donquixote Doflamingo: On Play, return up to 1 Character cost 7 or less to its owner hand', 'FAQ ST03-009: itself or another own Character allowed', [d('ST03-009.on-play-bounce', V.bounce)], 'Any side selector.'),
  cert34('ST03-010', L, 'Bartholomew Kuma: On Play look at 3 top cards, return them to the top or bottom in any order; Trigger play this card', 'FAQ ST03-010: all to the same place; short deck allowed', [d('ST03-010.on-play-look-place', V.kuma), { kind: 'trigger', id: 'ST03-010.trigger-play-self', tests: V.triggers }], 'ORDER then all-or-none bottom choice, arrangeTopDeck.'),
  cert34('ST03-011', M5, 'Buggy: no ability', 'No FAQ entry', [], 'Vanilla Character.', V.plain),
  cert34('ST03-012', M5, 'Pacifista: no ability', 'No FAQ entry', [], 'Vanilla Character.', V.plain),
  cert34('ST03-013', L, 'Boa Hancock: [Blocker]; Trigger play this card', 'No FAQ entry', [{ kind: 'blocker', id: 'blocker', tests: V.plain }, d('ST03-013.trigger-play-self', V.triggers), { kind: 'trigger', id: 'ST03-013.trigger-play-self', tests: V.triggers }], 'Trigger play follows CR 3-7-6-1.'),
  cert34('ST03-014', L, 'Marshall.D.Teach: On Play, return up to 1 Character cost 3 or less to its owner hand', 'FAQ ST03-014: itself or another own Character allowed', [d('ST03-014.on-play-bounce', V.bounce)], 'Any side selector.'),
  cert34('ST03-015', L, 'Sables: Main return up to 1 Character cost 7 or less; Trigger activate this Main', 'FAQ ST03-015: own Character allowed', [d('ST03-015.main-bounce', V.bounce), { kind: 'trigger', id: 'ST03-015.main-bounce.trigger', tests: V.triggers }], 'Trigger runs the same program as Main.'),
  cert34('ST03-016', L, 'Thrust Pad Cannon: Counter return up to 1 Character cost 3 or less; Trigger activate this Counter', 'FAQ ST03-016: attacker/target leaving ends the battle; own Character, its Counter usable', [d('ST03-016.counter', V.pad), { kind: 'counterEvent', id: 'ST03-016.counter', tests: V.pad }, { kind: 'trigger', id: 'ST03-016.counter.trigger', tests: V.triggers }], 'Counter Event at its printed cost.'),
  cert34('ST03-017', M3, 'Love-Love Mellow: Counter up to 1 +4000 this battle, then draw 1 if 3 or fewer cards in hand', 'FAQ ST03-017: the trashed Event is not counted', [d('ST03-017.counter', V.mellow), { kind: 'counterEvent', id: 'ST03-017.counter', tests: V.mellow }], 'M3 declarative Counter Event.'),
  cert34('ST04-001', M3, 'Leader Kaido: Activate Main, once per turn, DON!! -7: trash up to 1 card from the top of the opponent Life cards', 'FAQ ST04-001: no Life card: nothing happens', [d('ST04-001.activate-main-trash-top-life', V.kaidoLeader)], 'Trashing Life is not damage (no Trigger).'),
  cert34('ST04-002', L, 'Ulti: On Play DON!! -1: play up to 1 [Page One] cost 4 or less from hand', 'FAQ ST04-002: playable without a target', [d('ST04-002.on-play-play-page-one', V.ulti)], 'All-or-nothing DON!! -1 choice inside the program.'),
  cert34('ST04-003', L, 'Kaido: On Play DON!! -5: K.O. up to 1 opposing Character cost 6 or less; this Character gains [Rush] this turn', 'FAQ ST04-003: Rush even with no K.O. target', [d('ST04-003.on-play-ko-rush', V.kaido)], 'Temporary keyword grant.'),
  cert34('ST04-004', L, 'King: On Play DON!! -1: K.O. up to 1 opposing Character cost 4 or less', 'No FAQ entry', [d('ST04-004.on-play-ko', V.donMinus)], 'DON!! -1 then K.O.'),
  cert34('ST04-005', L, 'Queen: [Blocker]; On Play DON!! -1: draw 2 cards and trash 1 card', 'No FAQ entry', [{ kind: 'blocker', id: 'blocker', tests: V.plain }, d('ST04-005.on-play-draw-trash', V.donMinus)], 'Draw then mandatory trash.'),
  cert34('ST04-006', L, 'Sasaki: On Play DON!! -1: draw 1 card', 'No FAQ entry', [d('ST04-006.on-play-draw', V.donMinus)], 'DON!! -1 then draw.'),
  cert34('ST04-008', L, 'Jack: On Play, you may trash 1 card from your hand: add up to 1 DON!! active', 'FAQ ST04-008: empty DON!! deck: only the trash; no hand: no activation', [d('ST04-008.on-play-trash-add-don', V.jack)], 'Optional cost modelled as an optional choice.'),
  cert34('ST04-010', L, "Who's.Who: On Play DON!! -1: K.O. up to 1 opposing Character cost 3 or less; Trigger play this card", 'FAQ ST04-010: played by Trigger without DON!!: no On Play', [d('ST04-010.on-play-ko', V.donMinus), { kind: 'trigger', id: 'ST04-010.trigger-play-self', tests: V.donMinus }], 'DON!! -1 unavailable below 1 field DON!!.'),
  cert34('ST04-014', L, 'Lead Performer "Disaster": Main draw 1 then add up to 1 DON!! active; Trigger activate this Main', 'FAQ ST04-014: the draw is mandatory; empty DON!! deck allowed', [d('ST04-014.main-draw-don', V.events), { kind: 'trigger', id: 'ST04-014.main-draw-don.trigger', tests: V.events }], 'moveDon from an empty DON!! deck does nothing.'),
  cert34('ST04-015', L, 'Brachio Bomber: Main K.O. up to 1 opposing Character cost 6 or less then add up to 1 DON!! active; Trigger add up to 1 DON!! active', 'FAQ ST04-015: empty DON!! deck allowed', [d('ST04-015.main-ko-don', V.events), { kind: 'trigger', id: 'ST04-015.trigger-don', tests: V.events }], 'K.O. then DON!!.'),
  cert34('ST04-016', M3, 'Blast Breath: Counter DON!! -1: up to 1 +4000 this battle', 'FAQ ST04-016: without DON!! -1 nothing happens', [d('ST04-016.counter', V.blast), { kind: 'counterEvent', id: 'ST04-016.counter', tests: V.blast }], 'M3 declarative Counter Event.'),
]
CERTIFICATIONS.push(...ST03_ST04_CERTIFICATIONS)
// M6 Lot C — ST-05 (series 569005) and ST-06 (series 569006), plus ST04-017 whose negative FAQ case uses a ST-05 Leader.
const ref56 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=${number.startsWith('ST05') ? '569005' : number.startsWith('ST06') ? '569006' : '569004'}#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq56 = (number: string, detail: string): SourceReference => ({ source: number.startsWith('ST05') ? 'https://en.onepiece-cardgame.com/pdf/qa_st-05.pdf?20230127' : number.startsWith('ST06') ? 'https://en.onepiece-cardgame.com/pdf/qa_st-06.pdf?20230303' : 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405', checkedAt: st01Day, language: 'en', detail })
const W = {
  shanks: ['M6 ST-05 FAQ ST05-001: Shanks DON!! -3 gives +2000 to every own {FILM} Character this turn, never to the Leader'],
  ainTesoro: ['M6 ST-05 Ain adds a rested DON!!; Gild Tesoro pays DON!! -2 on attack to draw 2'],
  uta: ['M6 ST-05 Uta On Block pays DON!! -1 to rest up to 1 opposing Character with cost 5 or less'],
  carina: ['M6 ST-05 FAQ ST05-005: Carina rests and trashes a {FILM} card; with more opposing field DON!! it adds 2 rested DON!! (1 if only 1 is left)'],
  shiki: ['M6 ST-05 FAQ ST05-008: Shiki cannot be K.O.d in battle with 8 field DON!! (given DON!! included), but can with 7'],
  zephyr: ['M6 ST-05 FAQ ST05-010: Zephyr gains +3000 for each battle with a <Strike> Character (twice: +6000); DON!! -1 gives +2000 once per turn'],
  bullet: ['M6 ST-05 FAQ ST05-011: Douglas Bullet DON!! -4 rests up to 2 opposing Characters cost 6 or less and gains [Double Attack], even with no target'],
  festa: ['M6 ST-05 Buena Festa searches a {FILM} card other than [Buena Festa]; Scarlet Trigger plays itself'],
  lion: ['M6 ST-05 Lions Threat pays DON!! -2 to K.O. up to 1 cost 5 or less; its Trigger and Union Armada Trigger add an active DON!!'],
  armada: ['M6 ST-05 FAQ ST05-017: Union Armada +4000 on a {FILM} card; the chosen Character cannot be K.O.d by effects or in battle this turn'],
  oni: ['M6 ST-04 FAQ ST04-017: Onigashima adds a rested DON!! only with an {Animal Kingdom Pirates} Leader; otherwise it rests and nothing happens', 'M6 ST-04 FAQ ST04-017: Onigashima with a Leader without {Animal Kingdom Pirates} rests and nothing happens'],
  koSak: ['M6 ST-06 Sakazuki and Garp pay their costs in full (FAQ ST06-012) to K.O. a cost-0 / cost-4-or-less Character; Koby needs a card in hand (FAQ ST06-002)'],
  cost: ['M6 ST-06 cost reductions: Sengoku -4 on attack, Tashigi -2, Helmeppo -3, Great Eruption draw then -2 (FAQ order), Navy HQ -1 twice (FAQ)'],
  smoker: ['M6 ST-06 FAQ ST06-004: Smoker cannot be K.O.d by effects; with a DON!! it has [Double Attack] only while a cost-0 Character exists'],
  wave: ['M6 ST-06 Shockwave +4000 then K.O.s an opposing active Character cost 3 or less; its Trigger K.O.s cost 4 or less'],
  eruption: ['M6 ST-06 FAQ ST06-015: Great Eruption Trigger lets the opponent choose and trash 1 card of their hand; nothing with an empty hand'],
  whiteOut: ['M6 ST-06 FAQ ST06-016: White Out +2000; its Trigger draws 1 and protects only the Characters already on the field this turn'],
  plain: ['M6 ST-05/ST-06 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
}
const cert56 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref56(number, detail), faq: faq56(number, faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
const dd = (id: string, tests: string[]): CertifiedAbility => ({ kind: 'declarative', id, tests })
const tr = (id: string, tests: string[]): CertifiedAbility => ({ kind: 'trigger', id, tests })
const bl = (tests: string[]): CertifiedAbility => ({ kind: 'blocker', id: 'blocker', tests })
const ce = (id: string, tests: string[]): CertifiedAbility => ({ kind: 'counterEvent', id, tests })
export const ST05_ST06_CERTIFICATIONS: Certification[] = [
  cert56('ST04-017', L, 'Onigashima Island: Activate Main, rest this Stage: with an {Animal Kingdom Pirates} Leader, add up to 1 DON!! rested', 'FAQ ST04-017: activatable with another Leader (nothing happens) or an empty DON!! deck', [dd('ST04-017.activate-main-add-don', W.oni)], 'Leader type checked inside the program.'),
  cert56('ST05-001', L, 'Leader Shanks: Activate Main, once per turn, DON!! -3: all own {FILM} Characters +2000 this turn', 'FAQ ST05-001: not the Leader', [dd('ST05-001.activate-main-film-power', W.shanks)], 'BIND_ALL over own {FILM} Characters.'),
  cert56('ST05-002', L, 'Ain: On Play add up to 1 DON!! rested', 'No FAQ entry', [dd('ST05-002.on-play-add-don', W.ainTesoro)], 'moveDon rested.'),
  cert56('ST05-004', L, 'Uta: [Blocker]; On Block DON!! -1: rest up to 1 opposing Character cost 5 or less', 'No FAQ entry', [bl(W.plain), dd('ST05-004.on-block-rest', W.uta)], 'All-or-nothing DON!! -1.'),
  cert56('ST05-005', L, 'Carina: Activate Main, once per turn, rest this and trash 1 {FILM}: if the opponent has more field DON!!, add 2 DON!! rested', 'FAQ ST05-005: with 1 DON!! left, add it', [dd('ST05-005.activate-main-add-don', W.carina)], 'Condition evaluated once (CHECK).'),
  cert56('ST05-006', L, 'Gild Tesoro: When Attacking DON!! -2: draw 2 cards', 'No FAQ entry', [dd('ST05-006.when-attacking-draw', W.ainTesoro)], 'DON!! -2 then draw.'),
  cert56('ST05-008', L, 'Shiki: with 8 or more field DON!!, cannot be K.O.d in battle', 'FAQ ST05-008: every field DON!! counts, given ones included', [dd('ST05-008.no-battle-ko', W.shiki)], 'Continuous K.O. protection in battle.'),
  cert56('ST05-009', L, 'Scarlet: Trigger play this card', 'No FAQ entry', [dd('ST05-009.trigger-play-self', W.festa), tr('ST05-009.trigger-play-self', W.festa)], 'CR 3-7-6-1 when the area is full.'),
  cert56('ST05-010', L, 'Zephyr: battling a <Strike> Character, +3000 this turn; Activate Main, once per turn, DON!! -1: +2000 this turn', 'FAQ ST05-010: +3000 for each such battle', [dd('ST05-010.battle-strike-power+activate-main-power', W.zephyr)], 'BATTLE_PAIRED once the Block Step ends.'),
  cert56('ST05-011', L, 'Douglas Bullet: Activate Main, once per turn, DON!! -4: rest up to 2 opposing Characters cost 6 or less, then [Double Attack] this turn', 'FAQ ST05-011: Double Attack even without a target', [dd('ST05-011.activate-main-rest-double', W.bullet)], 'Temporary keyword grant.'),
  cert56('ST05-014', L, 'Buena Festa: On Play top 5, up to 1 {FILM} other than [Buena Festa] to hand, rest at the bottom', 'No FAQ entry; printed power "-" read as 0', [dd('ST05-014.on-play-search', W.festa)], 'Shared private search.'),
  cert56('ST05-016', L, "Lion's Threat Imperial Earth Bind: Main DON!! -2: K.O. up to 1 opposing Character cost 5 or less; Trigger add up to 1 DON!! active", 'No FAQ entry', [dd('ST05-016.main-ko', W.lion), tr('ST05-016.trigger-don', W.lion)], 'DON!! -2 inside the Main program.'),
  cert56('ST05-017', L, 'Union Armada: Counter up to 1 own {FILM} +4000 this battle, a Character cannot be K.O.d this turn; Trigger add up to 1 DON!! active', 'FAQ ST05-017: neither by effects nor in battle', [dd('ST05-017.counter', W.armada), ce('ST05-017.counter', W.armada), tr('ST05-017.trigger-don', W.lion)], 'Temporary K.O. immunity.'),
  cert56('ST06-001', L, 'Leader Sakazuki: Activate Main, once per turn, ③ and trash 1 card: K.O. up to 1 opposing Character cost 0', 'No FAQ entry; costs paid in full', [dd('ST06-001.activate-main-ko', W.koSak)], 'REST_DON 3 plus a mandatory discard.'),
  cert56('ST06-002', L, 'Koby: On Play you may trash 1 card: K.O. up to 1 opposing Character cost 0', 'FAQ ST06-002: no hand, no On Play', [dd('ST06-002.on-play-ko', W.koSak)], 'Hand condition on the On Play.'),
  cert56('ST06-003', M5, 'Jango: no ability', 'No FAQ entry', [], 'Vanilla Character.', W.plain),
  cert56('ST06-004', L, 'Smoker: cannot be K.O.d by effects; [DON!! x1] with a cost-0 Character on the field, [Double Attack]', 'FAQ ST06-004: checked before the Damage Step; immune to effect K.O.', [dd('ST06-004.no-effect-ko+double-attack', W.smoker)], 'Continuous protection and conditional keyword.'),
  cert56('ST06-005', L, 'Sengoku: When Attacking, up to 1 opposing Character -4 cost this turn', 'No FAQ entry', [dd('ST06-005.when-attacking-cost', W.cost)], 'Temporary cost modifier (floor 0).'),
  cert56('ST06-006', L, 'Tashigi: Activate Main, rest this: up to 1 opposing Character -2 cost this turn', 'No FAQ entry', [dd('ST06-006.activate-main-cost', W.cost)], 'REST_SOURCE cost.'),
  cert56('ST06-007', M5, 'Tsuru: [Blocker]', 'No FAQ entry', [bl(W.plain)], 'Printed [Blocker].', W.plain),
  cert56('ST06-008', L, 'Hina: On Play, up to 1 opposing Character -4 cost this turn', 'No FAQ entry', [dd('ST06-008.on-play-cost', W.koSak)], 'Temporary cost modifier.'),
  cert56('ST06-009', M5, 'Fullbody: no ability', 'No FAQ entry', [], 'Vanilla Character.', W.plain),
  cert56('ST06-010', L, 'Helmeppo: On Play, up to 1 opposing Character -3 cost this turn', 'No FAQ entry', [dd('ST06-010.on-play-cost', W.cost)], 'Temporary cost modifier.'),
  cert56('ST06-011', M5, 'Momonga: no ability', 'No FAQ entry', [], 'Vanilla Character.', W.plain),
  cert56('ST06-012', L, 'Monkey.D.Garp: Activate Main, trash 1 card and rest this: K.O. up to 1 opposing Character cost 4 or less', 'FAQ ST06-012: both costs or nothing', [dd('ST06-012.activate-main-ko', W.koSak)], 'Hand condition plus REST_SOURCE.'),
  cert56('ST06-013', M5, 'T-Bone: no ability', 'No FAQ entry', [], 'Vanilla Character.', W.plain),
  cert56('ST06-014', L, 'Shockwave: Counter +4000 this battle then K.O. up to 1 opposing active Character cost 3 or less; Trigger K.O. up to 1 cost 4 or less', 'No FAQ entry', [dd('ST06-014.counter', W.wave), ce('ST06-014.counter', W.wave), tr('ST06-014.trigger-ko', W.wave)], 'Counter Event at its printed cost.'),
  cert56('ST06-015', L, 'Great Eruption: Main draw 1 then up to 1 opposing Character -2 cost; Trigger the opponent trashes 1 card of their choice', 'FAQ ST06-015: effects in order; empty hand: nothing', [dd('ST06-015.main-draw-cost', W.cost), tr('ST06-015.trigger-discard', W.eruption)], 'The opponent is the chooser.'),
  cert56('ST06-016', L, 'White Out: Counter up to 1 +2000 this battle; Trigger draw 1, your Characters cannot be K.O.d this turn', 'FAQ ST06-016: only Characters already on the field', [dd('ST06-016.counter', W.whiteOut), ce('ST06-016.counter', W.whiteOut), tr('ST06-016.trigger', W.whiteOut)], 'Immunity bound to the Characters present at activation.'),
  cert56('ST06-017', L, 'Navy HQ: On Play up to 1 opposing Character -1 cost; Activate Main, rest this: with a {Navy} Leader, up to 1 -1 cost', 'FAQ ST06-017: different Characters allowed', [dd('ST06-017.on-play-cost+activate-main-cost', W.cost)], 'Stage On Play and Activate Main.'),
]
CERTIFICATIONS.push(...ST05_ST06_CERTIFICATIONS)
// M6 — ST-08 (series 569008). FAQ qa_st-08.pdf?20230728 and the errata page are archived in docs/game/evidence/m6/sources/.
const ref08 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569008#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq08 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-08.pdf?20230728', checkedAt: st01Day, language: 'en', detail })
const X = {
  shanks: ['M6 ST-08 FAQ ST08-001 and ST08-005: Shanks K.O.s every cost 1 or less Character of both players and the Leader gives 1 rested DON per K.O.', 'M6 ST-08 Shanks without a trashed card K.O.s nothing; the Leader gives no DON during the opponent turn'],
  leader: ['M6 ST-08 FAQ ST08-001 and ST08-005: Shanks K.O.s every cost 1 or less Character of both players and the Leader gives 1 rested DON per K.O.', 'M6 ST-08 Shanks without a trashed card K.O.s nothing; the Leader gives no DON during the opponent turn', 'M6 ST-08 Leader gives up to 1 rested DON after a battle K.O. during its turn and may choose none'],
  uta: ['M6 ST-08 Uta cannot be K.O.d in battle by a Leader but can by a Character; Activate Main rests it for -2 cost'],
  koby: ['ST08-004 Koby rests as the activation cost and K.O.s only an opposing Character with cost 2 or less'],
  shirahoshi: ['ST08-006 Shirahoshi has Blocker and applies its On Play cost reduction to one opposing Character'],
  vivi: ['M6 ST-08 Nefeltari Vivi blocks and its Trigger plays it'],
  higuma: ['ST08-008 Higuma reduces only the chosen opposing Character cost until the turn expires'],
  makino: ['ST08-009 Makino draws only when a Character on either field currently has cost 0'],
  mr2: ['M6 ST-08 Mr.2 with a DON after battling as attacker may K.O. the battled Character and then K.O.s itself; declining keeps both', 'M6 ST-08 FAQ ST08-013: Mr.2 defending acts after surviving a Character attack, not once K.O.d, not without DON and not against a Leader'],
  bell: ['M6 ST-08 Gum-Gum Bell pays the optional top Life for -7 cost, does nothing without it, and its Trigger adds only a black Character cost 2 or less'],
  pistol: ['ST08-015 Gum-Gum Pistol resolves its Main K.O. and its Trigger draw as separate abilities'],
  plain: ['M6 ST-08 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
}
const cert08 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref08(number, detail), faq: faq08(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
export const ST08_CERTIFICATIONS: Certification[] = [
  cert08('ST08-001', L, 'Leader Monkey.D.Luffy, Life 5: [Your Turn] when a Character is K.O.d, give up to 1 rested DON!! to this Leader', 'FAQ ST08-001: one DON!! per Character K.O.d at the same time', [dd('ST08-001.your-turn-character-ko-don', X.leader)], 'ON_CHARACTER_KO observer, YOUR_TURN condition, either player Character.'),
  cert08('ST08-002', L, 'Uta: cannot be K.O.d in battle by Leaders; Activate Main, rest this: up to 1 opposing Character -2 cost this turn', 'No FAQ entry', [dd('ST08-002.activate-main-cost+no-battle-ko-by-leaders', X.uta)], 'Battle K.O. protection limited to Leader attackers.'),
  cert08('ST08-003', M5, 'Gaimon: no ability', 'No FAQ entry', [], 'Vanilla Character.', X.plain),
  cert08('ST08-004', L, 'Koby: Activate Main, rest this: K.O. up to 1 opposing Character cost 2 or less', 'No FAQ entry', [dd('ST08-004.activate-main-ko', X.koby)], 'REST_SOURCE cost.'),
  cert08('ST08-005', L, 'Shanks: On Play you may trash 1 card from your hand: K.O. all Characters with a cost of 1 or less', 'FAQ ST08-005: all Characters of both players, no choice', [dd('ST08-005.on-play-ko-all', X.shanks)], 'BIND_ALL over both fields then a K.O. batch.'),
  cert08('ST08-006', L, 'Shirahoshi: [Blocker]; On Play up to 1 opposing Character -4 cost this turn', 'No FAQ entry; printed power "-" read as 0', [bl(X.plain), dd('ST08-006.on-play-cost', X.shirahoshi)], 'Temporary cost modifier.'),
  cert08('ST08-007', L, 'Nefeltari Vivi: [Blocker]; Trigger play this card', 'No FAQ entry', [bl(X.plain), dd('ST08-007.trigger-play', X.vivi), tr('ST08-007.trigger-play', X.vivi)], 'CR 3-7-6-1 when the area is full.'),
  cert08('ST08-008', L, 'Higuma: On Play up to 1 opposing Character -2 cost this turn', 'No FAQ entry', [dd('ST08-008.on-play-cost', X.higuma)], 'Temporary cost modifier.'),
  cert08('ST08-009', L, 'Makino: On Play if there is a Character with a cost of 0, draw 1 card', 'No FAQ entry; printed power "-" read as 0', [dd('ST08-009.on-play-draw', X.makino)], 'Condition over both fields.'),
  cert08('ST08-010', M5, 'Monkey.D.Garp: no ability', 'No FAQ entry', [], 'Vanilla Character.', X.plain),
  cert08('ST08-011', M5, 'Monkey.D.Luffy: no ability', 'No FAQ entry', [], 'Vanilla Character.', X.plain),
  cert08('ST08-012', M5, 'Laboon: no ability', 'No FAQ entry', [], 'Vanilla Character.', X.plain),
  cert08('ST08-013', L, 'Mr.2.Bon.Kurei(Bentham): [DON!! x1] at the end of a battle with an opposing Character, you may K.O. it; if you do, K.O. this Character', 'FAQ ST08-013: not activated once this Character was K.O.d in that battle', [dd('ST08-013.end-of-battle-ko', X.mr2)], 'Attacking and defending announcements; resultBinding for "if you do".'),
  cert08('ST08-014', L, 'Gum-Gum Bell: Main you may add the top Life card to hand: up to 1 opposing Character -7 cost; Trigger add up to 1 black Character cost 2 or less from trash to hand', 'No FAQ entry', [dd('ST08-014.main-cost+trigger-trash-to-hand', X.bell), tr('ST08-014.trigger-trash-to-hand', X.bell)], 'Optional Life cost; colour filter.'),
  cert08('ST08-015', L, 'Gum-Gum Pistol: Main K.O. up to 1 opposing Character cost 2 or less; Trigger draw 1', 'No FAQ entry', [dd('ST08-015.main-ko+trigger-draw', X.pistol), tr('ST08-015.trigger-draw', X.pistol)], 'Event Main and Trigger.'),
]
CERTIFICATIONS.push(...ST08_CERTIFICATIONS)
// M6 — ST-07 (series 569007), the Life family. FAQ qa_st-07.pdf?20230609 and the errata page are archived in docs/game/evidence/m6/sources/.
const ref07 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569007#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq07 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-07.pdf?20230609', checkedAt: st01Day, language: 'en', detail })
const Y = {
  leader: ['M6 ST-07 FAQ ST07-001: Leader Linlin with 2 DON pays a top or bottom Life, then with 2 or less Life adds a hand card to the top of its Life', 'M6 ST-07 FAQ ST07-001: with 4 or more Life nothing follows the Life cost; declining pays nothing; 1 DON does not activate', 'M6 ST-07 FAQ ST07-010 and ST07-001: with 0 Life the opponent may still choose the trash mode (nothing happens) and its Leader pays nothing'],
  katakuri: ['M6 ST-07 Katakuri privately looks at the opponent top Life and places it at the bottom; Rush only with fewer Life'],
  pudding: ['M6 ST-07 Pudding may keep the looked-at own top Life on top'],
  snack: ['M6 ST-07 Snack with a DON pays a Life for Banish and +1000 during this battle only'],
  daifuku: ['M6 ST-07 Daifuku with a DON pays a Life to add the unseen top deck card to the top of its Life'],
  brulee: ['M6 ST-07 Brulee blocks and its Trigger plays it'],
  montdor: ['M6 ST-07 Mont-d or rests and pays a Life to K.O. cost 3 or less; its Trigger plays it only after trashing a card'],
  linlin: ['M6 ST-07 FAQ ST07-010: Charlotte Linlin lets the opponent choose to trash its own top Life or let the player add its top deck card to Life', 'M6 ST-07 FAQ ST07-010 and ST07-001: with 0 Life the opponent may still choose the trash mode (nothing happens) and its Leader pays nothing'],
  homies: ['M6 ST-07 FAQ ST07-011 and ST07-013: Zeus and Prometheus target the Linlin Leader or Character only'],
  pocus: ['M6 ST-07 FAQ ST07-015: Soul Pocus Main and Trigger give the opponent the same choice; the Trigger resolves before the next damage'],
  mochi: ['M6 ST-07 Power Mochi Counter looks at a top Life then gives +2000 this battle; its Trigger draws then looks'],
  chanter: ['M6 ST-07 FAQ ST07-017: Queen Mama Chanter puts only an own cost 3 Character face-up on top of its Life, or nothing'],
  plain: ['M6 ST-07 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
}
const cert07 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref07(number, detail), faq: faq07(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
export const ST07_CERTIFICATIONS: Certification[] = [
  cert07('ST07-001', L, 'Leader Charlotte Linlin, Life 5: [DON!! x2] When Attacking, you may add a top or bottom Life card to hand: with 2 or less Life, add up to 1 hand card to the top of your Life', 'FAQ ST07-001: with 3 Life both parts happen; 4+ Life nothing after the cost; 0 Life no activation', [dd('ST07-001.when-attacking-life', Y.leader)], 'Optional Life cost, then a condition evaluated after it.'),
  cert07('ST07-002', M5, 'Charlotte Anana: no ability', 'No FAQ entry', [], 'Vanilla Character.', Y.plain),
  cert07('ST07-003', L, 'Charlotte Katakuri: On Play look at up to 1 top Life card of either player and place it top or bottom; then with less Life than the opponent, [Rush] this turn', 'No FAQ entry', [dd('ST07-003.on-play-peek-rush', Y.katakuri)], 'Private peek (chooser only), then a top/bottom mode.'),
  cert07('ST07-004', L, 'Charlotte Snack: [DON!! x1] When Attacking, you may add a top or bottom Life card to hand: [Banish] and +1000 during this battle', 'No FAQ entry', [dd('ST07-004.when-attacking-banish', Y.snack)], 'Keyword and power bound to the battle.'),
  cert07('ST07-005', L, 'Charlotte Daifuku: [DON!! x1] When Attacking, you may add a top or bottom Life card to hand: add up to 1 top deck card to the top of your Life', 'No FAQ entry', [dd('ST07-005.when-attacking-life', Y.daifuku)], 'The deck card is chosen without being looked at.'),
  cert07('ST07-006', M5, 'Charlotte Flampe: no ability', 'No FAQ entry', [], 'Vanilla Character.', Y.plain),
  cert07('ST07-007', L, 'Charlotte Brulee: [Blocker]; Trigger play this card', 'No FAQ entry', [bl(Y.plain), dd('ST07-007.trigger-play', Y.brulee), tr('ST07-007.trigger-play', Y.brulee)], 'CR 3-7-6-1 when the area is full.'),
  cert07('ST07-008', L, 'Charlotte Pudding: On Play look at up to 1 top Life card of either player and place it top or bottom', 'No FAQ entry', [dd('ST07-008.on-play-peek', Y.pudding)], 'Private peek.'),
  cert07('ST07-009', L, "Charlotte Mont-d'or: Activate Main, rest this and add a top or bottom Life card to hand: K.O. up to 1 opposing Character cost 3 or less; Trigger you may trash 1 card: play this card", 'No FAQ entry', [dd('ST07-009.activate-main-ko+trigger-play', Y.montdor), tr('ST07-009.trigger-play', Y.montdor)], 'REST_SOURCE plus a mandatory Life cost.'),
  cert07('ST07-010', L, 'Charlotte Linlin: On Play your opponent chooses: trash their top Life card, or you add your top deck card to the top of your Life', 'FAQ ST07-010: the trashed Life is the non-activating player one; the added card is the activating player top deck; 0 Life: may choose, nothing happens', [dd('ST07-010.on-play-mode', Y.linlin)], 'Mode chosen by the opponent.'),
  cert07('ST07-011', L, 'Zeus: Activate Main, rest this: up to 1 of your [Charlotte Linlin] gains [Banish] this turn; Trigger play this card', 'FAQ ST07-011: Leader or Character [Charlotte Linlin]', [dd('ST07-011.activate-main-banish+trigger-play', Y.homies), tr('ST07-011.trigger-play', Y.homies)], 'Name filter over Leader and Characters.'),
  cert07('ST07-012', M5, 'Baron Tamago: no ability', 'No FAQ entry', [], 'Vanilla Character.', Y.plain),
  cert07('ST07-013', L, 'Prometheus: Activate Main, rest this: up to 1 of your [Charlotte Linlin] gains [Double Attack] this turn; Trigger play this card', 'FAQ ST07-013: Leader or Character [Charlotte Linlin]', [dd('ST07-013.activate-main-double+trigger-play', Y.homies), tr('ST07-013.trigger-play', Y.homies)], 'Name filter over Leader and Characters.'),
  cert07('ST07-014', M5, 'Pekoms: no ability', 'No FAQ entry', [], 'Vanilla Character.', Y.plain),
  cert07('ST07-015', L, 'Soul Pocus: Main your opponent chooses: trash their top Life card, or you add your top deck card to the top of your Life; Trigger activate this Main effect', 'FAQ ST07-015: same players as ST07-010; the Trigger resolves before a second Double Attack damage', [dd('ST07-015.main-mode+trigger-mode', Y.pocus), tr('ST07-015.trigger-mode', Y.pocus)], 'Same declarative program for Main and Trigger.'),
  cert07('ST07-016', L, 'Power Mochi: Counter look at up to 1 top Life of either player and place it top or bottom, then up to 1 own Leader/Character +2000 this battle; Trigger draw 1, then look and place', 'No FAQ entry', [dd('ST07-016.counter+trigger-draw-peek', Y.mochi), ce('ST07-016.counter', Y.mochi), tr('ST07-016.trigger-draw-peek', Y.mochi)], 'Counter Event at its printed cost.'),
  cert07('ST07-017', L, 'Queen Mama Chanter: Activate Main, rest this Stage and add a top or bottom Life card to hand: up to 1 of your Characters with a cost of 3 to the top of its owner Life face-up', 'FAQ ST07-017: may choose none; cost exactly 3; Characters on the field only', [dd('ST07-017.activate-main-life', Y.chanter)], 'Face-up Life card, public in projections.'),
]
CERTIFICATIONS.push(...ST07_CERTIFICATIONS)
// M6 — ST-12 (series 569012). FAQ qa_st-12.pdf?20240301 and the errata page are archived in docs/game/evidence/m6/sources/.
const ref12 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569012#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq12 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-12.pdf?20240301', checkedAt: st01Day, language: 'en', detail })
const Z = {
  leader: ['M6 ST-12 FAQ ST12-001: the Leader returns a cost 2 or more Character to set active a Character of 7000 current power or less, once per turn', 'M6 ST-12 FAQ ST12-011: Sanji keeps +2000 until the start of the next turn even if the hand grows, and twice gives +4000'],
  kuina: ['M6 ST-12 Kuina rests to rest a cost 4 or less opposing Character; its Trigger plays it'],
  mihawk: ['M6 ST-12 FAQ ST12-003: Mihawk with 2 or less Characters plays a Muggy Kingdom or Slash cost 4 or less Character rested; not with 3'],
  yj: ['M6 ST-12 Yosaku and Johnny with a DON choose to rest a cost 2 or less or K.O. a rested cost 2 or less'],
  rika: ['M6 ST-12 Rika pays 2 DON to set active a Slash cost 4 or less Character while the opponent has 3 or more Life; declining rests nothing'],
  zoro: ['M6 ST-12 Roronoa Zoro with a DON rests a cost 6 or less opposing Character when attacking'],
  ivankov: ['M6 ST-12 FAQ ST12-010: Ivankov reveals the top card and plays it only if it is a cost 2 Character, else puts it top or bottom; draws once per turn on attack'],
  sanji: ['M6 ST-12 FAQ ST12-011: Sanji keeps +2000 until the start of the next turn even if the hand grows, and twice gives +4000'],
  pudding: ['M6 ST-12 Charlotte Pudding returns itself to its owner hand'],
  zeff: ['M6 ST-12 Zeff looks at 3 on play and on attack plays a revealed cost 2 Character rested; Duval blocks and looks at 3'],
  lion: ['M6 ST-12 Lion Strike rests a cost 4 or less opposing Character as Main, Counter and Trigger, never a Leader'],
  shot: ['M6 ST-12 Plastic Surgery Shot gives +2000 this battle then plays a revealed cost 2 Character'],
  plain: ['M6 ST-12 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
}
const cert12 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref12(number, detail), faq: faq12(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
export const ST12_CERTIFICATIONS: Certification[] = [
  cert12('ST12-001', L, 'Leader Roronoa Zoro & Sanji, Life 4: [DON!! x1] When Attacking, once per turn, you may return 1 own Character cost 2 or more to hand: set up to 1 own Character with 7000 power or less as active', 'FAQ ST12-001: current power counts (a 7000 Character with a DON!! is 8000)', [dd('ST12-001.when-attacking-set-active', Z.leader)], 'Optional return cost, then a current-power filter.'),
  cert12('ST12-002', L, 'Kuina: Activate Main, rest this: rest up to 1 opposing Character cost 4 or less; Trigger play this card', 'No FAQ entry', [dd('ST12-002.activate-main-rest+trigger-play', Z.kuina), tr('ST12-002.trigger-play', Z.kuina)], 'REST_SOURCE cost.'),
  cert12('ST12-003', L, 'Dracule Mihawk: On Play with 2 or less Characters, play up to 1 {Muggy Kingdom} or <Slash> Character cost 4 or less other than [Dracule Mihawk] from hand rested', 'FAQ ST12-003: this Character counts; with 3 Characters nothing is played', [dd('ST12-003.on-play-play', Z.mihawk)], 'Trait-or-attribute filter; played rested.'),
  cert12('ST12-004', M5, 'Humandrill: no ability', 'No FAQ entry', [], 'Vanilla Character.', Z.plain),
  cert12('ST12-005', M5, 'Perona: no ability', 'No FAQ entry', [], 'Vanilla Character.', Z.plain),
  cert12('ST12-006', L, 'Yosaku & Johnny: [DON!! x1] When Attacking choose one: rest up to 1 opposing Character cost 2 or less, or K.O. up to 1 opposing rested Character cost 2 or less', 'No FAQ entry', [dd('ST12-006.when-attacking-mode', Z.yj)], 'Mode chosen by the controller.'),
  cert12('ST12-007', L, 'Rika: On Play you may rest 2 DON!!: if the opponent has 3 or more Life, set up to 1 own <Slash> Character cost 4 or less as active', 'No FAQ entry; printed power "-" read as 0', [dd('ST12-007.on-play-set-active', Z.rika)], 'Optional ➁ paid in full or not at all.'),
  cert12('ST12-008', L, 'Roronoa Zoro: [DON!! x1] When Attacking rest up to 1 opposing Character cost 6 or less', 'No FAQ entry', [dd('ST12-008.when-attacking-rest', Z.zoro)], 'Rest operation.'),
  cert12('ST12-009', M5, 'Elephant True Bluefin: no ability', 'No FAQ entry', [], 'Vanilla Character.', Z.plain),
  cert12('ST12-010', L, 'Emporio.Ivankov: On Play reveal the top card, play up to 1 Character cost 2 among it, the rest top or bottom; When Attacking, once per turn, draw 1 with 6 or less cards in hand', 'FAQ ST12-010: only the revealed card can be played; the rest is the revealed card', [dd('ST12-010.on-play-reveal+when-attacking-draw', Z.ivankov)], 'Public reveal, then a bound-card filter.'),
  cert12('ST12-011', L, 'Sanji: [DON!! x1] When Attacking with 5 or less cards in hand, +2000 until the start of your next turn', 'FAQ ST12-011: kept when the hand grows; twice gives +4000', [dd('ST12-011.when-attacking-power', Z.sanji)], 'Power modifier until the controller next turn.'),
  cert12('ST12-012', L, 'Charlotte Pudding: Activate Main return this Character to the owner hand', 'No FAQ entry', [dd('ST12-012.activate-main-return', Z.pudding)], 'Self-bound return.'),
  cert12('ST12-013', L, 'Zeff: On Play look at 3 and place them top or bottom in any order; When Attacking reveal the top card, play up to 1 Character cost 2 among it rested, the rest top or bottom', 'No FAQ entry', [dd('ST12-013.on-play-look+when-attacking-reveal', Z.zeff)], 'Shared look and reveal programs.'),
  cert12('ST12-014', L, 'Duval: [Blocker]; On Play look at 3 and place them top or bottom in any order', 'No FAQ entry', [bl(Z.zeff), dd('ST12-014.on-play-look', Z.zeff)], 'Printed [Blocker].'),
  cert12('ST12-015', M5, 'Patty & Carne: no ability', 'No FAQ entry', [], 'Vanilla Character.', Z.plain),
  cert12('ST12-016', L, 'Lion Strike: Main/Counter rest up to 1 opposing Leader or Character cost 4 or less; Trigger activate this Main effect', 'No FAQ entry; a Leader has no cost', [dd('ST12-016.main-rest+counter+trigger-rest', Z.lion), ce('ST12-016.counter', Z.lion), tr('ST12-016.trigger-rest', Z.lion)], 'Same program in three windows.'),
  cert12('ST12-017', L, 'Plastic Surgery Shot: Counter up to 1 own Leader/Character +2000 this battle, then reveal the top card, play up to 1 Character cost 2 among it, the rest top or bottom', 'No FAQ entry', [dd('ST12-017.counter', Z.shot), ce('ST12-017.counter', Z.shot)], 'Counter Event at its printed cost.'),
]
CERTIFICATIONS.push(...ST12_CERTIFICATIONS)
// M6 — ST-09 (series 569009). FAQ qa_st-09.pdf?20230728 and the errata page are archived in docs/game/evidence/m6/sources/.
// ST09-010 Portgas.D.Ace: its K.O. replacement (in battle and by effects) is a generic GUARD rule (M6 audited decks).
const ref09 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569009#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq09 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-09.pdf?20230728', checkedAt: st01Day, language: 'en', detail })
const N = {
  leader: ['M6 ST-09 FAQ ST09-001: Yamato with a DON gains +1000 on the opponent turn at 2 or less Life, between two Double Attack damages too'],
  toHand: ['M6 ST-09 FAQ ST09-002 and ST09-009: Uzuki Tempura and Fugetsu Omusubi Triggers act and always go to the hand'],
  kaido: ['M6 ST-09 Kaido with a DON cannot be K.O.d in battle at 2 or less Life only'],
  oden: ['M6 ST-09 Kouzuki Oden has Double Attack with a DON; On K.O. trashing 2 cards adds the unseen top deck card to Life', 'M6 ST-09 FAQ ST09-001: Yamato with a DON gains +1000 on the opponent turn at 2 or less Life, between two Double Attack damages too'],
  shinobu: ['M6 ST-09 Shinobu blocks and may pay a Life on block for +4000 during this battle'],
  ushimaru: ['M6 ST-09 FAQ ST09-008: Ushimaru with a DON pays a Life and may play the yellow Land of Wano card just added'],
  yamato: ['M6 ST-09 Yamato pays a Life on attack for +2000 until the start of the next turn'],
  arrow: ['M6 ST-09 Narikabura Arrow gives -3000 only at 2 or less Life; its Trigger trashes 2 to add the top deck card to Life'],
  bagua: ['M6 ST-09 Thunder Bagua gives +4000 then at 2 or less Life puts a cost 3 or less opposing Character face-up into its owner Life; its Trigger draws'],
  plain: ['M6 ST-09 cards without other ability are played for their printed cost, keep their power and defend with their Counter or [Blocker]'],
}
const cert09 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref09(number, detail), faq: faq09(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
export const ST09_CERTIFICATIONS: Certification[] = [
  cert09('ST09-001', L, 'Leader Yamato, Life 5: [DON!! x1] [Opponent Turn] with 2 or less Life, +1000 power', 'FAQ ST09-001: applies as soon as the Life drops, the next damage is still processed', [dd('ST09-001.opponent-turn-power', N.leader)], 'Continuous Leader modifier.'),
  cert09('ST09-002', L, 'Uzuki Tempura: Trigger rest up to 1 opposing Character cost 2 or less and add this card to your hand', 'FAQ ST09-002: the card always goes to the hand', [dd('ST09-002.trigger-rest-to-hand', N.toHand), tr('ST09-002.trigger-rest-to-hand', N.toHand)], 'Trigger card to hand.'),
  cert09('ST09-003', M5, 'Ulti: no ability', 'No FAQ entry', [], 'Vanilla Character.', N.plain),
  cert09('ST09-004', L, 'Kaido: [DON!! x1] with 2 or less Life, cannot be K.O.d in battle', 'No FAQ entry', [dd('ST09-004.no-battle-ko', N.kaido)], 'Conditional battle K.O. protection.'),
  cert09('ST09-005', L, 'Kouzuki Oden: [DON!! x1] [Double Attack]; On K.O. you may trash 2 cards from your hand: add up to 1 top deck card to the top of your Life', 'No FAQ entry', [dd('ST09-005.on-ko-life+double-attack', N.oden)], 'Conditional keyword; all-or-nothing discard.'),
  cert09('ST09-006', M5, 'Kouzuki Momonosuke: no ability', 'No FAQ entry', [], 'Vanilla Character.', N.plain),
  cert09('ST09-007', L, 'Shinobu: [Blocker]; On Block you may add a top or bottom Life card to hand: +4000 during this battle', 'No FAQ entry', [bl(N.shinobu), dd('ST09-007.on-block-power', N.shinobu)], 'Optional Life cost.'),
  cert09('ST09-008', L, 'Shimotsuki Ushimaru: [DON!! x1] When Attacking you may add a top or bottom Life card to hand: play up to 1 yellow {Land of Wano} Character cost 4 or less from your hand', 'FAQ ST09-008: the card just added may be played', [dd('ST09-008.when-attacking-play', N.ushimaru)], 'Colour and type filter.'),
  cert09('ST09-009', L, 'Fugetsu Omusubi: Trigger K.O. up to 1 opposing Character cost 1 or less and add this card to your hand', 'FAQ ST09-009: the card always goes to the hand', [dd('ST09-009.trigger-ko-to-hand', N.toHand), tr('ST09-009.trigger-ko-to-hand', N.toHand)], 'Trigger card to hand.'),
  cert09('ST09-010', L, 'Portgas.D.Ace: once per turn, if this Character would be K.O.d, you may trash 1 card from the top or bottom of your Life cards instead', 'FAQ ST09-010: not with 0 Life', [dd('ST09-010.guard-life', ['M6 FAQ ST09-010: Ace K.O.d in battle may trash the top or bottom Life card instead, once per turn; declining or with 0 Life it is K.O.d', 'M6 ST-09 Ace K.O.d by an opposing effect may trash a Life card instead'])], 'GUARD replacement; the battle pauses for the choice (KO_REPLACEMENT).'),
  cert09('ST09-011', M5, 'Monkey.D.Luffy: no ability', 'No FAQ entry', [], 'Vanilla Character.', N.plain),
  cert09('ST09-012', L, 'Yamato: When Attacking you may add a top or bottom Life card to hand: +2000 until the start of your next turn', 'No FAQ entry', [dd('ST09-012.when-attacking-power', N.yamato)], 'Power until the next turn.'),
  cert09('ST09-013', M5, 'Yamato: no ability', 'No FAQ entry', [], 'Vanilla Character.', N.plain),
  cert09('ST09-014', L, 'Narikabura Arrow: Counter with 2 or less Life, up to 1 opposing Leader or Character -3000 this turn; Trigger you may trash 2 cards: add up to 1 top deck card to the top of your Life', 'No FAQ entry', [dd('ST09-014.counter+trigger-life', N.arrow), ce('ST09-014.counter', N.arrow), tr('ST09-014.trigger-life', N.arrow)], 'Counter Event at its printed cost.'),
  cert09('ST09-015', L, 'Thunder Bagua: Counter up to 1 own Leader/Character +4000 this battle, then with 2 or less Life up to 1 opposing Character cost 3 or less to the top or bottom of its owner Life face-up; Trigger draw 1', 'No FAQ entry', [dd('ST09-015.counter+trigger-draw', N.bagua), ce('ST09-015.counter', N.bagua), tr('ST09-015.trigger-draw', N.bagua)], 'Face-up Life on the opponent side.'),
]
CERTIFICATIONS.push(...ST09_CERTIFICATIONS)
// M6 — ST-11 (series 569011), its ST11 numbers. FAQ qa_st-11.pdf?20240119 and the errata page are archived in docs/game/evidence/m6/sources/.
const ref11 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569011#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq11 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-11.pdf?20240119', checkedAt: st01Day, language: 'en', detail })
const UT = {
  leader: ['M6 ST-11 FAQ ST11-001: Leader Uta with a DON reveals the top card, adds a FILM card to hand or else puts it at the bottom'],
  uta: ['M6 ST-11 Uta blocks; at the end of its turn trashing an Event sets a FILM Character active'],
  backlight: ['M6 ST-11 Backlight with an Uta Leader rests a cost 5 or less or K.O.s a rested one; with another Leader nothing happens'],
  genesis: ['M6 FAQ ST11-004: New Genesis with an Uta Leader searches 3 for a FILM card and sets a DON active even when taking none'],
  invincible: ['M6 ST-11 I am invincible sets the rested Uta Leader active; its Trigger gives +1000 this turn'],
}
const cert11 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string): Certification => ({
  definitionId: `${number}@${L}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref11(number, detail), faq: faq11(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set(abilities.flatMap(a => a.tests))], notes })
export const ST11_CERTIFICATIONS: Certification[] = [
  cert11('ST11-001', 'Leader Uta, Life 5: [DON!! x1] When Attacking, once per turn, reveal the top card, add up to 1 {FILM} card among it to hand, the rest at the bottom', 'FAQ ST11-001: nothing happens after adding the card', [dd('ST11-001.when-attacking-reveal', UT.leader)], 'Public reveal; the rest goes to the bottom.'),
  cert11('ST11-002', 'Uta: [Blocker]; End of Your Turn you may trash 1 Event: set up to 1 own {FILM} Character active', 'No FAQ entry', [bl(UT.uta), dd('ST11-002.end-of-turn-set-active', UT.uta)], 'Optional Event discard.'),
  cert11('ST11-003', 'Backlight: Main if your Leader is [Uta], choose one: rest up to 1 opposing Character cost 5 or less, or K.O. up to 1 opposing rested Character cost 5 or less', 'No FAQ entry', [dd('ST11-003.main-mode', UT.backlight)], 'Leader name condition, then a mode.'),
  cert11('ST11-004', 'New Genesis: Main if your Leader is [Uta], look at 3, reveal up to 1 {FILM} card other than [New Genesis] to hand, the rest at the bottom in any order, and set up to 1 DON!! active', 'FAQ ST11-004: the DON!! is set active even when no card is added', [dd('ST11-004.main-search', UT.genesis)], 'Guarded private search.'),
  cert11('ST11-005', "I'm invincible: Main set up to 1 of your [Uta] Leader as active; Trigger up to 1 own Leader/Character +1000 this turn", 'No FAQ entry; local type field reads "音楽/FILM"', [dd('ST11-005.main-set-active+trigger-power', UT.invincible), tr('ST11-005.trigger-power', UT.invincible)], 'Leader zone selector by name.'),
]
CERTIFICATIONS.push(...ST11_CERTIFICATIONS)
// M6 — ST-10 (series 569010), its ST10 numbers. FAQ qa_st-10.pdf?20240405 and the errata page are archived in docs/game/evidence/m6/sources/.
const ref10 = (number: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=569010#${number}`, checkedAt: st01Day, language: 'en', detail })
const faq10 = (detail: string): SourceReference => ({ source: 'https://en.onepiece-cardgame.com/pdf/qa_st-10.pdf?20240405', checkedAt: st01Day, language: 'en', detail })
const TT = {
  law: ['M6 ST-10 FAQ ST10-001: Leader Law pays DON -3 to bottom a 3000 power or less Character and play a cost 4 or less Character, each part optional, once per turn'],
  luffyL: ['M6 ST-10 FAQ ST10-002: Leader Luffy adds an active DON with 0 or 8 or more DON on the field only'],
  kidL: ['M6 ST-10 Leader Kid is -1000 on its turn with 4 or more Life and pays DON -1 on attack for +2000'],
  sanji: ['M6 ST-10 FAQ ST10-004: Sanji gains Rush only if the opponent has a 5000 power Character; Jinbe with a DON gives -2000'],
  luffy: ['M6 FAQ ST10-006: Luffy has Rush and once per turn K.O.s up to 1 Character of 8000 or less when a Blocker is activated; K.O.ing the blocker ends the battle'],
  don: ['M6 FAQ ST10-007 ST10-011 ST10-014: Killer, Heat and Wire react once per turn to DON returned to the DON deck'],
  adds: ['M6 ST-10 Shachi and Penguin add 2 rested DON with 3 or less DON; Jean Bart rests 1 to add 1 active; Bepo adds 1 when behind on DON'],
  lawc: ['M6 FAQ ST10-010: Law pays DON -1 and with 7 or more cards in the opponent hand trashes 2 of them chosen face-down; Kid gives the Leader +1000'],
  events: ['M6 ST-10 Sumo Slap Counter +2000 and K.O. 2000 or less; Kong Gatling K.O.s 7000 or less, its Trigger lasts until the end of the next turn; Punk Vise rests and adds DON'],
  more: ['M6 ST-10 Bepo and Kid also act when attacking; Law and Wire block; Law trashes nothing below 7 opposing cards'],
}
const cert10 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string): Certification => ({
  definitionId: `${number}@${L}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: ref10(number, detail), faq: faq10(faqDetail), errata: st01Errata('Errata page checked; no erratum for this card'),
  abilities, tests: [...new Set(abilities.flatMap(a => a.tests))], notes })
export const ST10_CERTIFICATIONS: Certification[] = [
  cert10('ST10-001', 'Leader Trafalgar Law, Life 4: Activate Main, once per turn, DON!! -3: up to 1 opposing Character with 3000 power or less to the bottom of its owner deck, and play up to 1 Character cost 4 or less from hand', 'FAQ ST10-001: each part may happen alone', [dd('ST10-001.activate-main', TT.law)], 'DON_MINUS activation cost.'),
  cert10('ST10-002', 'Leader Monkey.D.Luffy, Life 3: Activate Main, once per turn, with 0 or 8 or more DON!! on your field, add up to 1 DON!! active', 'FAQ ST10-002: 0 DON!! means none in the cost area or given', [dd('ST10-002.activate-main-don', TT.luffyL)], 'ANY_OF condition.'),
  cert10('ST10-003', 'Leader Eustass"Captain"Kid, Life 5: [Your Turn] with 4 or more Life, -1000; When Attacking DON!! -1: +2000 this turn', 'No FAQ entry', [dd('ST10-003.when-attacking-power+your-turn-minus', TT.kidL)], 'Continuous Leader modifier and DON!! -1.'),
  cert10('ST10-004', 'Sanji: On Play if the opponent has a Character with 5000 power or more, [Rush] this turn', 'FAQ ST10-004: Rush is kept when the condition stops', [dd('ST10-004.on-play-rush', TT.sanji)], 'Condition at resolution.'),
  cert10('ST10-005', 'Jinbe: [DON!! x1] When Attacking up to 1 opposing Character -2000 this turn', 'No FAQ entry', [dd('ST10-005.when-attacking-power', TT.sanji)], 'Negative power modifier.'),
  cert10('ST10-006', 'Monkey.D.Luffy: [Rush]; once per turn when your opponent activates a [Blocker], K.O. up to 1 opposing Character with 8000 power or less', 'FAQ ST10-006: any opposing Character; K.O.ing the blocker ends the battle before the Counter Step', [dd('ST10-006.opponent-blocker-ko', TT.luffy)], 'ON_OPPONENT_BLOCKER observer.'),
  cert10('ST10-007', 'Killer: [Your Turn] once per turn when a DON!! of your field returns to your DON!! deck, K.O. up to 1 opposing rested Character cost 3 or less', 'FAQ ST10-007: also when an opponent effect returns it', [dd('ST10-007.don-returned-ko', TT.don)], 'ON_DON_RETURNED observer.'),
  cert10('ST10-008', 'Shachi & Penguin: On Play with 3 or less DON!! on your field, add up to 2 DON!! rested', 'No FAQ entry', [dd('ST10-008.on-play-don', TT.adds)], 'Condition at resolution.'),
  cert10('ST10-009', 'Jean Bart: On Play you may rest 1 DON!!: add up to 1 DON!! active', 'No FAQ entry', [dd('ST10-009.on-play-don', TT.adds)], 'Optional ① paid in full or not at all.'),
  cert10('ST10-010', 'Trafalgar Law: [Blocker]; On Play DON!! -1: if your opponent has 7 or more cards in hand, trash 2 of them', 'FAQ ST10-010: you choose them face-down', [bl(TT.more), dd('ST10-010.on-play-discard', TT.lawc)], 'Concealed choice in the opponent hand.'),
  cert10('ST10-011', 'Heat: [Your Turn] once per turn when a DON!! of your field returns to your DON!! deck, +2000 until the start of your next turn', 'FAQ ST10-011: also when an opponent effect returns it', [dd('ST10-011.don-returned-power', TT.don)], 'ON_DON_RETURNED observer.'),
  cert10('ST10-012', 'Bepo: On Play/When Attacking if your opponent has more DON!! on their field, add up to 1 DON!! rested', 'No FAQ entry', [dd('ST10-012.on-play-don+when-attacking-don', [...TT.adds, ...TT.more])], 'Same program in two windows.'),
  cert10('ST10-013', 'Eustass"Captain"Kid: On Play/When Attacking DON!! -1: up to 1 of your Leader +1000 until the start of your next turn', 'No FAQ entry', [dd('ST10-013.on-play-power+when-attacking-power', [...TT.lawc, ...TT.more])], 'Same program in two windows.'),
  cert10('ST10-014', 'Wire: [Blocker]; once per turn when a DON!! of your field returns to your DON!! deck, draw 1 and trash 1', 'FAQ ST10-014: also by an opponent effect; drawing is mandatory', [bl(TT.more), dd('ST10-014.don-returned-draw', TT.don)], 'ON_DON_RETURNED observer.'),
  cert10('ST10-015', 'Gum-Gum Giant Sumo Slap: Counter up to 1 own Leader/Character +2000 this battle, and K.O. up to 1 opposing Character with 2000 power or less', 'No FAQ entry', [dd('ST10-015.counter', TT.events), ce('ST10-015.counter', TT.events)], 'Counter Event at its printed cost.'),
  cert10('ST10-016', 'Gum-Gum Kong Gatling: Main K.O. up to 1 opposing Character with 7000 power or less; Trigger up to 1 of your Leader +1000 until the end of your next turn', 'FAQ ST10-016: until your next turn has concluded', [dd('ST10-016.main-ko+trigger-power', TT.events), tr('ST10-016.trigger-power', TT.events)], 'Duration through the next own turn.'),
  cert10('ST10-017', 'Punk Vise: Main rest up to 1 opposing Character cost 2 or less and add up to 1 DON!! rested; Trigger add up to 1 DON!! active', 'No FAQ entry', [dd('ST10-017.main-rest-don+trigger-don', TT.events), tr('ST10-017.trigger-don', TT.events)], 'Event Main and Trigger.'),
]
CERTIFICATIONS.push(...ST10_CERTIFICATIONS)
export const CERTIFICATION_BLOCKERS: CertificationBlocker[] = [
  { definitionId: 'P-015@m0-2026-10-10', reason: 'DATA_CONFLICT', checkedAt: today, detail: 'Official card list gives attribute Wisdom; the m0 revision says STRIKE. A corrected revision is required before certification.' },
]

export function certificationOf(definitionId: string): Certification | undefined {
  return CERTIFICATIONS.find(c => c.definitionId === definitionId)
}
/** The only source of PLAYABLE_VERIFIED: an explicit certification of this exact revision. */
export function effectiveStatus(definition: CardDefinition): NonNullable<CardDefinition['review']['playabilityStatus']> {
  if (certificationOf(definition.definitionId)) return 'PLAYABLE_VERIFIED'
  const status = definition.review.playabilityStatus ?? 'DATA_VALID_EFFECT_PENDING'
  return status === 'PLAYABLE_VERIFIED' ? 'DATA_VALID_EFFECT_PENDING' : status
}
/** Structural checks binding a certification to its definition and to executable programs. */
export function certificationErrors(c: Certification, definition: CardDefinition | undefined, registry: EffectRegistry): string[] {
  const errors: string[] = []
  if (!definition) return ['UNKNOWN_DEFINITION']
  if (definition.definitionId !== c.definitionId || `${definition.number}@${definition.revision}` !== c.definitionId) errors.push('REVISION_MISMATCH')
  if (!definition.review.faqChecked || !definition.review.errataChecked) errors.push('REVIEW_INCOMPLETE')
  if (CERTIFICATION_BLOCKERS.some(b => b.definitionId === c.definitionId)) errors.push('BLOCKED')
  if (![c.cardText, c.faq, c.errata].every(r => r.checkedAt === c.certifiedAt && /^https:\/\/en\.onepiece-cardgame\.com\//.test(r.source))) errors.push('SOURCE_NOT_RECHECKED')
  if (!c.tests.length || c.abilities.some(a => !a.tests.length)) errors.push('MISSING_TESTS')
  const kinds = [...definition.review.effects.map(e => e.kind), ...(definition.review.triggerOriginal.trim() ? ['trigger'] : []), ...(definition.review.counterEvent ? ['counterEvent'] : [])].sort()
  if (JSON.stringify(kinds) !== JSON.stringify(c.abilities.filter(a => a.kind !== 'keyword').map(a => a.kind).sort())) errors.push('ABILITY_SET_MISMATCH')
  // M6: a printed combat keyword named in a certificate must be one the definition carries (review.combatKeywords).
  const keywords = definition.review.combatKeywords ?? []
  if (c.abilities.some(a => a.kind === 'keyword' && !keywords.includes(a.id as never))) errors.push('ABILITY_NOT_EXECUTABLE')
  // M6: a [Counter] Event is certifiable only through its declared COUNTER program, named and tested in the certificate.
  const counter = definition.review.counterEvent
  if (counter && (counter.kind !== 'DECLARATIVE' || !c.abilities.some(a => a.kind === 'counterEvent' && a.id === counter.abilityId)
    || !registry.definitions.some(d => d.id === counter.abilityId && d.timing === 'COUNTER' && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId))) errors.push('UNCERTIFIED_CAPABILITY')
  // A text made only of printed keywords (with their reminder text) is executable through review.combatKeywords, provided
  // the certificate names and tests each keyword.
  const keywordOnly = keywords.length > 0 && keywordOnlyText(definition.review.effectOriginal, keywords) && keywords.every(k => c.abilities.some(a => a.kind === 'keyword' && a.id === k))
  if (!definition.review.effects.length && (definition.review.effectOriginal.trim() || definition.review.effectFr.trim()) && !keywordOnly) errors.push('TEXT_WITHOUT_ABILITY')
  for (const e of definition.review.effects) if (e.kind === 'declarative' && e.abilityIds.some(id => !registry.definitions.some(d => d.id === id && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId)
    && !registry.continuous?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.conditionalKeywords?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.koProtections?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.cardReplacements?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.attackProhibitions?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.lifeRules?.some(d => d.id === id && d.definitionId === definition.definitionId))) errors.push('ABILITY_NOT_EXECUTABLE')
  for (const a of c.abilities) if (a.kind === 'trigger' && !registry.definitions.some(d => d.id === a.id && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId && d.timing === 'TRIGGER')) errors.push('ABILITY_NOT_EXECUTABLE')
  return errors
}
// M6 — ST-03 composition cards named by scripts/rebuildStarterDecks.ts ("Desert Spada", "Perfume Femur"), resolved by the
// script's own cross-set lookup to OP01-088 and OP07-057. FAQ qa_op01.pdf / qa_op07.pdf and the errata page are archived in
// docs/game/evidence/m6/sources/.
const refOP = (number: string, series: string, detail: string): SourceReference => ({ source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}#${number}`, checkedAt: st01Day, language: 'en', detail })
const faqOP = (url: string, detail: string): SourceReference => ({ source: url, checkedAt: st01Day, language: 'en', detail })
const O = {
  spada: ['M6 FAQ OP01-088: Desert Spada gives +2000 this battle, then places the 3 looked cards all at the top or all at the bottom', 'M6 FAQ OP01-088: Desert Spada can be activated with 2 or less cards in the deck'],
  spadaTrigger: ['M6 OP01-088 Trigger: Desert Spada draws 2 cards then trashes 1 card from hand'],
  femur: ['M6 OP07-057: Perfume Femur gives a Seven Warlords Leader or Character +2000 this turn; when it attacks, no [Blocker] can be activated', 'M6 OP07-057: the Perfume Femur +2000 ends with the turn'],
  femurTrigger: ['M6 OP07-057 Trigger: Perfume Femur draws 1 card'],
}
export const ST03_OP_CERTIFICATIONS: Certification[] = [
  { definitionId: `OP01-088@${L}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
    cardText: refOP('OP01-088', '569101', 'Desert Spada: Counter up to 1 own Leader or Character +2000 this battle, then look at 3 and place them top or bottom in any order; Trigger draw 2 and trash 1 from hand'),
    faq: faqOP('https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405', 'FAQ OP01-088: the 3 cards go all to the top or all to the bottom; usable with 2 or less cards in deck'),
    errata: st01Errata('Errata 2023-02-17: "Your Leader or 1 of your Characters" became "Up to 1 of your Leader or Character cards"; the local text is the corrected one'),
    abilities: [dd('OP01-088.counter+trigger-draw-trash', O.spada), ce('OP01-088.counter', O.spada), tr('OP01-088.trigger-draw-trash', O.spadaTrigger)],
    tests: [...O.spada, ...O.spadaTrigger], notes: 'Counter Event at its printed cost; all-or-none bottom placement.' },
  { definitionId: `OP07-057@${L}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
    cardText: refOP('OP07-057', '569107', 'Perfume Femur: Main up to 1 own {The Seven Warlords of the Sea} Leader or Character +2000 this turn; if it attacks this turn, the opponent cannot activate [Blocker]; Trigger draw 1'),
    faq: faqOP('https://en.onepiece-cardgame.com/pdf/qa_op07.pdf?20250228', 'No FAQ entry for OP07-057'),
    errata: st01Errata('Errata page checked; no erratum for this card'),
    abilities: [dd('OP07-057.main-power-prevent-blocker+trigger-draw', O.femur), tr('OP07-057.trigger-draw', O.femurTrigger)],
    tests: [...O.femur, ...O.femurTrigger], notes: 'Turn-scoped blocker restriction bound to the selected card (same primitive as ST01-016).' },
]
CERTIFICATIONS.push(...ST03_OP_CERTIFICATIONS)
// M6 — reprints of the audited Starter Deck contents (scripts/rebuildStarterDecks.ts), certified at their own set revision.
// Card list pages per series, the set FAQ (qa_opNN.pdf) and the errata page are archived in docs/game/evidence/m6/sources/.
const SERIES: Record<string, string> = { OP01: '569101', OP02: '569102' }
const FAQS: Record<string, string> = { OP01: 'https://en.onepiece-cardgame.com/pdf/qa_op01.pdf?20240405', OP02: 'https://en.onepiece-cardgame.com/pdf/qa_op02.pdf?20240405' }
const certR = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => {
  const set = number.split('-')[0]
  return { definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
    cardText: { source: `https://en.onepiece-cardgame.com/cardlist/?series=${SERIES[set]}#${number}`, checkedAt: st01Day, language: 'en', detail },
    faq: { source: FAQS[set], checkedAt: st01Day, language: 'en', detail: faqDetail }, errata: st01Errata('Errata page checked; no erratum for this card'),
    abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes }
}
const R = {
  zoro: ['M6 OP01-025: Roronoa Zoro has [Rush] and can attack on the turn it is played'],
  chopper: ['M6 OP02-034: Chopper with a DON!! rests up to 1 opposing Character cost 2 or less when attacking; without DON!! nothing'],
  law: ['M6 FAQ OP02-035: Law rests 1 DON!! and returns itself to hand to play up to 1 Character with a cost of exactly 3'],
  film: ['M6 OP02-037, OP02-040 and OP02-041: On Play plays a {FILM} or {Straw Hat Crew} Character card of cost 2, 3 or 4 or less from hand'],
  oni: ['M6 FAQ P-011 / OP02-045: Oni Giri gives +6000 this battle then plays a cost 3 or less Character with no base effect; its Trigger rests a cost 5 or less'],
  plain: ['M6 vanilla reprints are played for their printed cost, keep their printed power and counter with their printed value'],
}
export const REPRINT_CERTIFICATIONS: Certification[] = [
  certR('OP01-025', L, 'Roronoa Zoro: [Rush]', 'No FAQ entry', [{ kind: 'keyword', id: 'RUSH', tests: R.zoro }], 'Printed keyword only (review.combatKeywords).'),
  certR('OP02-028', M5, 'Usopp: no ability', 'No FAQ entry', [], 'Vanilla Character.', R.plain),
  certR('OP02-033', M5, 'Jinbe: no ability', 'No FAQ entry', [], 'Vanilla Character.', R.plain),
  certR('OP02-034', L, 'Tony Tony.Chopper: [DON!! x1] When Attacking rest up to 1 opposing Character cost 2 or less', 'No FAQ entry', [dd('OP02-034.when-attacking-rest', R.chopper)], 'Rest operation.'),
  certR('OP02-035', L, 'Trafalgar Law: Activate Main ➀, return this Character to hand: play up to 1 Character with a cost of 3 from hand', 'FAQ OP02-035: a cost of exactly 3', [dd('OP02-035.activate-main-play', R.law)], 'REST_DON cost, then the self return paid before the play.'),
  certR('OP02-037', L, 'Nico Robin: On Play play up to 1 {FILM} or {Straw Hat Crew} Character cost 2 or less from hand', 'No FAQ entry', [dd('OP02-037.on-play-play', R.film)], 'Trait filter (any of).'),
  certR('OP02-039', M5, 'Franky: no ability', 'No FAQ entry', [], 'Vanilla Character.', R.plain),
  certR('OP02-040', L, 'Brook: On Play play up to 1 {FILM} or {Straw Hat Crew} Character cost 3 or less from hand', 'No FAQ entry', [dd('OP02-040.on-play-play', R.film)], 'Trait filter (any of).'),
  certR('OP02-041', L, 'Monkey.D.Luffy: [Blocker]; On Play play up to 1 {FILM} or {Straw Hat Crew} Character cost 4 or less from hand', 'No FAQ entry', [bl(R.film), dd('OP02-041.on-play-play', R.film)], 'Printed [Blocker].'),
  certR('OP02-043', M5, 'Roronoa Zoro: no ability', 'No FAQ entry', [], 'Vanilla Character.', R.plain),
  certR('OP02-045', L, 'Three Sword Style Oni Giri: Counter up to 1 own Leader/Character +6000 this battle, then play up to 1 Character cost 3 or less with no base effect from hand; Trigger rest up to 1 opposing Leader or Character cost 5 or less', 'No OP02-045 entry; FAQ P-011 (qa_promotion-cards): no base effect excludes a Trigger-only Character, a Counter value does not count', [dd('OP02-045.counter+trigger-rest', R.oni), ce('OP02-045.counter', R.oni), tr('OP02-045.trigger-rest', R.oni)], 'noBaseEffect card filter.'),
]
CERTIFICATIONS.push(...REPRINT_CERTIFICATIONS)
// M6 — ST-14 (series 569014). FAQ qa_st-14.pdf?20240802 and the errata page are archived in docs/game/evidence/m6/sources/.
const cert14 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: { source: `https://en.onepiece-cardgame.com/cardlist/?series=569014#${number}`, checkedAt: st01Day, language: 'en', detail },
  faq: { source: 'https://en.onepiece-cardgame.com/pdf/qa_st-14.pdf?20240802', checkedAt: st01Day, language: 'en', detail: faqDetail },
  errata: st01Errata('Errata page checked; no erratum for this card'), abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
const K = {
  leader: ['M6 FAQ ST14-001: with a DON!! the Leader gives field Characters +1 cost and gains +1000 while a Character costs 8 or more'],
  sunny: ['M6 FAQ ST14-017: Thousand Sunny gives black {Straw Hat Crew} field Characters +1 cost and draws 1 on play with a {Straw Hat Crew} Leader'],
  usopp: ['M6 FAQ ST14-002: Usopp with a DON!! K.O.s a cost 4 or less when attacking if a Character costs 8 or more; otherwise nothing'],
  sanji: ['M6 FAQ ST14-003: with a DON!! on the Leader and no Character, Sanji (cost 6 on the field) K.O.s a cost 5 or less on play'],
  raise: ['M6 ST-14 Jinbe, Heracles and Haredas give a black {Straw Hat Crew} Character +2 cost until the end of the opponent next turn'],
  nami: ['M6 ST-14 Nami blocks and draws 1 on play with 6 or less cards in hand and a Character of cost 8 or more'],
  robin: ['M6 FAQ ST14-007: Nico Robin gives an opposing Character -5 cost this turn on play and when attacking if a Character costs 8 or more'],
  franky: ['M6 FAQ ST14-009: Franky with a DON!! and a cost 6 or more Character gains +2000 and cannot be K.O.d by opponent effects on the opponent turn'],
  luffy: ['M6 FAQ ST14-012: Monkey.D.Luffy gains [Rush] while a Character has a cost of 10 or more'],
  rifle: ['M6 ST-14 Gum-Gum Giant Rifle gives +3000 this battle with a cost 8 or more Character; its Trigger returns a cost 2 or less Character from trash'],
  phoenix: ['M6 ST-14 Phoenix Cannon gives +3000 this turn then K.O.s a cost 2 or less with a cost 8 Character; its Trigger K.O.s a cost 5 or less'],
  crew: ['M6 ST-14 I Have My Crew!! draws 1 then gives +3 cost until the end of the opponent next turn; its Trigger K.O.s a cost 3 or less'],
  plain: ['M6 ST-14 cards without ability are played for their printed cost and keep their printed power'],
}
export const ST14_CERTIFICATIONS: Certification[] = [
  cert14('ST14-001', L, 'Leader Monkey.D.Luffy, Life 5: [DON!! x1] all your Characters +1 cost; with a Character cost 8 or more, this Leader +1000 power', 'FAQ ST14-001: field only; re-evaluated when the cost 8 Character leaves', [dd('ST14-001.don-cost-aura+don-power', K.leader)], 'Leader aura (COST) and conditional own POWER.'),
  cert14('ST14-002', L, 'Usopp: [DON!! x1] When Attacking, with a Character cost 8 or more, K.O. up to 1 opposing Character cost 4 or less', 'FAQ ST14-002: Usopp itself may be that Character', [dd('ST14-002.when-attacking-ko', K.usopp)], 'ALL_OF condition.'),
  cert14('ST14-003', L, 'Sanji: On Play, with a Character cost 6 or more, K.O. up to 1 opposing Character cost 5 or less', 'FAQ ST14-003: Sanji counts itself at its current cost', [dd('ST14-003.on-play-ko', K.sanji)], 'Current cost condition.'),
  cert14('ST14-004', L, 'Jinbe: Activate Main once per turn: up to 1 black {Straw Hat Crew} Character +2 cost until the end of the opponent next turn', 'No FAQ entry', [dd('ST14-004.activate-main-cost', K.raise)], 'Cost modifier lasting through the next turn.'),
  cert14('ST14-005', M5, 'Tony Tony.Chopper: no ability', 'No FAQ entry', [], 'Vanilla Character.', K.plain),
  cert14('ST14-006', L, 'Nami: [Blocker]; On Play with 6 or less cards in hand and a Character cost 8 or more, draw 1', 'No FAQ entry', [bl(K.nami), dd('ST14-006.on-play-draw', K.nami)], 'Printed [Blocker].'),
  cert14('ST14-007', L, 'Nico Robin: On Play/When Attacking with a Character cost 8 or more, up to 1 opposing Character -5 cost this turn', 'FAQ ST14-007: Robin itself may be that Character', [dd('ST14-007.on-play-cost+when-attacking-cost', K.robin)], 'Two timings, one program.'),
  cert14('ST14-008', L, 'Haredas: Activate Main, rest this: up to 1 black {Straw Hat Crew} Character +2 cost until the end of the opponent next turn; then with a Character cost 8 or more draw 1 and trash 1', 'No FAQ entry', [dd('ST14-008.activate-main-cost', K.raise)], 'Condition checked after the cost change.'),
  cert14('ST14-009', L, 'Franky: [DON!! x1] [Opponent\'s Turn] with a Character cost 6 or more, cannot be K.O.d by the opponent effects and +2000 power', 'FAQ ST14-009: Franky itself may be that Character', [dd('ST14-009.opponent-turn-power+no-opponent-effect-ko', K.franky)], 'Continuous POWER and an opponent-effect K.O. protection.'),
  cert14('ST14-010', M5, 'Brook: no ability', 'No FAQ entry', [], 'Vanilla Character.', K.plain),
  cert14('ST14-011', L, 'Heracles: Activate Main, rest this: up to 1 black {Straw Hat Crew} Character +2 cost until the end of the opponent next turn', 'No FAQ entry', [dd('ST14-011.activate-main-cost', K.raise)], 'REST_SOURCE cost.'),
  cert14('ST14-012', L, 'Monkey.D.Luffy: with a Character cost 10 or more, this Character gains [Rush]', 'FAQ ST14-012: Luffy itself may be that Character', [dd('ST14-012.conditional-rush', K.luffy)], 'Conditional keyword on own current costs.'),
  cert14('ST14-013', M5, 'Roronoa Zoro: no ability', 'No FAQ entry', [], 'Vanilla Character.', K.plain),
  cert14('ST14-014', L, 'Gum-Gum Giant Rifle: Counter with a Character cost 8 or more, up to 1 own Leader/Character +3000 this battle; Trigger add up to 1 Character cost 2 or less from trash to hand', 'No FAQ entry', [dd('ST14-014.counter+trigger-recover', K.rifle), ce('ST14-014.counter', K.rifle), tr('ST14-014.trigger-recover', K.rifle)], 'Counter Event usable without effect when the condition fails.'),
  cert14('ST14-015', L, 'Phoenix Cannon: Main up to 1 own Leader/Character +3000 this turn, then with a Character cost 8 or more K.O. up to 1 opposing Character cost 2 or less; Trigger with a Character cost 8 or more K.O. up to 1 cost 5 or less', 'No FAQ entry', [dd('ST14-015.main-power-ko+trigger-ko', K.phoenix), tr('ST14-015.trigger-ko', K.phoenix)], 'Conditional choice step.'),
  cert14('ST14-016', L, 'I Have My Crew!!: Main draw 1, then up to 1 own Character +3 cost until the end of the opponent next turn; Trigger K.O. up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('ST14-016.main-draw-cost+trigger-ko', K.crew), tr('ST14-016.trigger-ko', K.crew)], 'Cost modifier lasting through the next turn.'),
  cert14('ST14-017', L, 'Thousand Sunny: all your black {Straw Hat Crew} Characters +1 cost; On Play with a {Straw Hat Crew} Leader draw 1', 'FAQ ST14-017: field only', [dd('ST14-017.on-play-draw+cost-aura', K.sunny)], 'Stage aura (COST).'),
]
CERTIFICATIONS.push(...ST14_CERTIFICATIONS)
// M6 — cards reviewed from an official English card list snapshot (data/official-en; archived pages in
// docs/game/evidence/m6/sources/cardlist-en/). The card list page is the series page of the Starter Deck that reprints them.
const certO = (series: string, number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = [], errata = 'Errata page checked; no erratum for this card'): Certification => ({
  definitionId: `${number}@${revision}`, certifiedAt: st01Day, rulesVersion: '1.2.1', rulesetId: 'MUGIWARA_FREE',
  cardText: { source: `https://en.onepiece-cardgame.com/cardlist/?series=${series}#${number}`, checkedAt: st01Day, language: 'en', detail },
  faq: { source: faqUrlFor(number), checkedAt: st01Day, language: 'en', detail: faqDetail }, errata: st01Errata(errata),
  abilities, tests: [...new Set([...abilities.flatMap(a => a.tests), ...tests])], notes })
const OFF = 'm6-official-en-2026-10-14'
const Q = {
  leader: ['M6 FAQ OP01-060: Leader Doflamingo with 2 DON!! pays 1 DON!! to reveal the top card and may play a Warlords Character cost 4 or less rested'],
  croc: ['M6 FAQ ST17-001: Crocodile reveals the top card; a Warlords card means draw 2 then place 1 hand card on top, otherwise it stays on top'],
  law: ['M6 FAQ ST17-002: Law may return 1 own Character to return a cost 4 or less Character; without a Warlords Leader only the cost is paid'],
  buggy: ['M6 ST-17 Buggy looks at 3 and places them at the top in any order'],
  look: ['M6 FAQ OP01-073: Hancock and Doflamingo block; they look at 3 or 5 and place all at the top or all at the bottom; Hancock then gives a rested DON!! to a Warlords card'],
  teach: ['M6 ST-17 Marshall.D.Teach places 1 hand card on top of the deck to give up to 2 rested DON!! to the Leader or a Character, once per turn'],
  kuma: ['M6 ST-17 Bartholomew Kuma looks at 2, adds up to 1 Warlords card to hand and places the rest at the top or bottom'],
  jinbe: ['M6 FAQ P-030: Jinbe, when K.O.d, places up to 1 Character with a cost of 3 or less (own included) at the bottom of its owner deck'],
  heat: ['M6 FAQ OP01-086: Overheat gives +4000 this battle and returns an active cost 3 or less Character (own included); its Trigger returns a cost 4 or less'],
  plain: ['M6 ST-17 Gecko Moria (no ability) is played for its printed cost and keeps its printed power'],
}
const c17 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = [], errata?: string) => certO('569017', number, revision, detail, faqDetail, abilities, notes, tests, errata)
export const ST17_CERTIFICATIONS: Certification[] = [
  c17('OP01-060', OFF, 'Leader Donquixote Doflamingo, Life 5: [DON!! x2] When Attacking ➀: reveal the top card; a {The Seven Warlords of the Sea} Character cost 4 or less may be played rested', 'FAQ OP01-060: a card not played returns face-down to the top', [dd('OP01-060.when-attacking-reveal', Q.leader)], 'Optional ➀ paid in full or not at all.'),
  c17('ST17-001', OFF, 'Crocodile: On Play reveal the top card; if {The Seven Warlords of the Sea}, draw 2 and place 1 hand card at the top of the deck', 'FAQ ST17-001: the revealed card is one of the 2 drawn; otherwise it stays on top', [dd('ST17-001.on-play-reveal', Q.croc)], 'moveCard to the deck top.'),
  c17('ST17-002', OFF, 'Trafalgar Law: On Play you may return 1 of your Characters to hand: with a {The Seven Warlords of the Sea} Leader, return up to 1 Character cost 4 or less to hand', 'FAQ ST17-002: the cost can be paid with another Leader', [dd('ST17-002.on-play-return', Q.law)], 'Condition checked after the optional cost.'),
  c17('ST17-003', OFF, 'Buggy: On Play look at 3 and place them at the top in any order', 'No FAQ entry', [dd('ST17-003.on-play-order', Q.buggy)], 'arrangeTopDeck without a bottom option.'),
  c17('ST17-004', OFF, 'Boa Hancock: [Blocker]; On Play look at 3 and place them top or bottom in any order, then give up to 1 rested DON!! to a {The Seven Warlords of the Sea} Leader or Character', 'No FAQ entry', [bl(Q.look), dd('ST17-004.on-play-look-don', Q.look)], 'Printed [Blocker].'),
  c17('ST17-005', OFF, 'Marshall.D.Teach: Activate Main once per turn, you may place 1 hand card at the top of the deck: give up to 2 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('ST17-005.activate-main-don', Q.teach)], 'Optional hand-to-deck cost.'),
  c17('OP01-073', OFF, 'Donquixote Doflamingo: [Blocker]; On Play look at 5 and place them top or bottom in any order', 'FAQ OP01-073: all 5 on the same side; with 4 or less cards, all of them', [bl(Q.look), dd('OP01-073.on-play-look', Q.look)], 'Printed [Blocker].'),
  c17('OP02-054', M5, 'Gecko Moria: no ability', 'No FAQ entry', [], 'Vanilla Character.', Q.plain),
  c17('OP02-057', OFF, 'Bartholomew Kuma: On Play look at 2, reveal up to 1 {The Seven Warlords of the Sea} card and add it to hand, the rest top or bottom in any order', 'No FAQ entry', [dd('OP02-057.on-play-search', Q.kuma)], 'Private look, public reveal of the card taken.'),
  c17('P-030', OFF, 'Jinbe: On K.O. place up to 1 Character cost 3 or less at the bottom of the owner deck', 'FAQ P-030: own Characters too', [dd('P-030.on-ko-bottom', Q.jinbe)], 'ON_KO from the trash.'),
  c17('OP01-086', OFF, 'Overheat: Counter up to 1 own Leader/Character +4000 this battle, then return up to 1 active Character cost 3 or less to hand; Trigger return up to 1 Character cost 4 or less to hand', 'FAQ OP01-086: own Characters too', [dd('OP01-086.counter+trigger-return', Q.heat), ce('OP01-086.counter', Q.heat), tr('OP01-086.trigger-return', Q.heat)], 'Counter Event at its printed cost.', [], 'Errata 2023-02-17 ("up to 1" wording); the official text used is the corrected one'),
]
CERTIFICATIONS.push(...ST17_CERTIFICATIONS)
const E = {
  leader: ['M6 ST-18 Leader Luffy adds its top Life card to hand to add an active DON!! with 0 or 3 or more field DON!!, once per turn'],
  eight: ['M6 ST-18 Uso-Hachi, O-Robi and Hone-Kichi need 8 or more field DON!! on play to rest, K.O. and give -2000'],
  nami: ['M6 FAQ ST18-002: O-Nami blocks; with 8 or more field DON!! it trashes 1 card then draws 2, even with an empty hand'],
  attack: ['M6 ST-18 San-Gorou draws 1 when attacking with 8 or more field DON!!, once per turn; Uso-Hachi OP05-061 rests a cost 4 or less with a DON!!'],
  search: ['M6 ST-18 Zoro-Juurou and When You Are at Sea search the top 5 or 3 cards for the printed types, the rest at the bottom'],
  tarou: ['M6 ST-18 Luffy-Tarou pays DON!! -1 to play a purple {Straw Hat Crew} Character cost 5 or less from hand; declining plays nothing'],
  life: ['M6 ST-18 Zoro-Juurou OP05-067 adds an active DON!! when attacking with 3 or less Life; Chopa-Emon sets a purple {Straw Hat Crew} 6000 or less active'],
  cont: ['M6 ST-18 Jinbe gains +1000 on the opponent turn with 10 field DON!!; Fra-Nosuke gains [Rush] with a DON!! and 8 or more field DON!!'],
}
const c18 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string) => certO('569018', number, OFF, detail, faqDetail, abilities, notes)
export const ST18_CERTIFICATIONS: Certification[] = [
  c18('OP05-060', 'Leader Monkey.D.Luffy, Life 5: Activate Main once per turn, you may add your top Life card to hand: with 0 or 3 or more field DON!!, add up to 1 DON!! from the DON!! deck set as active', 'No FAQ entry', [dd('OP05-060.activate-main-don', E.leader)], 'Optional Life cost, condition after it.'),
  c18('ST18-001', 'Uso-Hachi: On Play with 8 or more field DON!!, rest up to 1 opposing Character cost 5 or less', 'No FAQ entry', [dd('ST18-001.on-play-rest', E.eight)], 'FIELD_DON_AT_LEAST.'),
  c18('ST18-002', 'O-Nami: [Blocker]; On Play with 8 or more field DON!!, trash 1 card from hand and draw 2', 'FAQ ST18-002: with 0 cards in hand, still draws 2', [bl(E.nami), dd('ST18-002.on-play-draw', E.nami)], 'clampMin discard.'),
  c18('ST18-003', 'San-Gorou: When Attacking once per turn with 8 or more field DON!!, draw 1', 'No FAQ entry', [dd('ST18-003.when-attacking-draw', E.attack)], 'Once per turn.'),
  c18('ST18-004', 'Zoro-Juurou: On Play look at 5, reveal up to 1 purple {Straw Hat Crew} card to hand, the rest at the bottom in any order', 'No FAQ entry', [dd('ST18-004.on-play-search', E.search)], 'Colour and type search filter.'),
  c18('ST18-005', 'Luffy-Tarou: On Play DON!! -1: play up to 1 purple {Straw Hat Crew} Character cost 5 or less from hand', 'No FAQ entry', [dd('ST18-005.on-play-play', E.tarou)], 'Optional DON!! -1.'),
  c18('OP05-061', 'Uso-Hachi: [DON!! x1] When Attacking with 8 or more field DON!!, rest up to 1 opposing Character cost 4 or less', 'No FAQ entry', [dd('OP05-061.when-attacking-rest', E.attack)], 'ALL_OF condition.'),
  c18('OP05-063', 'O-Robi: On Play with 8 or more field DON!!, K.O. up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('OP05-063.on-play-ko', E.eight)], 'FIELD_DON_AT_LEAST.'),
  c18('OP05-066', 'Jinbe: [Blocker]; [Opponent\'s Turn] with 10 field DON!!, +1000 power', 'No FAQ entry', [bl(E.cont), dd('OP05-066.opponent-turn-power', E.cont)], 'Continuous POWER with a field DON!! count.'),
  c18('OP05-067', 'Zoro-Juurou: When Attacking with 3 or less Life, add up to 1 DON!! from the DON!! deck set as active', 'No FAQ entry', [dd('OP05-067.when-attacking-don', E.life)], 'LIFE_AT_MOST.'),
  c18('OP05-068', 'Chopa-Emon: On Play with 8 or more field DON!!, set up to 1 purple {Straw Hat Crew} Character with 6000 power or less as active', 'No FAQ entry', [dd('OP05-068.on-play-set-active', E.life)], 'Colour and type filter.'),
  c18('OP05-070', 'Fra-Nosuke: [DON!! x1] with 8 or more field DON!!, this Character gains [Rush]', 'No FAQ entry', [dd('OP05-070.conditional-rush', E.cont)], 'Conditional keyword with a field DON!! count.'),
  c18('OP05-072', 'Hone-Kichi: On Play with 8 or more field DON!!, give up to 2 opposing Characters -2000 power this turn', 'No FAQ entry', [dd('OP05-072.on-play-power', E.eight)], 'Negative power on opposing Characters.'),
  c18('OP05-076', 'When You\'re at Sea You Fight against Pirates!!: Main look at 3, reveal up to 1 {Straw Hat Crew}, {Kid Pirates} or {Heart Pirates} card to hand, the rest at the bottom; Trigger activate this Main effect', 'No FAQ entry', [dd('OP05-076.main-search+trigger-search', E.search), tr('OP05-076.trigger-search', E.search)], 'traitsAny search.'),
]
CERTIFICATIONS.push(...ST18_CERTIFICATIONS)
const NV = {
  leader: ['M6 FAQ OP02-093: Leader Smoker with a DON!! gives -1 cost and gains +1000 this turn once while any Character has a cost of 0'],
  smoker: ['M6 ST-19 Smoker trashes 1 black {Navy} card to stop up to 2 cost 4 or less Characters attacking until the end of the opponent next turn'],
  sengoku: ['M6 ST-19 Sengoku trashes 2 black {Navy} cards to draw 3 with a {Navy} Leader'],
  tashigi: ['M6 FAQ ST19-003: Tashigi gives -4 cost with a Smoker Leader; the turn it is played it trashes a cost 0 Character without a K.O.'],
  trash: ['M6 FAQ ST19-004 and ST19-005: Hina and Garp place a trash card at the bottom of the deck (not with an empty trash) to give a rested DON!! or -1 cost'],
  minus: ['M6 ST-19 Koby trashes 1 card to K.O. a cost 3 or less; Tsuru and Ice Age give -2 and -5 cost; Ice Age Trigger K.O.s a cost 3 or less'],
  helmeppo: ['M6 FAQ OP02-113: Helmeppo gives -2 cost when attacking and gains +2000 this battle while any Character has a cost of 0; its Trigger plays it'],
  vergo: ['M6 ST-19 Vergo with a DON!! cannot be K.O.d in battle'],
  brannew: ['M6 FAQ OP03-089: Brannew looks at 3, adds a {Navy} card other than [Brannew] and trashes the rest'],
  plain: ['M6 ST-19 Rosinante blocks; Jaguar.D.Saul and Yamakaji (no ability) are played for their printed cost and power'],
}
const c19 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569019', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST19_CERTIFICATIONS: Certification[] = [
  c19('OP02-093', OFF, 'Leader Smoker, Life 5: [DON!! x1] Activate Main once per turn: up to 1 opposing Character -1 cost this turn; then if there is a Character with a cost of 0, this Leader +1000 this turn', 'FAQ OP02-093: any Character; not per Character', [dd('OP02-093.activate-main-cost', NV.leader)], 'FIELD_CHARACTER_COST_AT_MOST 0 condition.'),
  c19('ST19-001', OFF, 'Smoker: On Play you may trash 1 black {Navy} card from hand: up to 2 opposing Characters cost 4 or less cannot attack until the end of your opponent next turn', 'No FAQ entry', [dd('ST19-001.on-play-prevent-attack', NV.smoker)], 'preventAttack restriction.'),
  c19('ST19-002', OFF, 'Sengoku: On Play you may trash 2 black {Navy} cards from hand: with a {Navy} Leader, draw 3', 'No FAQ entry', [dd('ST19-002.on-play-draw', NV.sengoku)], 'All-or-nothing hand cost.'),
  c19('ST19-003', OFF, 'Tashigi: On Play with a [Smoker] Leader, up to 1 opposing Character -4 cost this turn; Activate Main once per turn, if played this turn, trash up to 1 opposing Character with a cost of 0', 'FAQ ST19-003: trashing is not a K.O.; usable with any Leader', [dd('ST19-003.on-play-cost+activate-main-trash', NV.tashigi)], 'trashCharacter and SOURCE_PLAYED_THIS_TURNV.'),
  c19('ST19-004', OFF, 'Hina: [DON!! x1] [Opponent\'s Turn] +4 cost; Activate Main once per turn, you may place 1 trash card at the bottom of your deck: give up to 1 rested DON!! to your Leader or 1 Character', 'FAQ ST19-004: not with an empty trash', [dd('ST19-004.opponent-turn-cost+activate-main-don', NV.trash)], 'TRASH_AT_LEAST condition.'),
  c19('ST19-005', OFF, 'Monkey.D.Garp: [Blocker]; Activate Main once per turn, you may place 1 trash card at the bottom of your deck: up to 1 opposing Character -1 cost this turn', 'FAQ ST19-005: not with an empty trash', [bl(NV.trash), dd('ST19-005.activate-main-cost', NV.trash)], 'Printed [Blocker].'),
  c19('OP02-098', OFF, 'Koby: On Play you may trash 1 card from hand: K.O. up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('OP02-098.on-play-ko', NV.minus)], 'Optional hand cost.'),
  c19('OP02-106', OFF, 'Tsuru: On Play up to 1 opposing Character -2 cost this turn', 'No FAQ entry', [dd('OP02-106.on-play-cost', NV.minus)], 'Cost modifier.'),
  c19('OP02-108', M5, 'Donquixote Rosinante: [Blocker]', 'No FAQ entry', [bl(NV.plain)], 'Printed [Blocker] only.'),
  c19('OP02-109', M5, 'Jaguar.D.Saul: no ability', 'No FAQ entry', [], 'Vanilla Character.', NV.plain),
  c19('OP02-113', OFF, 'Helmeppo: When Attacking up to 1 opposing Character -2 cost this turn; then if there is a Character with a cost of 0, +2000 this battle; Trigger play this card', 'FAQ OP02-113: any Character; not per Character', [dd('OP02-113.when-attacking-cost+trigger-play', NV.helmeppo), tr('OP02-113.trigger-play', NV.helmeppo)], 'Self power when the condition holds.'),
  c19('OP02-116', M5, 'Yamakaji: no ability', 'No FAQ entry', [], 'Vanilla Character.', NV.plain),
  c19('OP03-079', OFF, 'Vergo: [DON!! x1] cannot be K.O.d in battle', 'No FAQ entry', [dd('OP03-079.no-battle-ko', NV.vergo)], 'Battle K.O. protection.'),
  c19('OP03-089', OFF, 'Brannew: On Play look at 3, reveal up to 1 {Navy} card other than [Brannew] to hand, trash the rest', 'FAQ OP03-089: exactly {Navy}', [dd('OP03-089.on-play-search', NV.brannew)], 'Search with TRASH remainder.'),
  c19('OP02-117', OFF, 'Ice Age: Main up to 1 opposing Character -5 cost this turn; Trigger K.O. up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('OP02-117.main-cost+trigger-ko', NV.minus), tr('OP02-117.trigger-ko', NV.minus)], 'Cost modifier.'),
]
CERTIFICATIONS.push(...ST19_CERTIFICATIONS)
const G5 = {
  don: ['M6 ST-21 Leader Luffy with a DON!! and Nami give up to 2 rested DON!! to 1 Character (Nami: a {Straw Hat Crew} Leader or Character), once per turn'],
  cont: ['M6 ST-21 Usopp with 2 DON!! gains +2000 on the opponent turn; Franky with 2 DON!! gives +1000 to {Straw Hat Crew} Characters of 4000 base power or less'],
  sanji: ['M6 FAQ ST21-003: Sanji selects a {Straw Hat Crew} Character with 6000 power or more; only its attacks this turn cannot be blocked'],
  bonney: ['M6 ST-21 Jewelry Bonney with 2 DON!! draws 1 when K.O.d; without them nothing'],
  attack: ['M6 ST-21 Nico Robin with 2 DON!! K.O.s a 4000 power or less when attacking; Brook and Luffy give rested DON!! when attacking; Luffy has [Rush]'],
  zoro: ['M6 FAQ ST21-015: Roronoa Zoro has [Rush] with 2 DON!!; when K.O.d it plays a red Character of 6000 power or less other than [Roronoa Zoro]'],
  whip: ['M6 ST-21 Gum-Gum Dawn Whip gives +1000 then stops a 4000 power or less Character from blocking this turn; its Trigger K.O.s a 4000 power or less'],
  mole: ['M6 FAQ ST21-017: Gum-Gum Mole Pistol gives -5000 then, with a Character of 6000 power or more, K.O.s a 2000 power or less (another Character allowed)'],
}
const c21 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string) => certO('569021', number, OFF, detail, faqDetail, abilities, notes)
export const ST21_CERTIFICATIONS: Certification[] = [
  c21('ST21-001', 'Leader Monkey.D.Luffy, Life 5: [DON!! x1] Activate Main once per turn: give up to 2 rested DON!! to 1 of your Characters', 'No FAQ entry', [dd('ST21-001.activate-main-don', G5.don)], 'Two rested DON!! to one Character.'),
  c21('ST21-002', 'Usopp: [DON!! x2] [Opponent\'s Turn] +2000 power', 'No FAQ entry', [dd('ST21-002.opponent-turn-power', G5.cont)], 'Continuous POWER.'),
  c21('ST21-003', 'Sanji: On Play select up to 1 {Straw Hat Crew} Character with 6000 power or more; if it attacks this turn, the opponent cannot activate [Blocker]', 'FAQ ST21-003: other attackers can be blocked', [dd('ST21-003.on-play-prevent-blocker', G5.sanji)], 'minPower filter, turn blocker restriction.'),
  c21('ST21-004', 'Jewelry Bonney: [DON!! x2] On K.O. draw 1', 'No FAQ entry', [dd('ST21-004.on-ko-draw', G5.bonney)], 'Given DON!! counted when K.O.d.'),
  c21('ST21-009', 'Nami: Activate Main once per turn: give up to 2 rested DON!! to 1 {Straw Hat Crew} Leader or Character', 'No FAQ entry', [dd('ST21-009.activate-main-don', G5.don)], 'Trait filter.'),
  c21('ST21-010', 'Nico Robin: [DON!! x2] When Attacking K.O. up to 1 opposing Character with 4000 power or less', 'No FAQ entry', [dd('ST21-010.when-attacking-ko', G5.attack)], 'Power filter.'),
  c21('ST21-011', 'Franky: [DON!! x2] [Opponent\'s Turn] all your {Straw Hat Crew} Characters with 4000 base power or less +1000 power', 'No FAQ entry', [dd('ST21-011.opponent-turn-aura', G5.cont)], 'Aura with a base power limit.'),
  c21('ST21-012', 'Brook: When Attacking give up to 2 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('ST21-012.when-attacking-don', G5.attack)], 'Two rested DON!!.'),
  c21('ST21-014', 'Monkey.D.Luffy: [Rush]; When Attacking give up to 1 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [{ kind: 'keyword', id: 'RUSH', tests: G5.attack }, dd('ST21-014.when-attacking-don', G5.attack)], 'Printed [Rush].'),
  c21('ST21-015', 'Roronoa Zoro: [DON!! x2] [Rush]; On K.O. play up to 1 red Character with 6000 power or less other than [Roronoa Zoro] from hand', 'FAQ ST21-015: no other [Roronoa Zoro]', [dd('ST21-015.conditional-rush+on-ko-play', G5.zoro)], 'Conditional keyword and ON_KO play.'),
  c21('ST21-016', 'Gum-Gum Dawn Whip: Main up to 1 own Leader/Character +1000 this turn, then up to 1 opposing Character with 4000 power or less cannot activate [Blocker] this turn; Trigger K.O. up to 1 opposing Character with 4000 power or less', 'No FAQ entry', [dd('ST21-016.main-power-blocker+trigger-ko', G5.whip), tr('ST21-016.trigger-ko', G5.whip)], 'disableBlocker.'),
  c21('ST21-017', 'Gum-Gum Mole Pistol: Main up to 1 opposing Character -5000 this turn, then with a Character of 6000 power or more K.O. up to 1 opposing Character with 2000 power or less; Trigger activate this Main effect', 'FAQ ST21-017: the K.O. may target another Character', [dd('ST21-017.main-power-ko+trigger-power-ko', G5.mole), tr('ST21-017.trigger-power-ko', G5.mole)], 'OWN_CHARACTER_POWER_AT_LEAST condition.'),
]
CERTIFICATIONS.push(...ST21_CERTIFICATIONS)
const RH = {
  leader: ['M6 FAQ OP09-001: when the opponent attacks, Leader Shanks may give -1000; declining keeps it for a later attack, once per turn'],
  uta: ['M6 FAQ ST23-001: Uta costs 4 less in hand while you have a Character of 10000 power or more (current power), and has [Blocker]'],
  shanks: ['M6 FAQ ST23-002: Shanks costs 3 less while the opponent has an 8000 base power Character; on play the Red-Haired Leader gains +2000 until the end of the opponent next turn'],
  benn: ['M6 ST-23 Benn.Beckman trashes 1 card to K.O. a 4000 base power or less Character with a Red-Haired Leader'],
  rest: ['M6 ST-23 Luffy rests a DON!! and itself, Hongo rests itself, to give -1000 and -2000; Yasopp gives a rested DON!! once per turn'],
  bonk: ['M6 ST-23 Bonk Punch plays a [Monster] from hand and with a DON!! gains +2000 when attacking; Monster may be trashed instead of a Bonk Punch K.O.d by an effect'],
  yasopp: ['M6 ST-23 Yasopp gives the Leader +1000 until the end of the opponent next turn and -1000 when attacking with a DON!!'],
  lime: ['M6 FAQ OP09-014: Limejuice stops a [Blocker] Character of 4000 power or less from blocking this turn; Lucky.Roux blocks and K.O.s a 6000 base power or less when K.O.d'],
  search: ['M6 ST-23 Come On We Will Fight You searches 5 for a Red-Haired card other than itself; its Trigger draws 1'],
}
const c23 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string) => certO('569023', number, OFF, detail, faqDetail, abilities, notes)
export const ST23_CERTIFICATIONS: Certification[] = [
  c23('OP09-001', 'Leader Shanks, Life 5: [Once Per Turn] can be activated when your opponent attacks: give up to 1 opposing Leader or Character -1000 power this turn', 'FAQ OP09-001: may wait for a later attack; attacks by a Leader or a Character', [dd('OP09-001.opponent-attack-power', RH.leader)], 'ON_OPPONENT_ATTACK, used only when a target is chosen.'),
  c23('ST23-001', 'Uta: with a Character of 10000 power or more, this card in hand -4 cost; [Blocker]', 'FAQ ST23-001: current power counts', [bl(RH.uta), dd('ST23-001.hand-cost', RH.uta)], 'Own cost in hand.'),
  c23('ST23-002', 'Shanks: while the opponent has a Character of 8000 base power or more, this card in hand -3 cost; On Play with a {Red-Haired Pirates} or [Uta] Leader, your Leader +2000 until the end of your opponent next End Phase', 'FAQ ST23-002: an effect-raised base power counts', [dd('ST23-002.hand-cost+on-play-power', RH.shanks)], 'Own cost in hand and a two-turn power modifier.'),
  c23('ST23-003', 'Benn.Beckman: On Play you may trash 1 card from hand: with a {Red-Haired Pirates} Leader, K.O. up to 1 opposing Character with 4000 base power or less', 'No FAQ entry', [dd('ST23-003.on-play-ko', RH.benn)], 'Base power filter.'),
  c23('ST23-004', 'Monkey.D.Luffy: Activate Main, rest 1 DON!! and this Character: up to 1 opposing Character -1000 this turn', 'No FAQ entry', [dd('ST23-004.activate-main-power', RH.rest)], 'SEQUENCE cost.'),
  c23('ST23-005', 'Yasopp: Activate Main once per turn, give up to 1 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('ST23-005.activate-main-don', RH.rest)], 'Rested DON!!.'),
  c23('OP09-010', 'Bonk Punch: On Play play up to 1 [Monster] from hand; [DON!! x1] When Attacking +2000 this turn', 'No FAQ entry', [dd('OP09-010.on-play-play+when-attacking-power', RH.bonk)], 'Name filter.'),
  c23('OP09-011', 'Hongo: Activate Main, rest this: with a {Red-Haired Pirates} Leader, up to 1 opposing Character -2000 this turn', 'No FAQ entry', [dd('OP09-011.activate-main-power', RH.rest)], 'REST_SOURCE cost.'),
  c23('OP09-012', 'Monster: if your [Bonk Punch] would be K.O.d by an effect, you may trash this Character instead', 'No FAQ entry', [dd('OP09-012.protect-bonk-punch', RH.bonk)], 'Named ally K.O. replacement.'),
  c23('OP09-013', 'Yasopp: On Play up to 1 of your Leader +1000 until the end of your opponent next turn; [DON!! x1] When Attacking up to 1 opposing Character -1000 this turn', 'No FAQ entry', [dd('OP09-013.on-play-power+when-attacking-power', RH.yasopp)], 'Two-turn power modifier.'),
  c23('OP09-014', 'Limejuice: On Play the opponent cannot activate up to 1 [Blocker] Character with 4000 power or less this turn', 'FAQ OP09-014: even if its power later rises', [dd('OP09-014.on-play-disable-blocker', RH.lime)], 'disableBlocker.'),
  c23('OP09-015', 'Lucky.Roux: [Blocker]; On K.O. with a {Red-Haired Pirates} Leader, K.O. up to 1 opposing Character with a base power of 6000 or less', 'No FAQ entry', [bl(RH.lime), dd('OP09-015.on-ko-ko', RH.lime)], 'ON_KO with a base power filter.'),
  c23('OP09-020', 'Come On!! We\'ll Fight You!!: Main look at 5, reveal up to 1 {Red-Haired Pirates} card other than this to hand, the rest at the bottom; Trigger draw 1', 'No FAQ entry', [dd('OP09-020.main-search+trigger-draw', RH.search), tr('OP09-020.trigger-draw', RH.search)], 'Search excluding its own name.'),
]
CERTIFICATIONS.push(...ST23_CERTIFICATIONS)
const W8 = {
  leader: ['M6 ST-28 Leader Yamato has [Double Attack] and, with 3 or less opposing Life, gives up to 2 rested DON!! to 1 Character once per turn'],
  ashura: ['M6 ST-28 Ashura Doji with a Land of Wano Leader and 3 or more opposing Life K.O.s a base cost 5 or less Character, whatever its current cost'],
  izo: ['M6 ST-28 Izo gains [Blocker] with 2 DON!! and on play gives its Land of Wano Leader [Banish] this turn'],
  trig: ['M6 ST-28 the Akazaya Kinemon, Inuarashi and others are played from the Trigger only while the opponent has 3 or less Life'],
  momo: ['M6 FAQ ST28-004: Momonosuke returns 2 given DON!! (from different cards) rested to gain [Rush] and +1000; with 2 or less Life it gives the Leader +1000 on your turn'],
  yamato: ['M6 ST-28 Yamato searches 5 for a Land of Wano card with a cost of 2 or more and gains +3000 on your turn with 2 DON!!'],
  inu: ['M6 ST-28 Inuarashi with 2 DON!! trashes 1 card to K.O. a Character whose cost is at most the opposing Life count'],
  kawa: ['M6 FAQ OP06-103: Kawamatsu trashes 2 cards to add a 0 power Character face-up to the top or bottom of its owner Life'],
  kiku: ['M6 ST-28 Kikunojo, when K.O.d with 3 or less opposing Life, adds the top deck card to the top of its Life'],
  den: ['M6 ST-28 Denjiro with 2 DON!! and 3 or less opposing Life cannot be K.O.d by effects'],
  neko: ['M6 ST-28 Nekomamushi with 2 DON!! can also attack an active opposing Character'],
  raizo: ['M6 ST-28 Raizo trashes 1 card when attacking to rest up to 1 opposing DON!!; Portgas.D.Ace rests a cost 5 or less with 2 rested Characters'],
  life: ['M6 FAQ ST13-016: Yamato has [Rush]; on play it places 1 Life card on top of the deck and puts the rest back in any order'],
  blaze: ['M6 ST-28 Blaze Slice gives +1000 as Main or Counter, rests a cost 4 or less with 2 or less opposing Life; its Trigger rests one'],
}
const c28 = (number: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string) => certO('569028', number, OFF, detail, faqDetail, abilities, notes)
const play28 = (id: string) => tr(id, W8.trig)
export const ST28_CERTIFICATIONS: Certification[] = [
  c28('OP06-022', 'Leader Yamato, Life 4: [Double Attack]; Activate Main once per turn, with 3 or less opposing Life, give up to 2 rested DON!! to 1 of your Characters', 'No FAQ entry', [{ kind: 'keyword', id: 'DOUBLE_ATTACK', tests: W8.leader }, dd('OP06-022.activate-main-don', W8.leader)], 'Printed keyword on a Leader.'),
  c28('ST28-001', 'Ashura Doji: On Play with a {Land of Wano} Leader and 3 or more opposing Life, K.O. up to 1 opposing Character with a base cost of 5 or less', 'No FAQ entry', [dd('ST28-001.on-play-ko', W8.ashura)], 'costBasis BASE.'),
  c28('ST28-002', 'Izo: [DON!! x2] [Blocker]; On Play your {Land of Wano} Leader gains [Banish] this turn', 'No FAQ entry', [dd('ST28-002.on-play-banish+conditional-blocker', W8.izo)], 'Conditional [Blocker].'),
  c28('ST28-003', 'Kin\'emon: Trigger, with a {Land of Wano} Leader and 3 or less opposing Life, play this card', 'No FAQ entry', [dd('ST28-003.trigger-play', W8.trig), play28('ST28-003.trigger-play')], 'Condition checked in the program; otherwise trashed.'),
  c28('ST28-004', 'Kouzuki Momonosuke: [Your Turn] with 2 or less Life your Leader +1000; Activate Main once per turn, you may return 2 given DON!! rested: [Rush] and +1000 this turn', 'FAQ ST28-004: the 2 DON!! may come from different cards', [dd('ST28-004.activate-main-rush+your-turn-leader-power', W8.momo)], 'returnGivenDon cost; Leader-only aura.'),
  c28('ST28-005', 'Yamato: [DON!! x2] [Your Turn] +3000; On Play look at 5, reveal up to 1 {Land of Wano} card with a cost of 2 or more to hand, the rest at the bottom', 'No FAQ entry', [dd('ST28-005.on-play-search+your-turn-power', W8.yamato)], 'Search with minCost.'),
  c28('OP06-100', 'Inuarashi: [DON!! x2] When Attacking you may trash 1 card: K.O. up to 1 opposing Character with a cost up to the opposing Life count; Trigger with 3 or less opposing Life play this card', 'No FAQ entry', [dd('OP06-100.when-attacking-ko+trigger-play', W8.inu), play28('OP06-100.trigger-play')], 'maxCostFromLife.'),
  c28('OP06-103', 'Kawamatsu: When Attacking you may trash 2 cards: add up to 1 of your 0 power Characters to the top or bottom of its owner Life face-up; Trigger with 3 or less opposing Life play this card', 'FAQ OP06-103: exactly 0 power', [dd('OP06-103.when-attacking-life+trigger-play', W8.kawa), play28('OP06-103.trigger-play')], 'Mode for top or bottom.'),
  c28('OP06-104', 'Kikunojo: On K.O. with 3 or less opposing Life add up to 1 top deck card to the top of your Life; Trigger with 3 or less opposing Life play this card', 'No FAQ entry', [dd('OP06-104.on-ko-life+trigger-play', W8.kiku), play28('OP06-104.trigger-play')], 'ON_KO.'),
  c28('OP06-109', 'Denjiro: [DON!! x2] with 3 or less opposing Life cannot be K.O.d by effects; Trigger with 3 or less opposing Life play this card', 'No FAQ entry', [dd('OP06-109.trigger-play+no-effect-ko', W8.den), play28('OP06-109.trigger-play')], 'K.O. protection with an opposing Life limit.'),
  c28('OP06-110', 'Nekomamushi: [DON!! x2] can also attack your opponent\'s active Characters; Trigger with 3 or less opposing Life play this card', 'No FAQ entry', [dd('OP06-110.trigger-play+attack-active', W8.neko), play28('OP06-110.trigger-play')], 'ATTACK_ACTIVE_CHARACTERS keyword.'),
  c28('OP06-112', 'Raizo: When Attacking you may trash 1 card: rest up to 1 opposing DON!!; Trigger with 3 or less opposing Life play this card', 'No FAQ entry', [dd('OP06-112.when-attacking-rest-don+trigger-play', W8.raizo), play28('OP06-112.trigger-play')], 'Rest an opposing DON!!.'),
  c28('OP09-035', 'Portgas.D.Ace: On Play with 2 or more rested Characters, rest up to 1 opposing Character cost 5 or less', 'No FAQ entry', [dd('OP09-035.on-play-rest', W8.raizo)], 'OWN_RESTED_CHARACTERS_AT_LEAST.'),
  c28('ST13-016', 'Yamato: [Rush]; On Play look at all your Life, place 1 at the top of your deck, the rest back in your Life in any order', 'FAQ ST13-016: face-up Life stays face-up', [{ kind: 'keyword', id: 'RUSH', tests: W8.life }, dd('ST13-016.on-play-life', W8.life)], 'lifeToDeckTop and arrangeLife; private look.'),
  c28('OP07-116', 'Blaze Slice: Main/Counter up to 1 own Leader/Character +1000 this turn, then with 2 or less opposing Life rest up to 1 opposing Character cost 4 or less; Trigger rest up to 1 opposing Character cost 4 or less', 'No FAQ entry', [dd('OP07-116.main-power-rest+counter+trigger-rest', W8.blaze), ce('OP07-116.counter', W8.blaze), tr('OP07-116.trigger-rest', W8.blaze)], 'Counter Event at its printed cost.'),
]
CERTIFICATIONS.push(...ST28_CERTIFICATIONS)
const XG = {
  leader: ['M6 ST-25 Leader Buggy rests 5 DON!! and trashes 1 card to play any {Cross Guild} Character card from hand'],
  cost: ['M6 ST-25 Alvida, Cabaji and Mohji gain +1 cost with 2 Characters of base cost 5 or more; Cabaji and Mohji also gain [Blocker]; Cabaji has +5000 on the opponent turn'],
  alvida: ['M6 ST-25 Alvida with a Buggy Leader draws 3 then trashes 2 on play'],
  croc: ['M6 ST-25 Crocodile & Mihawk draws 2, trashes 1, then plays a {Cross Guild} Character cost 4 or less',
    'M6 ST-25 Crocodile & Mihawk: a {Cross Guild} Character removed by an opponent effect may stay by trashing 1 hand card, once per turn',
    'M6 FAQ ST25-003: when several {Cross Guild} Characters are K.O.d at the same time, trashing 1 card protects all of them'],
  buggy: ['M6 ST-25 Buggy trashes 1 card and itself to play a {Cross Guild} Character cost 6 or less with a Buggy Leader'],
  ko: ['M6 ST-25 Mohji draws 1 when K.O.d with a Buggy Leader and 3 or less cards in hand; Alvida OP09-043 plays a cost 5 or less other than Alvida'],
  cabaji: ['M6 ST-25 Cabaji cannot be K.O.d in battle while you have a [Buggy] or [Mohji] Character'],
  bottom: ['M6 ST-25 Buggy OP09-051 places an opposing Character at the bottom, then itself unless you have 5 Characters of cost 5 or more'],
  search: ['M6 ST-25 Mohji searches 5 for a [Richie] then plays a [Richie] from hand; Mr.3 searches 4 for a Cross Guild or Baroque Works card'],
  p084: ['M6 ST-25 P-084 Buggy cannot attack, and with a Buggy Leader no Character of cost 3 or 4 can attack; on play it plays a Cross Guild cost 6 or less'],
  guild: ['M6 ST-25 Cross Guild searches 4 for a Cross Guild card as Main and Trigger; Richie blocks; Mr.1 is played for its printed cost'],
}
const c25 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569025', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST25_CERTIFICATIONS: Certification[] = [
  c25('OP09-042', OFF, 'Leader Buggy, Life 5: Activate Main, you may rest 5 DON!! and trash 1 card from hand: play up to 1 {Cross Guild} Character card from hand', 'No FAQ entry', [dd('OP09-042.activate-main-play', XG.leader)], 'Both costs paid together, any cost of the played card.'),
  c25('ST25-001', OFF, 'Alvida: with 2 or more Characters of base cost 5 or more, +1 cost; On Play with a [Buggy] Leader draw 3 and trash 2', 'No FAQ entry', [dd('ST25-001.on-play-draw+base-cost-plus-one', [...XG.cost, ...XG.alvida])], 'Base cost count (no dependency on modified costs).'),
  c25('ST25-002', OFF, 'Cabaji: with 2 or more Characters of base cost 5 or more, [Blocker] and +1 cost; [Opponent\'s Turn] +5000', 'No FAQ entry', [dd('ST25-002.base-cost-plus-one+conditional-blocker+opponent-turn-power', XG.cost)], 'Conditional [Blocker].'),
  c25('ST25-003', OFF, 'Crocodile & Mihawk: On Play draw 2 and trash 1, then play up to 1 {Cross Guild} Character cost 4 or less from hand; once per turn, if your {Cross Guild} Character would be removed from the field by your opponent\'s effect, you may trash 1 card from hand instead', 'FAQ ST25-003: one card protects every Character removed at the same time', [dd('ST25-003.on-play-draw-play+guard-cross-guild', XG.croc)], 'GUARD replacement (REMOVAL by opponent effects), batch coverage.'),
  c25('ST25-004', OFF, 'Buggy: Activate Main, you may trash 1 card from hand and this Character: with a [Buggy] Leader, play up to 1 {Cross Guild} Character cost 6 or less from hand', 'No FAQ entry', [dd('ST25-004.activate-main-play', XG.buggy)], 'Self trash as a cost.'),
  c25('ST25-005', OFF, 'Mohji: with 2 or more Characters of base cost 5 or more, [Blocker] and +1 cost; On K.O. with a [Buggy] Leader and 3 or less cards in hand, draw 1', 'No FAQ entry', [dd('ST25-005.on-ko-draw+base-cost-plus-one+conditional-blocker', [...XG.ko, ...XG.cost])], 'ON_KO.'),
  c25('OP09-043', OFF, 'Alvida: On K.O. with a {Cross Guild} Leader, play up to 1 Character cost 5 or less other than [Alvida] from hand', 'No FAQ entry', [dd('OP09-043.on-ko-play', XG.ko)], 'ON_KO play.'),
  c25('OP09-045', OFF, 'Cabaji: while you have a [Buggy] or [Mohji] Character, cannot be K.O.d in battle', 'No FAQ entry', [dd('OP09-045.no-battle-ko', XG.cabaji)], 'Named-ally condition.'),
  c25('OP09-051', OFF, 'Buggy: On Play place up to 1 opposing Character at the bottom of its deck; then, without 5 Characters of cost 5 or more, place this Character at the bottom of its deck', 'No FAQ entry', [dd('OP09-051.on-play-bottom', XG.bottom)], 'OWN_CHARACTER_COUNT.'),
  c25('OP09-053', OFF, 'Mohji: On Play look at 5, reveal up to 1 [Richie] to hand, the rest at the bottom; then play up to 1 [Richie] from hand', 'No FAQ entry', [dd('OP09-053.on-play-richie', XG.search)], 'Name search.'),
  c25('OP09-054', M5, 'Richie: [Blocker]', 'No FAQ entry', [bl(XG.guild)], 'Printed [Blocker] only.'),
  c25('OP09-055', M5, 'Mr.1(Daz.Bonez): no ability', 'No FAQ entry', [], 'Vanilla Character.', XG.guild),
  c25('OP09-056', OFF, 'Mr.3(Galdino): On Play look at 4, reveal up to 1 {Cross Guild} card or card with a type including "Baroque Works" other than [Mr.3(Galdino)] to hand, the rest at the bottom', 'No FAQ entry', [dd('OP09-056.on-play-search', XG.search)], 'traitIncludesAny search.'),
  c25('P-084', OFF, 'Buggy: cannot attack; with a [Buggy] Leader all Characters with a cost of 3 or 4 cannot attack; On Play play up to 1 {Cross Guild} Character cost 6 or less from hand', 'No FAQ entry', [dd('P-084.on-play-play+cannot-attack+cost-3-4-cannot-attack', XG.p084)], 'Printed attack prohibitions.'),
  c25('OP09-057', OFF, 'Cross Guild: Main look at 4, reveal up to 1 {Cross Guild} card to hand, the rest at the bottom; Trigger activate this Main effect', 'No FAQ entry', [dd('OP09-057.main-search+trigger-search', XG.guild), tr('OP09-057.trigger-search', XG.guild)], 'Search.'),
]
CERTIFICATIONS.push(...ST25_CERTIFICATIONS)
const BM = {
  leader: ['M6 FAQ OP03-099: Leader Katakuri with a DON!! looks at a top Life card of either player, places it top or bottom, and gains +1000 this battle'],
  kata: ['M6 FAQ ST20-001: Katakuri turns the face-down top Life card face-up to give a rested DON!!, once per turn; not when the top card is face-up'],
  cracker: ['M6 FAQ ST20-002: Cracker K.O.d by an effect may trash the top Life card instead, once per turn; its Trigger trashes 1 card to play it'],
  brulee: ['M6 ST-20 Brulee Trigger looks at a top Life card, places it, then goes to hand; Pudding returns a top Life card to hand to set a Big Mom cost 3 or less active'],
  linlin: ['M6 FAQ ST20-005: Linlin trashes 1 card, then the opponent chooses to trash 2 of its hand cards or its top Life card'],
  smoothie: ['M6 ST-20 Smoothie adds a Life card to hand when attacking for +2000 this battle; its Trigger trashes 1 card to play it'],
  pudding: ['M6 FAQ OP03-112: Pudding looks at 4 for a [Sanji] (any type) or a Big Mom Pirates card other than Charlotte Pudding'],
  ko: ['M6 ST-20 Streusen trashes a card with a Trigger to K.O. a cost 1 or less; Thunder Bolt trashes the top Life to K.O. a cost 5 or less, and K.O.s one as Trigger'],
  ikoku: ['M6 FAQ OP03-118: Ikoku Sovereignty gives +5000 this battle; its Trigger trashes 2 cards to add the top deck card to the top of the Life'],
  plain: ['M6 ST-20 Charlotte Opera (no ability) and Galette ([Blocker]) are played for their printed cost and power'],
}
const c20 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569020', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST20_CERTIFICATIONS: Certification[] = [
  c20('OP03-099', OFF, 'Leader Charlotte Katakuri, Life 5: [DON!! x1] When Attacking look at up to 1 top Life card of either player and place it top or bottom; then +1000 this battle', 'FAQ OP03-099: +1000 even with no Life; a face-up card stays face-up', [dd('OP03-099.when-attacking-peek', BM.leader)], 'Private peek, then a battle power modifier.'),
  c20('ST20-001', OFF, 'Charlotte Katakuri: [Blocker]; Activate Main once per turn, you may turn your top Life card face-up: give up to 1 rested DON!! to your Leader or 1 Character', 'FAQ ST20-001: not when the top card is already face-up', [bl(BM.plain), dd('ST20-001.activate-main-don', BM.kata)], 'turnLifeFaceUp cost.'),
  c20('ST20-002', OFF, 'Charlotte Cracker: once per turn, if this Character would be K.O.d by an effect, you may trash your top Life card instead; Trigger you may trash 1 card: play this card', 'FAQ ST20-002: not with 0 Life', [dd('ST20-002.trigger-play+guard-life', BM.cracker), tr('ST20-002.trigger-play', BM.cracker)], 'GUARD replacement.'),
  c20('ST20-003', OFF, 'Charlotte Brulee: Trigger look at up to 1 top Life card of either player, place it top or bottom, then add this card to hand', 'No FAQ entry', [dd('ST20-003.trigger-peek', BM.brulee), tr('ST20-003.trigger-peek', BM.brulee)], 'Trigger card to hand.'),
  c20('ST20-004', OFF, 'Charlotte Pudding: On Play you may add your top Life card to hand: set up to 1 {Big Mom Pirates} Character cost 3 or less active; Trigger rest up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('ST20-004.on-play-set-active+trigger-rest', BM.brulee), tr('ST20-004.trigger-rest', BM.brulee)], 'Top Life only.'),
  c20('ST20-005', OFF, 'Charlotte Linlin: On Play you may trash 1 card: the opponent chooses: it trashes 2 cards from its hand, or its top Life card is trashed', 'FAQ ST20-005: the opponent chooses and trashes; no Life, nothing', [dd('ST20-005.on-play-mode', BM.linlin)], 'Opponent mode and opponent hand choice.'),
  c20('OP03-106', M5, 'Charlotte Opera: no ability', 'No FAQ entry', [], 'Vanilla Character.', BM.plain),
  c20('OP03-107', M5, 'Charlotte Galette: [Blocker]', 'No FAQ entry', [bl(BM.plain)], 'Printed [Blocker] only.'),
  c20('OP03-110', OFF, 'Charlotte Smoothie: When Attacking you may add a top or bottom Life card to hand: +2000 this battle; Trigger you may trash 1 card: play this card', 'No FAQ entry', [dd('OP03-110.when-attacking-power+trigger-play', BM.smoothie), tr('OP03-110.trigger-play', BM.smoothie)], 'Life cost.'),
  c20('OP03-112', OFF, 'Charlotte Pudding: On Play look at 4, reveal up to 1 [Sanji] or {Big Mom Pirates} card other than [Charlotte Pudding] to hand, the rest at the bottom', 'FAQ OP03-112: a [Sanji] of any type', [dd('OP03-112.on-play-search', BM.pudding)], 'Name or type search.'),
  c20('OP03-115', OFF, 'Streusen: On Play you may trash 1 card with a [Trigger]: K.O. up to 1 opposing Character cost 1 or less', 'No FAQ entry', [dd('OP03-115.on-play-ko', BM.ko)], 'hasTrigger hand filter.'),
  c20('OP03-118', OFF, 'Ikoku Sovereignty: Counter up to 1 own Leader/Character +5000 this battle; Trigger you may trash 2 cards: add up to 1 top deck card to the top of your Life', 'FAQ OP03-118: added before the second damage', [dd('OP03-118.counter+trigger-life', BM.ikoku), ce('OP03-118.counter', BM.ikoku), tr('OP03-118.trigger-life', BM.ikoku)], 'Counter Event at its printed cost.'),
  c20('OP03-121', OFF, 'Thunder Bolt: Main you may trash your top Life card: K.O. up to 1 opposing Character cost 5 or less; Trigger K.O. up to 1 opposing Character cost 5 or less', 'No FAQ entry', [dd('OP03-121.main-ko+trigger-ko', BM.ko), tr('OP03-121.trigger-ko', BM.ko)], 'Own Life trash as a cost.'),
]
CERTIFICATIONS.push(...ST20_CERTIFICATIONS)
const WB = {
  leader: ['M6 FAQ OP02-001: Leader Newgate adds the top Life card to hand at the end of the turn; with no Life nothing happens and the game goes on'],
  fool: ['M6 FAQ OP02-023: with 3 or less Life the Event forbids adding Life to hand by own effects this turn; with 4 or more nothing happens; its Trigger gives the Leader +1000'],
  atmos: ['M6 ST-15 Atmos with an Edward.Newgate Leader forbids adding Life to hand this turn when attacking; the optional Life cost cannot be paid'],
  thatch: ['M6 FAQ ST15-004: Thatch with a Whitebeard Pirates Leader gives -2000 then always adds the top Life card; without one nothing happens'],
  ace: ['M6 ST-15 Ace has [Rush] with a Whitebeard Pirates Leader and, once per turn, takes -2000 this turn instead of being removed by an opponent effect'],
  king: ['M6 ST-15 Kingdew K.O.d by an effect during the opponent turn gives the Leader +2000 this turn; not when K.O.d in battle'],
  marco: ['M6 FAQ OP02-018: Marco K.O.d trashes a Whitebeard Pirates card to come back rested from the trash with 2 or less Life, as a new card'],
  jozu: ['M6 ST-15 Jozu gains [Rush] with a DON!!, 2 or less Life and a Whitebeard Pirates Leader; Rakuyo with a DON!! gives Whitebeard Pirates Characters +1000 on your turn'],
  izo: ['M6 ST-15 Izo looks at 5 for a Whitebeard Pirates type card other than Izo; Haruta gives a rested DON!! once per turn'],
  newgate: ['M6 ST-15 Edward Newgate gives a rested DON!! on play and rests itself to K.O. an opposing Character with 5000 power or less'],
  plain: ['M6 ST-15 Speed Jil and Namule (no ability) and Fossa ([Blocker]) are played for their printed cost and power'],
}
const c15 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569015', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST15_CERTIFICATIONS: Certification[] = [
  c15('OP02-001', OFF, 'Leader Edward.Newgate, Life 6: End of Your Turn add 1 card from the top of your Life cards to your hand', 'FAQ OP02-001: with no Life nothing happens and it does not cause a loss', [dd('OP02-001.end-of-turn-life', WB.leader)], 'Mandatory top Life to hand, skipped with no Life or while locked.'),
  c15('OP02-008', OFF, 'Jozu: [DON!! x1] with 2 or less Life and a Leader whose type includes "Whitebeard Pirates", this Character gains [Rush]', 'No FAQ entry', [dd('OP02-008.conditional-rush', WB.jozu)], 'Conditional [Rush] (given DON!!, own Life, Leader type text).'),
  c15('OP02-018', OFF, 'Marco: [Blocker]; On K.O. you may trash 1 card with a type including "Whitebeard Pirates" from your hand: with 2 or less Life, play this Character card from your trash rested', 'FAQ OP02-018: the played card is a new card', [bl(WB.plain), dd('OP02-018.on-ko-replay', WB.marco)], 'Self from trash (isSource), Life checked after the cost.'),
  c15('OP02-019', OFF, 'Rakuyo: [DON!! x1] [Your Turn] all of your Characters with a type including "Whitebeard Pirates" gain +1000 power', 'No FAQ entry', [dd('OP02-019.your-turn-aura', WB.jozu)], 'Aura filtered by type text.'),
  c15('OP02-023', OFF, 'You May Be a Fool...but I Still Love You: Main with 3 or less Life you cannot add Life cards to your hand using your own effects this turn; Trigger up to 1 of your Leader +1000 this turn', 'FAQ OP02-023: current Life; with 4 or more nothing happens; costs that add a Life card to hand cannot be paid', [dd('OP02-023.main-lock+trigger-power', WB.fool), tr('OP02-023.trigger-power', WB.fool)], 'lockLifeToHand (THIS_TURN); Life costs and effects are refused while it applies.'),
  c15('OP03-003', OFF, 'Izo: On Play look at 5, reveal up to 1 card with a type including "Whitebeard Pirates" other than [Izo] to hand, the rest at the bottom in any order', 'No FAQ entry', [dd('OP03-003.on-play-search', WB.izo)], 'Search by type text.'),
  // OP03-006 Speed Jil, OP03-007 Namule and OP03-010 Fossa are certified by the M5 red batch (M5_CERTIFIABLE).
  c15('OP03-009', OFF, 'Haruta: Activate Main once per turn give up to 1 rested DON!! card to your Leader or 1 of your Characters', 'No FAQ entry', [dd('OP03-009.activate-main-don', WB.izo)], 'Rested DON!! given.'),
  c15('ST15-001', OFF, 'Atmos: When Attacking, if your Leader is [Edward.Newgate], you cannot add Life cards to your hand using your own effects during this turn', 'No FAQ entry', [dd('ST15-001.when-attacking-lock', WB.atmos)], 'lockLifeToHand with a Leader name condition.'),
  c15('ST15-002', OFF, 'Edward.Newgate: On Play give up to 1 rested DON!! to your Leader or 1 Character; Activate Main you may rest this Character: K.O. up to 1 opposing Character with 5000 power or less', 'No FAQ entry', [dd('ST15-002.on-play-don+activate-main-ko', WB.newgate)], 'REST_SOURCE cost, power-limited K.O.'),
  c15('ST15-003', OFF, "Kingdew: [Blocker]; [Opponent's Turn] when this Character is K.O.d by an effect, up to 1 of your Leader gains +2000 power this turn", 'No FAQ entry', [bl(WB.plain), dd('ST15-003.on-ko-power', WB.king)], 'KO_BY_EFFECT: the On K.O. is not captured for a battle K.O.'),
  c15('ST15-004', OFF, 'Thatch: On Play with a Leader whose type includes "Whitebeard Pirates", give up to 1 opposing Character -2000 this turn; then add 1 card from the top of your Life cards to your hand', 'FAQ ST15-004: with such a Leader the Life card is added whenever possible, even without the -2000; FAQ EB03-017 and OP14-112: without the Leader condition the "Then," part is not applied', [dd('ST15-004.on-play-power-life', WB.thatch)], 'The Leader condition gates both sentences.'),
  c15('ST15-005', OFF, "Portgas.D.Ace: with a Leader whose type includes \"Whitebeard Pirates\", [Rush]; once per turn, if this Character would be removed from the field by your opponent's effect, you may give it -2000 this turn instead", 'No FAQ entry', [dd('ST15-005.conditional-rush+guard-power', WB.ace)], 'GUARD replacement (REMOVAL by opponent effects, POWER_THIS_TURN -2000).'),
]
CERTIFICATIONS.push(...ST15_CERTIFICATIONS)
const FI = {
  barto: ['M6 ST-16 Bartolomeo at the end of the turn may rest itself to set another FILM Character active, never another Bartolomeo'],
  lullaby: ['M6 FAQ P-057: with an Uta Leader up to 2 opposing rested Characters cost 4 or less stay rested in the next opposing Refresh Phase only'],
  wind: ['M6 FAQ P-058: with an Uta Leader all FILM Characters become active at the end of the turn, including one played and rested later; its Trigger sets them active'],
  world: ['M6 ST-16 The World Continuation returns any number of own Characters to hand for +2000 per Character this battle'],
  tot: ['M6 FAQ P-060: Tot Musica rests an Uta Leader or Character to rest up to 2 opposing DON!! cards'],
  uta: ['M6 ST-16 Uta trashes a FILM card to give a rested DON!! once per turn; Gordon trashes Music cards for +1000 each this battle on one card'],
  kata: ['M6 FAQ ST16-003: Katakuri with a FILM Leader gains +2000 with 6 or more rested cards, itself included; Luffy gains +1000 with a rested Uta'],
  shanks: ['M6 ST-16 Shanks K.O.s up to 1 opposing rested Character on play; Monkey.D.Luffy P-061 is played for its printed cost and power'],
}
const c16 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569016', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST16_CERTIFICATIONS: Certification[] = [
  c16('P-029', OFF, 'Bartolomeo: End of Your Turn you may rest this Character: set up to 1 of your {FILM} Characters other than [Bartolomeo] as active', 'No FAQ entry', [dd('P-029.end-of-turn-set-active', FI.barto)], 'Self-rest cost inside the program.'),
  c16('P-057', OFF, "Fleeting Lullaby: Main with an [Uta] Leader up to 2 opposing rested Characters cost 4 or less do not become active in the opponent's next Refresh Phase; Trigger activate this card's Main", 'FAQ P-057: a Character that became active again before that Refresh Phase is unaffected', [dd('P-057.main-lock+trigger-main', FI.lullaby), tr('P-057.trigger-main', FI.lullaby)], 'lockRefresh, consumed by that Refresh Phase.'),
  c16('P-058', OFF, 'Where the Wind Blows: Main with an [Uta] Leader set all of your {FILM} Characters as active at the end of this turn; Trigger set all of your {FILM} Characters as active', 'FAQ P-058: a {FILM} Character played and rested during that turn becomes active; FAQ ST24-005: an "at the end of this turn" effect resolves after all [End of Your Turn] effects', [dd('P-058.main-delay+end-of-turn-delayed+trigger-set-active', FI.wind), tr('P-058.trigger-set-active', FI.wind)], 'scheduleEndOfTurn: delayed part fired after every [End of Your Turn] effect.'),
  c16('P-059', OFF, "The World's Continuation: Counter with an [Uta] Leader you may return any number of your Characters to the owner's hand; up to 1 of your Leader or Character cards +2000 this battle for every returned Character", 'No FAQ entry', [dd('P-059.counter', FI.world), ce('P-059.counter', FI.world)], 'addPower perBinding.'),
  c16('P-060', OFF, 'Tot Musica: Main you may rest 1 of your [Uta] cards: rest up to 2 of your opponent DON!! cards', 'FAQ P-060: your [Uta] Leader or Characters', [dd('P-060.main-rest-don', FI.tot)], 'Name-filtered rest cost.'),
  c16('P-061', M5, 'Monkey.D.Luffy: no ability', 'No FAQ entry', [], 'Vanilla Character.', FI.shanks),
  c16('ST16-001', OFF, 'Uta: [Blocker]; Activate Main once per turn you may trash 1 {FILM} card from your hand: give up to 1 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [bl(FI.uta), dd('ST16-001.activate-main-don', FI.uta)], 'Hand trash cost.'),
  c16('ST16-002', OFF, "Gordon: [Blocker]; On Your Opponent's Attack you may trash any number of {Music} cards from your hand: your Leader or 1 Character +1000 this battle for every card trashed", 'FAQ ST16-002: the power goes to one card only', [bl(FI.uta), dd('ST16-002.on-opponent-attack-power', FI.uta)], 'addPower perBinding.'),
  c16('ST16-003', OFF, 'Charlotte Katakuri: with a {FILM} Leader and 6 or more rested cards, +2000 power', 'FAQ ST16-003: this Character counts when rested', [dd('ST16-003.rested-cards-power', FI.kata)], 'Rested Leader, Characters, Stage and cost-area DON!! are counted.'),
  c16('ST16-004', OFF, 'Shanks: On Play K.O. up to 1 of your opponent rested Characters', 'No FAQ entry', [dd('ST16-004.on-play-ko', FI.shanks)], 'Rested-only K.O.'),
  c16('ST16-005', OFF, 'Monkey.D.Luffy: if you have a rested [Uta], +1000 power', 'No FAQ entry', [dd('ST16-005.rested-uta-power', FI.kata)], 'Leader or Character named [Uta].'),
]
CERTIFICATIONS.push(...ST16_CERTIFICATIONS)
const SH = {
  leader: ['M6 FAQ OP09-061: Leader Luffy adds 1 active and 1 rested DON!! when 2 or more DON!! return at the same time on your turn, once per turn; 1 returned DON!! does nothing'],
  aura: ['M6 ST-26 Leader Luffy with a DON!! gives all of your Characters +1 cost'],
  nami: ['M6 ST-26 Nami returns 1 or more DON!! to give up to 2 rested DON!! cards; Zoro returns 1 or more DON!! to add 1 active DON!!'],
  lightning: ['M6 ST-26 Gum-Gum Lightning pays DON!! -2 to K.O. a Character with 6000 power or less; its Trigger adds 1 active DON!!'],
  giant: ['M6 ST-26 Gum-Gum Giant pays DON!! -2 and 1 hand card for +4000 this battle then draws 2 with a Straw Hat Crew Leader; without one nothing more happens'],
  soba: ['M6 FAQ ST26-001: Soba Mask costs 5 less with a San-Gorou or Sanji of 7000 base power or more and returns them all to hand on play'],
  chopper: ['M6 ST-26 Chopper pays DON!! -2 to rest 1 opposing DON!! or a Character cost 1 or less; Franky gives up to 2 opposing Characters -2000'],
  luffy: ['M6 FAQ ST26-005: Luffy pays DON!! -2 with a multicolored Leader and 5 or more opposing DON!! to set the Leader base power to 7000 until the end of the next opposing turn; twice stays 7000'],
}
const c26 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569026', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST26_CERTIFICATIONS: Certification[] = [
  c26('OP09-061', OFF, 'Leader Monkey.D.Luffy, Life 4: [DON!! x1] all of your Characters +1 cost; [Your Turn] once per turn when 2 or more DON!! on your field return to your DON!! deck, add up to 1 DON!! active and up to 1 more rested', 'FAQ OP09-061: only 2 or more returned at the same time', [dd('OP09-061.don-returned-add+don-cost-aura', [...SH.leader, ...SH.aura])], 'DON_RETURNED_TOGETHER_AT_LEAST: DON!! returned by the same resolution.'),
  c26('OP09-070', OFF, 'Nami: On Play you may return 1 or more DON!! from your field to your DON!! deck: give up to 2 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('OP09-070.on-play-don', SH.nami)], 'Variable DON!! return cost.'),
  c26('OP09-076', OFF, 'Roronoa Zoro: On Play you may return 1 or more DON!! from your field to your DON!! deck: add up to 1 DON!! active', 'No FAQ entry', [dd('OP09-076.on-play-don', SH.nami)], 'Variable DON!! return cost.'),
  c26('OP09-077', OFF, 'Gum-Gum Lightning: Main DON!! -2: K.O. up to 1 opposing Character with 6000 power or less; Trigger add up to 1 DON!! active', 'No FAQ entry', [dd('OP09-077.main-ko+trigger-don', SH.lightning), tr('OP09-077.trigger-don', SH.lightning)], 'DON!! -2 inside the program.'),
  c26('OP09-078', OFF, 'Gum-Gum Giant: Counter DON!! -2 and you may trash 1 card: with a {Straw Hat Crew} Leader up to 1 Leader or Character +4000 this battle, then draw 2', 'No FAQ entry; FAQ EB03-017/OP14-112: without the Leader condition the "Then," part is not applied', [dd('OP09-078.counter', SH.giant), ce('OP09-078.counter', SH.giant)], 'Both costs paid together.'),
  c26('ST26-001', OFF, 'Soba Mask: -5 cost in hand with a [San-Gorou] or [Sanji] Character of 7000 base power or more; On Play return all of your [San-Gorou] and [Sanji] Characters to hand', 'FAQ ST26-001: base power; one such Character, no stacking; playable as cost 2 by other effects', [dd('ST26-001.on-play-return+hand-cost', SH.soba)], 'Hand cost continuous.'),
  c26('ST26-002', OFF, 'Tony Tony.Chopper: [Blocker]; On Play DON!! -2: rest up to 1 opposing DON!! or Character with a cost of 1 or less', 'No FAQ entry', [bl(SH.chopper), dd('ST26-002.on-play-rest', SH.chopper)], 'One card in all (whenBindingEmpty).'),
  c26('ST26-003', OFF, 'Nico Robin: On Play DON!! -2: add up to 1 DON!! active', 'No FAQ entry', [dd('ST26-003.on-play-don', SH.leader)], 'DON!! -2 inside the program.'),
  c26('ST26-004', OFF, 'General Franky: On Play DON!! -2: give up to 2 opposing Characters -2000 this turn', 'No FAQ entry', [dd('ST26-004.on-play-power', SH.chopper)], 'DON!! -2 inside the program.'),
  c26('ST26-005', OFF, "Monkey.D.Luffy: On Play / When Attacking DON!! -2: with a multicolored Leader and 5 or more opposing field DON!!, your {Straw Hat Crew} Leader's base power becomes 7000 until the end of your opponent's next End Phase", 'FAQ ST26-005: activated twice, the base power is 7000', [dd('ST26-005.on-play-base-power+when-attacking-base-power', SH.luffy)], 'setBasePower.'),
]
CERTIFICATIONS.push(...ST26_CERTIFICATIONS)
const RL = {
  kick: ['M6 FAQ OP04-016: Bad Manners Kick Course costs 0 per its official card image; trashing 1 card gives +3000 this battle, without trashing nothing; its Trigger gives -3000'],
  robin: ['M6 ST-31 Robin with 2 DON!! gives -2000 until the end of the next opposing turn when attacking; Zoro has [Rush] and gives -1000 this turn when attacking'],
  franky: ['M6 FAQ OP11-012: Franky gives all of your Characters +2000 this turn after the opponent activates an Event on your turn, once per turn; not for a Trigger'],
  gatling: ['M6 ST-31 Gum-Gum Gatling Gun gives a rested DON!! to a Monkey.D.Luffy card then -2000; Chopper P-101 gives a rested DON!! to the Leader on play'],
  sanji: ['M6 ST-31 Sanji with 2 DON!! has [Rush] and on play draws 1 then plays a Straw Hat Crew Character cost 5 or less other than Sanji; Jinbe plays a cost 1 card including Thousand Sunny'],
  brook: ['M6 FAQ ST31-003: Brook gains [Blocker] and +3000 during the opponent turn with a total of 3 or more given DON!! cards'],
  luffy: ['M6 FAQ ST31-004: Luffy has [Rush] with a total of 3 or more given DON!! and on play gives -1000 per Straw Hat Crew card on your field to one opposing Character'],
  sunny: ['M6 ST-31 Thousand Sunny looks at 5 for a Straw Hat Crew card on play and rests itself to give a rested DON!! to a Monkey.D.Luffy card'],
}
const c31 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569031', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST31_CERTIFICATIONS: Certification[] = [
  c31('OP04-016', OFF, 'Bad Manners Kick Course, cost 0 (official card image; the card list prints "-"): Counter you may trash 1 card: up to 1 of your Leader or Character cards +3000 this battle; Trigger up to 1 opposing Leader or Character -3000 this turn', 'FAQ OP04-016: without trashing, no power', [dd('OP04-016.counter+trigger-power', RL.kick), ce('OP04-016.counter', RL.kick), tr('OP04-016.trigger-power', RL.kick)], 'printedCostFromImage (sources/images/IMAGES.json).'),
  c31('OP11-009', OFF, "Nico Robin: [DON!! x2] When Attacking up to 1 opposing Character -2000 until the end of your opponent's next turn", 'No FAQ entry', [dd('OP11-009.when-attacking-power', RL.robin)], 'Opponent power modifier with a duration.'),
  c31('OP11-012', OFF, 'Franky: [Your Turn] once per turn when your opponent activates an Event, all of your Characters +2000 this turn', 'FAQ OP11-012: not for a [Trigger]; the Event resolves first', [dd('OP11-012.opponent-event-power', RL.franky)], 'ON_OPPONENT_EVENT observer (Event cards played as Counter).'),
  c31('OP13-021', OFF, 'Gum-Gum Gatling Gun: Main give up to 1 rested DON!! to 1 of your [Monkey.D.Luffy] cards, then up to 1 opposing Character -2000 this turn; Trigger up to 1 opposing Character -2000 this turn', 'No FAQ entry', [dd('OP13-021.main-don-power+trigger-power', RL.gatling), tr('OP13-021.trigger-power', RL.gatling)], 'Name-filtered DON!! target.'),
  c31('OP14-015', OFF, 'Roronoa Zoro: [Rush]; When Attacking up to 1 opposing Character -1000 this turn', 'No FAQ entry', [dd('OP14-015.when-attacking-power', RL.robin)], 'Printed [Rush].'),
  c31('P-101', OFF, 'Tony Tony.Chopper: [Blocker]; On Play give up to 1 rested DON!! to your Leader', 'No FAQ entry', [bl(RL.gatling), dd('P-101.on-play-don', RL.gatling)], 'Leader target.'),
  c31('ST31-001', OFF, 'Sanji: [DON!! x2] [Rush]; On Play draw 1 and play up to 1 {Straw Hat Crew} Character cost 5 or less other than [Sanji] from your hand', 'No FAQ entry', [dd('ST31-001.on-play-draw-play+conditional-rush', RL.sanji)], 'Conditional [Rush].'),
  c31('ST31-002', OFF, 'Jinbe: [Blocker]; On Play draw 1 and play up to 1 {Straw Hat Crew} card with a cost of 1 from your hand', 'FAQ ST31-002: a Stage such as ST31-005 can be played', [bl(RL.brook), dd('ST31-002.on-play-draw-play', RL.sanji)], 'Character or Stage.'),
  c31('ST31-003', OFF, "Brook: [Opponent's Turn] with a total of 3 or more given DON!! cards, [Blocker] and +3000 power", 'FAQ ST31-003: all given DON!! count; not when the total drops to 2 or less before the block', [dd('ST31-003.opponent-turn-power+conditional-blocker', RL.brook)], 'Continuous check.'),
  c31('ST31-004', OFF, 'Monkey.D.Luffy: [Rush] with a total of 3 or more given DON!!; On Play up to 1 opposing Character -1000 this turn for every {Straw Hat Crew} card on your field', 'FAQ ST31-004: all given DON!! count', [dd('ST31-004.on-play-power+conditional-rush', RL.luffy)], 'Leader, Characters and Stage are counted.'),
  c31('ST31-005', OFF, 'Thousand Sunny: On Play look at 5, reveal up to 1 {Straw Hat Crew} card to hand, the rest at the bottom; Activate Main you may rest this Stage: give up to 1 rested DON!! to 1 of your [Monkey.D.Luffy] cards', 'No FAQ entry', [dd('ST31-005.on-play-search+activate-main-don', RL.sunny)], 'Stage abilities.'),
]
CERTIFICATIONS.push(...ST31_CERTIFICATIONS)
const KZ = {
  leader: ['M6 FAQ OP12-040: Leader Kuzan draws as many cards as were trashed from hand by a Navy card effect; not for an opponent effect'],
  bors: ['M6 FAQ ST33-004: Borsalino costs 3 less in hand during a turn in which a hand card was trashed by an effect, also an opponent effect; it has [Blocker]'],
  blue: ['M6 ST-33 Bluegrass bottoms an opposing cost 1 or less on play and draws then trashes when attacking; Smoker trashes 1 to bottom up to 2 cost 2 or less'],
  ice: ['M6 ST-33 Ice Time trashes 1 so that up to 2 opposing Characters of 10000 power or less cannot attack through the next opposing turn with a Navy Leader; its Trigger returns a cost 5 or less'],
  kuzan: ['M6 ST-33 Kuzan has +1 cost with 5 or more hand cards and trashes 1 on play so an opposing Character cannot attack through the next opposing turn'],
  zephyr: ['M6 FAQ OP12-046: Zephyr trashes 2 cards on play, the only remaining card if just one; it trashes itself to return a Character cost 5 or less'],
  sengoku: ['M6 ST-33 Sengoku trashes 1 to look at 5 for up to 2 Navy cards other than Sengoku; Koby has [Blocker] and trashes 1 to draw 1'],
  saka: ['M6 FAQ ST33-002: Sakazuki trashes 1 when attacking so a 6 or more card opponent trashes 1; with 5 or less nothing; on K.O. plays a Navy cost 4 or less'],
  peck: ['M6 FAQ OP12-057: Ice Block Pheasant Peck gives +4000 this battle then trashes 1 card, also as the only card in hand; its Trigger trashes 1 to draw 1'],
  garp: ['M6 ST-33 Garp with a Navy Leader plays a blue Navy Character of 8000 power or less other than Garp; Jango and Fullbody (no ability) and Jaguar.D.Saul ([Blocker]) keep their printed values'],
}
const c33 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569033', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST33_CERTIFICATIONS: Certification[] = [
  c33('OP12-040', OFF, 'Leader Kuzan, Life 5: when a card is trashed from your hand by your {Navy} type card effect, draw cards equal to the number trashed', 'FAQ OP12-040: also a card trashed instead of a removal', [dd('OP12-040.hand-trashed-draw', KZ.leader)], 'ON_OWN_HAND_TRASHED observer; one group per trashing step.'),
  c33('EB04-026', OFF, 'Bluegrass: On Play up to 1 opposing Character cost 1 or less to the bottom of its owner deck; When Attacking draw 1 and trash 1', 'No FAQ entry', [dd('EB04-026.on-play-bottom+when-attacking-draw', KZ.blue)], 'Deck bottom and draw/trash.'),
  c33('EB04-028', OFF, 'Ice Time: Main you may trash 1: with a {Navy} Leader up to 2 opposing Characters with 10000 power or less cannot attack until the end of the next opposing End Phase; Trigger return up to 1 Character cost 5 or less to hand', 'No FAQ entry', [dd('EB04-028.main-prevent+trigger-bounce', KZ.ice), tr('EB04-028.trigger-bounce', KZ.ice)], 'preventAttack through the next opposing turn.'),
  c33('OP12-043', OFF, 'Kuzan: +1 cost with 5 or more cards in hand; On Play you may trash 1: up to 1 opposing Character cannot attack until the end of the next opposing End Phase', 'No FAQ entry', [dd('OP12-043.on-play-prevent+hand-cost', KZ.kuzan)], 'minimumHandSize cost.'),
  c33('OP12-045', M5, 'Jango: no ability', 'No FAQ entry', [], 'Vanilla Character.', KZ.garp),
  c33('OP12-046', OFF, 'Zephyr (Navy): On Play trash 2 cards from your hand; Activate Main you may trash this Character: return up to 1 Character cost 5 or less to hand', 'FAQ OP12-046: with 1 card left, it is trashed', [dd('OP12-046.on-play-trash+activate-main-bounce', KZ.zephyr)], 'Self-trash cost (trashCharacter).'),
  c33('OP12-047', OFF, 'Sengoku: On Play you may trash 1: look at 5, reveal up to 2 {Navy} cards other than [Sengoku] to hand, the rest at the bottom', 'No FAQ entry', [dd('OP12-047.on-play-search', KZ.sengoku)], 'Search after a hand cost.'),
  c33('OP12-050', M5, 'Jaguar.D.Saul: [Blocker]', 'No FAQ entry', [bl(KZ.garp)], 'Printed [Blocker] only.'),
  c33('OP12-052', M5, 'Fullbody: no ability', 'No FAQ entry', [], 'Vanilla Character.', KZ.garp),
  c33('OP12-057', OFF, 'Ice Block Pheasant Peck: Counter up to 1 Leader or Character +4000 this battle, then trash 1 card from your hand; Trigger you may trash 1: draw 1', 'FAQ OP12-057: playable as the only card in hand', [dd('OP12-057.counter+trigger-draw', KZ.peck), ce('OP12-057.counter', KZ.peck), tr('OP12-057.trigger-draw', KZ.peck)], 'Mandatory trash as possible.'),
  c33('ST33-001', OFF, 'Koby: [Blocker]; On Play you may trash 1: draw 1', 'FAQ ST33-001: not without trashing', [bl(KZ.sengoku), dd('ST33-001.on-play-draw', KZ.sengoku)], 'Hand cost.'),
  c33('ST33-002', OFF, 'Sakazuki: When Attacking you may trash 1: if your opponent has 6 or more hand cards, your opponent trashes 1; On K.O. play up to 1 {Navy} Character cost 4 or less from your hand', 'FAQ ST33-002: not without trashing; with 5 or less, the cost is paid and nothing more happens', [dd('ST33-002.when-attacking-discard+on-ko-play', KZ.saka)], 'Opponent hand trash.'),
  c33('ST33-003', OFF, 'Smoker: On Play you may trash 1: up to 2 opposing Characters cost 2 or less to the bottom of their owner deck', 'FAQ ST33-003: not without trashing', [dd('ST33-003.on-play-bottom', KZ.blue)], 'Hand cost.'),
  c33('ST33-004', OFF, 'Borsalino: -3 cost in hand during a turn in which a card in your hand is trashed by an effect; [Blocker]', 'FAQ ST33-004: also by an opponent effect', [dd('ST33-004.hand-cost', KZ.bors), bl(KZ.bors)], 'handTrashes of this turn.'),
  c33('ST33-005', OFF, 'Monkey.D.Garp: On Play with a {Navy} Leader play up to 1 blue {Navy} Character with 8000 power or less other than [Monkey.D.Garp] from your hand', 'No FAQ entry', [dd('ST33-005.on-play-play', KZ.garp)], 'Colour, type and power filters.'),
]
CERTIFICATIONS.push(...ST33_CERTIFICATIONS)
const BM34 = {
  leader: ['M6 ST-34 Leader Katakuri pays DON!! -1 when attacking or when the opponent attacks to look at the top opposing deck card, then gains +1000 this battle, once per turn'],
  oven: ['M6 FAQ OP11-066: Oven rests itself, a matching chosen cost K.O.s a base cost 3 or less then adds a rested DON!!; without a match neither'],
  reveal: ['M6 ST-34 Perospero trashes 1 and on a match draws 1 and adds an active DON!!; the Counter Event gives +5000 on a match and draws 1 as Trigger; Cognac K.O.s a base cost 8 or less on a match'],
  flampe: ['M6 ST-34 Flampe gives a Charlotte Katakuri card +2000 on your turn; Pudding adds a rested DON!! when your field DON!! do not exceed the opponent; Anana has [Blocker] with another purple Big Mom Pirates Character'],
  kata: ['M6 FAQ ST34-001: Katakuri adds 2 rested DON!! when a DON!! returns on your turn with a Big Mom Pirates Leader, once per turn and each copy only at that return; on K.O. it plays a Character of 8000 power or less'],
  cracker: ['M6 FAQ ST34-002: Cracker with a Big Mom Pirates Leader adds a rested DON!! then K.O.s a cost 2 or less, either part alone; without such a Leader nothing'],
  linlin: ['M6 FAQ ST34-004: Linlin pays DON!! -4 and 1 hand card to add the top deck card to Life and set an opposing base power to 0 this turn; without a hand card nothing'],
  smoothie: ['M6 ST-34 Smoothie K.O.d on the opponent turn pays DON!! -1 to play a Big Mom Pirates Character with a cost up to the opposing field DON!!; Brulee looks at 3; Tamago and Pekoms K.O.s a base power 2000 or less'],
}
const c34 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569034', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST34_CERTIFICATIONS: Certification[] = [
  c34('OP11-062', OFF, "Leader Charlotte Katakuri, Life 5: When Attacking / On Your Opponent's Attack, once per turn, DON!! -1: look at 1 card from the top of your opponent's deck, then this Leader +1000 this battle", 'No FAQ entry', [dd('OP11-062.when-attacking-look+opponent-attack-look', BM34.leader)], 'Private look (reveal to the chooser) at the opposing deck top.'),
  c34('EB03-032', OFF, '[Your Turn] On Play up to 1 of your [Charlotte Katakuri] cards +2000 this turn', 'No FAQ entry', [dd('EB03-032.on-play-power', BM34.flampe)], 'Name-filtered Leader or Character.'),
  c34('EB03-035', OFF, 'Charlotte Pudding: [Blocker]; On Play if your field DON!! are equal to or less than the opponent field DON!!, add up to 1 DON!! rested', 'No FAQ entry', [bl(BM34.flampe), dd('EB03-035.on-play-don', BM34.flampe)], 'FIELD_DON_AT_MOST_OPPONENT.'),
  c34('OP11-065', OFF, 'Charlotte Anana: [Blocker] while you have a purple {Big Mom Pirates} Character other than [Charlotte Anana]', 'No FAQ entry', [dd('OP11-065.conditional-blocker', BM34.flampe)], 'Conditional [Blocker] (whenOtherOwnCharacter).'),
  c34('OP11-066', OFF, 'Charlotte Oven: Activate Main you may rest this Character: choose a cost and reveal the opposing deck top; on a match K.O. up to 1 opposing Character base cost 3 or less, then add up to 1 DON!! rested', 'FAQ OP11-066: without a match, neither the K.O. nor the DON!!', [dd('OP11-066.activate-main-reveal', BM34.oven)], 'Choose a cost (0..10) and revealDeckTopCostMatch.'),
  c34('OP11-071', OFF, 'Charlotte Perospero: Activate Main once per turn you may trash 1: choose a cost and reveal; on a match draw 1 and add up to 1 DON!! active', 'No FAQ entry', [dd('OP11-071.activate-main-reveal', BM34.reveal)], 'Hand cost before the reveal.'),
  c34('OP11-079', OFF, 'When Two Men Are Fighting...: Counter choose a cost and reveal; on a match up to 1 Leader or Character +5000 this battle; Trigger draw 1', 'No FAQ entry', [dd('OP11-079.counter+trigger-draw', BM34.reveal), ce('OP11-079.counter', BM34.reveal), tr('OP11-079.trigger-draw', BM34.reveal)], 'Counter Event reveal.'),
  c34('OP11-081', OFF, 'Cognac Mama-Mash: Main choose a cost and reveal; on a match K.O. up to 1 opposing Character base cost 8 or less; Trigger add up to 1 DON!! active', 'No FAQ entry', [dd('OP11-081.main-reveal+trigger-don', BM34.reveal), tr('OP11-081.trigger-don', BM34.reveal)], 'Base cost K.O.'),
  c34('P-090', OFF, "Charlotte Smoothie: [Opponent's Turn] On K.O. DON!! -1: play up to 1 {Big Mom Pirates} Character with a cost up to the opposing field DON!! other than [Charlotte Smoothie] from your hand", 'No FAQ entry', [dd('P-090.on-ko-play', BM34.smoothie)], 'maxCostFromFieldDon.'),
  c34('ST34-001', OFF, 'Charlotte Katakuri: [Your Turn] once per turn when a DON!! of your field returns to your DON!! deck, with a {Big Mom Pirates} Leader add up to 2 DON!! rested; On K.O. play up to 1 Character with 8000 power or less from your hand', 'FAQ ST34-001: each copy triggers at that return only', [dd('ST34-001.don-returned-add+on-ko-play', BM34.kata)], 'ON_DON_RETURNED.'),
  c34('ST34-002', OFF, 'Charlotte Cracker: On Play with a {Big Mom Pirates} Leader add up to 1 DON!! rested, then K.O. up to 1 opposing Character cost 2 or less', 'FAQ ST34-002: either part alone; FAQ EB03-017/OP14-112: nothing without the Leader condition', [dd('ST34-002.on-play-don-ko', BM34.cracker)], 'Leader condition gates both parts.'),
  c34('ST34-003', OFF, 'Charlotte Brulee: On Play look at 3, reveal up to 1 {Big Mom Pirates} card to hand, the rest at the bottom', 'No FAQ entry', [dd('ST34-003.on-play-search', BM34.smoothie)], 'Search.'),
  c34('ST34-004', OFF, "Charlotte Linlin: On Play DON!! -4 and you may trash 1: add up to 1 top deck card to the top of your Life, then up to 1 opposing Character's base power becomes 0 this turn", 'FAQ ST34-004: the highest set base power applies; nothing without a card to trash', [dd('ST34-004.on-play-life-power', BM34.linlin)], 'setBasePower THIS_TURN on an opposing Character.'),
  c34('ST34-005', OFF, 'Baron Tamago & Pekoms: When Attacking DON!! -1: K.O. up to 1 opposing Character with 2000 base power or less', 'No FAQ entry', [dd('ST34-005.when-attacking-ko', BM34.smoothie)], 'Base power K.O.'),
]
CERTIFICATIONS.push(...ST34_CERTIFICATIONS)
const ZR = {
  leader: ['M6 FAQ OP12-020: Leader Zoro with 3 DON!! sets itself active after battling an opposing Character (a blocking one too), then cannot attack Characters of base cost 7 or less this turn'],
  kuina: ['M6 ST-32 Kuina rests itself to rest an opposing base cost 4 or less and gives up to 3 rested DON!! to the Zoro Leader; Perona then sets a DON!! active once per turn'],
  kou: ['M6 FAQ OP12-027: Koushirou rests itself instead of a Slash Character of cost 5 or less being K.O.d by an opposing effect; it has [Blocker]'],
  hiyori: ['M6 FAQ OP12-028: Hiyori rests a DON!! and itself with a Zoro Leader to look at 5 for a Slash card of any colour or a green Event'],
  tashigi: ['M6 ST-32 Tashigi rests an opposing base cost 6 or less and gives 3 rested DON!! to the Zoro Leader; the Event sets the Zoro Leader active and its Trigger gives +1000'],
  drake: ['M6 FAQ ST24-005: X.Drake with a Supernovas Leader rests a cost 5 or less and sets a DON!! active at the end of the turn, after the End of Your Turn effects; Ryuma K.O.s a rested cost 4 or less on play and when attacking'],
  kinemon: ['M6 ST-32 Kin emon rests the Slash Leader or 1 DON!! to draw 2 and trash 1'],
  oden: ['M6 FAQ EB02-011: after Oden, the chosen opposing Character cannot be rested until the end of the next opposing End Phase, so it cannot attack nor block nor be rested by effects'],
  mihawk: ['M6 FAQ ST32-003: Mihawk draws 1 and trashes 1 when it becomes rested on your turn and, with a Slash Leader, plays a Perona or a Slash Character of cost 5 or less'],
  rayleigh: ['M6 FAQ ST32-005: Rayleigh with a Slash Leader and Zoro have [Rush: Character] and rest opposing cost 2 or less Characters on play; Kawamatsu has no ability'],
}
const c32 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569032', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST32_CERTIFICATIONS: Certification[] = [
  c32('OP12-020', OFF, 'Leader Roronoa Zoro, Life 5: [DON!! x3] Activate Main once per turn: if this Leader battled an opposing Character this turn, set it active; then it cannot attack opposing Characters of base cost 7 or less this turn', 'FAQ OP12-020: a blocking Character counts, a blocking Leader does not, no battle if removed before; DON!! may be given after the battle', [dd('OP12-020.activate-main-active', ZR.leader)], 'Battle history of this turn; limitAttackTargets.'),
  c32('OP10-036', OFF, 'Perona: [Your Turn] once per turn if a Character is rested by your effect, set up to 1 of your DON!! active', 'FAQ OP09-022: a Character played rested is not rested by an effect; FAQ OP07-031 (same wording): a Character rested to pay an activation cost is; CR 1.2.1 §8-3-1', [dd('OP10-036.rested-by-effect-don', ZR.kuina)], 'ON_CHARACTER_RESTED_BY_OWN_EFFECT (effects and activation costs).'),
  c32('OP12-023', M5, 'Kawamatsu: no ability', 'No FAQ entry', [], 'Vanilla Character.', ZR.rayleigh),
  c32('OP12-026', OFF, 'Kuina: Activate Main you may rest this Character: rest up to 1 opposing Character base cost 4 or less, then give up to 3 rested DON!! to your [Roronoa Zoro] Leader', 'No FAQ entry', [dd('OP12-026.activate-main-rest', ZR.kuina)], 'REST_SOURCE cost.'),
  c32('OP12-027', OFF, "Koushirou: if your <Slash> Character cost 5 or less other than this one would be K.O.d by your opponent's effect, you may rest this Character instead; [Blocker]", 'FAQ OP12-027: two copies may each protect one Character', [dd('OP12-027.guard-rest', ZR.kou), bl(ZR.kou)], 'GUARD REST_SOURCE (attribute filter).'),
  c32('OP12-028', OFF, 'Kouzuki Hiyori: Activate Main you may rest 1 DON!! and this Character: with a [Roronoa Zoro] Leader look at 5, reveal up to 1 <Slash> card or green Event to hand, the rest at the bottom', 'FAQ OP12-028: a non-green <Slash> card too', [dd('OP12-028.activate-main-search', ZR.hiyori)], 'SEQUENCE cost; attribute or Event colour search.'),
  c32('OP12-031', OFF, 'Tashigi: On Play rest up to 1 opposing Character base cost 6 or less, then give up to 3 rested DON!! to your [Roronoa Zoro] Leader', 'No FAQ entry', [dd('OP12-031.on-play-rest', ZR.tashigi)], 'Rest and DON!!.'),
  c32('OP12-039', OFF, 'Luffy Is the Man Who Will Become the King of Pirates!!!: Main set your [Roronoa Zoro] Leader active; Trigger up to 1 Leader or Character +1000 this turn', 'No FAQ entry', [dd('OP12-039.main-active+trigger-power', ZR.tashigi), tr('OP12-039.trigger-power', ZR.tashigi)], 'Named Leader.'),
  c32('OP15-036', OFF, 'Ryuma: On Play / When Attacking K.O. up to 1 opposing rested Character cost 4 or less', 'No FAQ entry', [dd('OP15-036.on-play-ko+when-attacking-ko', ZR.drake)], 'Rested-only K.O.'),
  c32('ST24-005', OFF, 'X.Drake: On Play with a {Supernovas} Leader rest up to 1 opposing Character cost 5 or less, then set up to 1 DON!! active at the end of this turn', 'FAQ ST24-005: after all [End of Your Turn] effects; FAQ EB03-017/OP14-112: the Then part follows the Leader condition', [dd('ST24-005.on-play-rest+end-of-turn-delayed', ZR.drake)], 'scheduleEndOfTurn (delayed part).'),
  c32('ST32-001', OFF, "Kin'emon: On Play you may rest your <Slash> Leader or 1 DON!!: draw 2 and trash 1", 'No FAQ entry', [dd('ST32-001.on-play-draw', ZR.kinemon)], 'UNION of two alternative costs.'),
  c32('ST32-002', OFF, "Kouzuki Oden: On Play draw 1 and up to 1 opposing Character base cost 6 or less cannot be rested until the end of your opponent's next End Phase", 'FAQ EB02-011/OP11-034: it cannot attack, activate [Blocker], pay a rest cost or be rested by effects', [dd('ST32-002.on-play-prevent-rest', ZR.oden)], 'preventRest.'),
  c32('ST32-003', OFF, 'Dracule Mihawk: [Your Turn] when this Character becomes rested draw 1 and trash 1; On Play with a <Slash> Leader play up to 1 Character cost 5 or less that is [Perona] or <Slash> from your hand', 'FAQ ST32-003: cost 5 or less in both cases', [dd('ST32-003.rested-draw+on-play-play', ZR.mihawk)], 'ON_SOURCE_RESTED (attack included).'),
  c32('ST32-004', OFF, 'Silvers Rayleigh: [Rush: Character] with a <Slash> Leader; On Play rest up to 2 opposing Characters cost 2 or less', 'No FAQ entry', [dd('ST32-004.on-play-rest+conditional-rush-character', ZR.rayleigh)], 'Conditional [Rush: Character].'),
  c32('ST32-005', OFF, 'Roronoa Zoro: [Rush: Character]; On Play with a <Slash> Leader rest up to 1 opposing Character cost 2 or less', 'FAQ ST32-005: not on the first turn', [dd('ST32-005.on-play-rest', ZR.rayleigh)], 'Printed [Rush: Character].'),
]
CERTIFICATIONS.push(...ST32_CERTIFICATIONS)
const TB = {
  sabo: ['M6 FAQ ST13-001: Leader Sabo with a DON!! adds a cost 3 or more Character of 7000 power or more (DON!! included) face-up to the top of the Life for +2000 to a Character until the next turn'],
  ace: ['M6 FAQ ST13-002: Leader Ace with 2 DON!! adds a cost 5 Character face-up to the Life from the top 5, and trashes every face-up Life card at the end of the turn'],
  luffy: ['M6 FAQ ST13-003: with Leader Luffy a face-up Life card goes to the bottom of the deck instead of the hand, without its Trigger, also for Makino whose cost is then not paid; it adds up to 2 cost 5 Characters from hand and trash face-up at 0 Life'],
  newgate: ['M6 FAQ ST13-004: Newgate adds the top deck card to the Life, then places 1 Life card face-down on top of the deck and the rest back in any order, sides kept'],
  ivankov: ['M6 ST-13 Ivankov trashes a top or bottom Life card to reveal and add a cost 5 Character from hand face-down; Sabo cost 5 trashes a Life card to K.O. a cost 5 or less'],
  brothers: ['M6 ST-13 Dadan plays up to 1 each of Sabo, Ace and Luffy of cost 2 from hand; the cost 2 brothers trash themselves to reveal the top Life card and play a matching cost 5, then the Leader gets +2000 until the end of the next opposing turn'],
  shanks: ['M6 FAQ ST13-009: Shanks turns a face-up Life card in any position face-down so that, with 7 or more opposing hand cards, the top opposing Life card is trashed'],
  ace5: ['M6 FAQ ST13-011: Ace cost 5 gains Rush on play with 2 or less Life and keeps it; Luffy cost 5 gains +2000 until the next turn then draws 1 and trashes the top Life card'],
  makino: ['M6 FAQ ST13-012: Makino adds a Life card to hand to look at all Life cards and place them back in any order, sides kept; Garp and The Three Brothers Bond look at 5 for a brother of cost 5 or less'],
  events: ['M6 FAQ ST13-017: Flame Dragon King gives +4000 then rearranges the Life; Gum-Gum Jet Spear gives +2000 and draws at 0 Life; their Trigger swaps a Life card for a hand card'],
}
const c13 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569013', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST13_CERTIFICATIONS: Certification[] = [
  c13('ST13-001', OFF, 'Leader Sabo, Life 4: [DON!! x1] Activate Main once per turn you may add 1 of your Characters cost 3 or more and 7000 power or more face-up to the top of your Life: up to 1 Character +2000 until the start of your next turn', 'FAQ ST13-001: current power, DON!! included', [dd('ST13-001.activate-main-life', TB.sabo)], 'Face-up Life from the field (public).'),
  c13('ST13-002', OFF, 'Leader Portgas.D.Ace, Life 4: [DON!! x2] Activate Main once per turn look at 5, add up to 1 Character cost 5 face-up to the top of your Life, the rest at the bottom; End of Your Turn trash all your face-up Life cards', 'FAQ ST13-002: every face-up Life card, whatever placed it', [dd('ST13-002.activate-main-life+end-of-turn-trash', TB.ace)], 'Search to the Life face-up.'),
  c13('ST13-003', OFF, 'Leader Monkey.D.Luffy, Life 4: your face-up Life cards go to the bottom of your deck instead of your hand; [DON!! x2] Activate Main once per turn you may trash 1: with 0 Life add up to 2 Characters cost 5 from hand or trash face-up to the top of your Life', 'FAQ ST13-003: no [Trigger]; Makino cost not paid; Reject card to the deck; 1 from hand and 1 from trash together', [dd('ST13-003.activate-main-life+face-up-life-to-deck', TB.luffy)], 'Leader Life rule (lifeRules), hand-or-trash selector.'),
  c13('ST13-004', OFF, 'Edward.Newgate: On Play add the top deck card to the top of your Life, then look at all your Life, place 1 on top of your deck and the rest back in any order', 'FAQ ST13-004: sides kept; the deck card is face-down', [dd('ST13-004.on-play-life', TB.newgate)], 'lifeToDeckTop and arrangeLife.'),
  c13('ST13-005', OFF, 'Emporio.Ivankov: [Blocker]; On Play you may trash your top or bottom Life card: reveal up to 1 Character cost 5 from hand and add it face-down to the top of your Life', 'No FAQ entry', [bl(TB.ivankov), dd('ST13-005.on-play-life', TB.ivankov)], 'Revealed then face-down.'),
  c13('ST13-006', OFF, 'Curly.Dadan: [Blocker]; On Play play up to 1 each of [Sabo], [Portgas.D.Ace] and [Monkey.D.Luffy] with a cost of 2 from your hand', 'No FAQ entry', [bl(TB.brothers), dd('ST13-006.on-play-play', TB.brothers)], 'Three named plays.'),
  c13('ST13-007', OFF, 'Sabo: Activate Main you may trash this Character: reveal your top Life card; if it is a [Sabo] cost 5 you may play it, then up to 1 Leader +2000 until the end of the next opposing turn', 'No FAQ entry', [dd('ST13-007.activate-main-reveal', TB.brothers)], 'Play from the Life (LIFE_PLAYED).'),
  c13('ST13-008', OFF, 'Sabo: On Play you may trash your top or bottom Life card: K.O. up to 1 opposing Character cost 5 or less', 'No FAQ entry', [dd('ST13-008.on-play-ko', TB.ivankov)], 'Own Life trash cost.'),
  c13('ST13-009', OFF, 'Shanks: On Play you may turn 1 of your face-up Life cards face-down: with 7 or more opposing hand cards trash up to 1 top opposing Life card', 'FAQ ST13-009: any position', [dd('ST13-009.on-play-trash-life', TB.shanks)], 'turnLifeFaceDown.'),
  c13('ST13-010', OFF, 'Portgas.D.Ace: Activate Main you may trash this Character: reveal your top Life card; if it is a [Portgas.D.Ace] cost 5 you may play it, then up to 1 Leader +2000 until the end of the next opposing turn', 'No FAQ entry', [dd('ST13-010.activate-main-reveal', TB.brothers)], 'Play from the Life.'),
  c13('ST13-011', OFF, 'Portgas.D.Ace: On Play with 2 or less Life this Character gains [Rush]', 'FAQ ST13-011: kept after the Life increases', [dd('ST13-011.on-play-rush', TB.ace5)], 'Granted keyword.'),
  c13('ST13-012', OFF, 'Makino: On Play you may add 1 top or bottom Life card to hand: look at all your Life and place them back in any order', 'FAQ ST13-012: sides kept; FAQ ST13-003: not paid when the card goes to the deck', [dd('ST13-012.on-play-arrange', TB.makino)], 'Life cost then arrangeLife.'),
  c13('ST13-013', OFF, 'Monkey.D.Garp: On Play look at 5, reveal up to 1 [Sabo], [Portgas.D.Ace] or [Monkey.D.Luffy] cost 5 or less to hand, the rest at the bottom', 'No FAQ entry', [dd('ST13-013.on-play-search', TB.makino)], 'Search with maxCost.'),
  c13('ST13-014', OFF, 'Monkey.D.Luffy: Activate Main you may trash this Character: reveal your top Life card; if it is a [Monkey.D.Luffy] cost 5 you may play it, then up to 1 Leader +2000 until the end of the next opposing turn', 'No FAQ entry', [dd('ST13-014.activate-main-reveal', TB.brothers)], 'Play from the Life.'),
  c13('ST13-015', OFF, 'Monkey.D.Luffy: Activate Main once per turn +2000 until the start of your next turn; then with 1 or more Life draw 1 and trash your top Life card', 'No FAQ entry', [dd('ST13-015.activate-main-power', TB.ace5)], 'Conditional draw and Life trash.'),
  c13('ST13-017', OFF, 'Flame Dragon King: Counter up to 1 Leader or Character +4000 this battle, then look at all your Life and place them back in any order; Trigger you may add a top or bottom Life card to hand: add up to 1 hand card to the top of your Life', 'FAQ ST13-017: sides kept', [dd('ST13-017.counter+trigger-life', TB.events), ce('ST13-017.counter', TB.events), tr('ST13-017.trigger-life', TB.events)], 'Counter Event and Life swap.'),
  c13('ST13-018', OFF, 'Gum-Gum Jet Spear: Counter up to 1 Leader or Character +2000 this battle, then with 0 Life draw 1; Trigger Life swap', 'No FAQ entry', [dd('ST13-018.counter+trigger-life', TB.events), ce('ST13-018.counter', TB.events), tr('ST13-018.trigger-life', TB.events)], 'Counter Event and Life swap.'),
  c13('ST13-019', OFF, "The Three Brothers' Bond: Main look at 5, reveal up to 1 brother cost 5 or less to hand, the rest at the bottom; Trigger activate this card's Main", 'No FAQ entry', [dd('ST13-019.main-search+trigger-main', TB.makino), tr('ST13-019.trigger-main', TB.makino)], 'Search.'),
]
CERTIFICATIONS.push(...ST13_CERTIFICATIONS)
const RV = {
  leader: ['M6 ST-35 Leader Sabo has -1000 with 4 or more Life and, with a DON!! and a Character of cost 8 or more, gives itself and every Character +1000'],
  mill: ['M6 ST-35 Belo Betty trashes 2 deck cards when attacking for -2 cost; Karasu trashes 2 so that a 7 or more card opponent trashes 1 of its choice'],
  cost: ['M6 ST-35 Morley, Koala and P-105 Sabo gain cost with a Revolutionary Army Leader; Koala puts a trash card at the bottom of the deck to give a DON!!; P-105 has [Blocker] and adds a Life card to give a DON!!'],
  fist: ['M6 ST-35 Hair Removal Fist gives +2000 and +2000 more with a Revolutionary Army Character of cost 8 or more; its Trigger draws 1 and trashes the top deck card'],
  guard: ['M6 ST-35 Ivankov trashes itself instead of a Revolutionary Army Character being K.O.d by an opposing effect; Dragon takes -2000 instead of one being removed, once per turn'],
  ace: ['M6 ST-35 But Ace Here Said You Deserved It!! rests 4 DON!! for -3000 then K.O.s a 3000 power or less; as Counter the Leader gains +3000'],
  plays: ['M6 ST-35 Hack has [Blocker] and K.O.s a base power 2000 or less on play; Lindbergh gives -3000; Koala and Kuma give a DON!! to the Leader then play a Revolutionary Army Character of 4000 power or less from hand or trash'],
}
const c35 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569035', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST35_CERTIFICATIONS: Certification[] = [
  c35('OP13-004', OFF, 'Leader Sabo, Life 5: -1000 with 4 or more Life; [DON!! x1] with a Character of cost 8 or more, your Leader and all your Characters +1000', 'No FAQ entry', [dd('OP13-004.life-penalty+cost-8-aura', RV.leader)], 'Continuous self penalty and aura.'),
  c35('OP12-090', OFF, 'Belo Betty: When Attacking you may trash 2 top deck cards: up to 1 opposing Character -2 cost this turn', 'No FAQ entry', [dd('OP12-090.when-attacking-cost', RV.mill)], 'Deck trash cost (DECK_AT_LEAST).'),
  c35('OP12-093', OFF, 'Morley: +4 cost with a {Revolutionary Army} Leader', 'No FAQ entry', [dd('OP12-093.self-cost', RV.cost)], 'Leader-type cost.'),
  c35('OP12-098', OFF, 'Hair Removal Fist: Counter up to 1 Leader or Character +2000 this battle, then +2000 more with a {Revolutionary Army} Character cost 8 or more; Trigger draw 1 and trash the top deck card', 'No FAQ entry', [dd('OP12-098.counter+trigger-draw', RV.fist), ce('OP12-098.counter', RV.fist), tr('OP12-098.trigger-draw', RV.fist)], 'Typed count condition.'),
  c35('OP13-005', OFF, 'Inazuma: On Play give up to 1 rested DON!! to your Leader', 'No FAQ entry', [dd('OP13-005.on-play-don', RV.cost)], 'Leader DON!!.'),
  c35('OP13-008', OFF, "Emporio.Ivankov: if your {Revolutionary Army} Character would be K.O.d by your opponent's effect, you may trash this Character instead", 'No FAQ entry', [dd('OP13-008.guard-trash', RV.guard)], 'GUARD TRASH_SOURCE.'),
  c35('OP13-017', OFF, "Monkey.D.Dragon: once per turn, if your {Revolutionary Army} Character would be removed by your opponent's effect, you may give this Character -2000 this turn instead", 'No FAQ entry', [dd('OP13-017.guard-power', RV.guard)], 'GUARD POWER_SOURCE_THIS_TURN.'),
  c35('OP13-019', OFF, 'But Ace Here Said You Deserved It!!: Main you may rest 4 DON!!: up to 1 opposing Character -3000 this turn, then K.O. up to 1 with 3000 power or less; Counter your Leader +3000 this battle', 'No FAQ entry', [dd('OP13-019.main-power-ko+counter', RV.ace), ce('OP13-019.counter', RV.ace)], 'REST_DON 4 cost; Main and Counter.'),
  c35('OP13-081', OFF, 'Koala: +3 cost with a {Revolutionary Army} Leader; Activate Main once per turn you may place 1 trash card at the bottom of your deck: give up to 1 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('OP13-081.activate-main-don+self-cost', RV.cost)], 'Trash to deck bottom cost.'),
  c35('P-105', OFF, 'Sabo: with a {Revolutionary Army} Leader [Blocker] and +4 cost; On Play you may add a top or bottom Life card to hand: give up to 1 rested DON!! to your Leader or 1 Character', 'No FAQ entry', [dd('P-105.on-play-don+self-cost+conditional-blocker', RV.cost)], 'Conditional [Blocker] (leaderHasTrait).'),
  c35('ST35-001', OFF, 'Hack: [Blocker]; On Play K.O. up to 1 opposing Character with 2000 base power or less', 'No FAQ entry', [bl(RV.plays), dd('ST35-001.on-play-ko', RV.plays)], 'Base power K.O.'),
  c35('ST35-002', OFF, 'Lindbergh: On Play up to 1 opposing Character -3000 this turn', 'No FAQ entry', [dd('ST35-002.on-play-power', RV.plays)], 'Power.'),
  c35('ST35-003', OFF, 'Karasu: When Attacking you may trash 2 top deck cards: with 7 or more opposing hand cards your opponent trashes 1', 'FAQ ST35-003: the opponent chooses; with 6 or less nothing more', [dd('ST35-003.when-attacking-discard', RV.mill)], 'Opponent hand trash.'),
  c35('ST35-004', OFF, 'Koala: [Blocker] and +1 cost; On Play give up to 1 rested DON!! to your Leader, then play up to 1 {Revolutionary Army} Character with 4000 power or less from hand or trash', 'No FAQ entry', [bl(RV.plays), dd('ST35-004.on-play-don-play+self-cost', RV.plays)], 'Hand or trash play.'),
  c35('ST35-005', OFF, 'Bartholomew Kuma: +3 cost; On Play give up to 1 rested DON!! to your Leader, then play up to 1 {Revolutionary Army} Character with 4000 power or less from hand or trash', 'No FAQ entry', [dd('ST35-005.on-play-don-play+self-cost', RV.plays)], 'Hand or trash play.'),
]
CERTIFICATIONS.push(...ST35_CERTIFICATIONS)
const LA = {
  leader: ['M6 FAQ ST30-001: Leader Luffy & Ace has -2000 with a Character of 7000 base power or more and gives Ace and Luffy cards +3000 on the opponent turn, not itself'],
  search: ['M6 FAQ ST30-002: Inazuma and the Event look at 5 for a Character of exactly 6000 power; Newgate gives Characters of exactly 6000 base power +1000 on your turn'],
  reveal: ['M6 FAQ ST30-004: Ivankov reveals 2 Characters of exactly 6000 power to draw 3 and trash 2; Jinbe trashes one to draw 2'],
  rush: ['M6 FAQ ST30-007: Ace and Luffy rest an active DON!! on play for [Rush]; Ace gives -1000 and Luffy rests a [Blocker] when attacking'],
  guard: ['M6 FAQ ST30-009: LittleOars trashes itself and draws 1, Buggy rests itself, instead of a Character of exactly 6000 base power being removed by an opposing effect'],
  marco: ['M6 ST-30 Marco trashes a 6000 power Character on K.O. to come back rested; Crocodile keeps an opposing rested Character rested in its next Refresh Phase'],
  mr3: ['M6 FAQ ST30-014: Mr.3 rests itself to give up to 2 rested DON!! each to up to 2 different Characters of exactly 6000 base power'],
  counters: ['M6 FAQ ST30-015: the Whitebeard Counter gives +4000 with 2 Characters of exactly 6000 base power; the Luffy Counter gives +3000 and draws with both a 6000 Ace and Luffy'],
}
const c30 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569030', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST30_CERTIFICATIONS: Certification[] = [
  c30('ST30-001', OFF, 'Leader Luffy & Ace, Life 4: -2000 with a Character of 7000 base power or more; [Opponent\'s Turn] all your [Portgas.D.Ace] and [Monkey.D.Luffy] cards +3000', 'FAQ ST30-001: not with no Character; not this Leader', [dd('ST30-001.big-character-penalty+opponent-turn-aura', LA.leader)], 'Named aura.'),
  c30('ST30-002', OFF, 'Inazuma: On Play look at 5, reveal up to 1 Character with 6000 power to hand, the rest at the bottom', 'FAQ ST30-002: exactly 6000', [dd('ST30-002.on-play-search', LA.search)], 'Exact power search.'),
  c30('ST30-003', OFF, 'Edward.Newgate: [Your Turn] all your Characters with 6000 base power +1000', 'FAQ ST30-003: exactly 6000', [dd('ST30-003.your-turn-aura', LA.search)], 'Base power aura.'),
  c30('ST30-004', OFF, 'Emporio.Ivankov: On Play you may reveal 2 Characters with 6000 power from your hand: draw 3 and trash 2', 'FAQ ST30-004: exactly 6000', [dd('ST30-004.on-play-draw', LA.reveal)], 'Reveal cost.'),
  c30('ST30-006', OFF, 'Jinbe: On Play you may trash 1 Character with 6000 power from your hand: draw 2', 'FAQ ST30-006: exactly 6000', [dd('ST30-006.on-play-draw', LA.reveal)], 'Hand cost.'),
  c30('ST30-007', OFF, 'Portgas.D.Ace: On Play you may rest 1 DON!!: [Rush] this turn; When Attacking up to 1 opposing Character -1000 this turn', 'FAQ ST30-007: an active DON!! is needed when it resolves', [dd('ST30-007.on-play-rush+when-attacking-power', LA.rush)], 'DON!! rest cost.'),
  c30('ST30-008', OFF, 'Marco: [Blocker]; On K.O. you may trash 1 Character with 6000 power from your hand: play this Character from your trash rested', 'FAQ ST30-008: exactly 6000', [bl(LA.marco), dd('ST30-008.on-ko-replay', LA.marco)], 'Self replay.'),
  c30('ST30-009', OFF, "LittleOars Jr.: if your Character with 6000 base power would be removed by your opponent's effect, you may trash this Character and draw 1 instead", 'FAQ ST30-009: exactly 6000', [dd('ST30-009.guard-trash-draw', LA.guard)], 'GUARD TRASH_SOURCE_DRAW.'),
  c30('ST30-010', OFF, "Crocodile: [Blocker]; On Play up to 1 opposing rested Character will not become active in your opponent's next Refresh Phase", 'No FAQ entry', [bl(LA.marco), dd('ST30-010.on-play-lock', LA.marco)], 'lockRefresh.'),
  c30('ST30-011', OFF, "Buggy: if your Character with 6000 base power would be removed by your opponent's effect, you may rest this Character instead; [Blocker]", 'FAQ ST30-011: exactly 6000', [dd('ST30-011.guard-rest', LA.guard), bl(LA.guard)], 'GUARD REST_SOURCE.'),
  c30('ST30-012', OFF, 'Monkey.D.Luffy: On Play you may rest 1 DON!!: [Rush] this turn; When Attacking rest up to 1 opposing [Blocker] Character', 'FAQ ST30-012: an active DON!! is needed when it resolves', [dd('ST30-012.on-play-rush+when-attacking-rest', LA.rush)], 'hasBlocker filter.'),
  c30('ST30-013', M5, 'Mr.2.Bon.Kurei(Bentham): no ability', 'No FAQ entry', [], 'Vanilla Character.', LA.search),
  c30('ST30-014', OFF, 'Mr.3(Galdino): Activate Main you may rest this Character: give up to 2 of your Characters with 6000 base power up to 2 rested DON!! each', 'FAQ ST30-014: exactly 6000', [dd('ST30-014.activate-main-don', LA.mr3)], 'Two distinct targets (excludeBinding).'),
  c30('ST30-015', OFF, 'The Name of This Era Is "Whitebeard"!!: Counter with 2 or more Characters of 6000 base power, up to 1 Leader or Character +4000 this battle; Trigger K.O. up to 1 opposing Character with 6000 power or less', 'FAQ ST30-015: exactly 6000', [dd('ST30-015.counter+trigger-ko', LA.counters), ce('ST30-015.counter', LA.counters), tr('ST30-015.trigger-ko', LA.counters)], 'Base power count.'),
  c30('ST30-016', OFF, 'Can You Still Fight, Luffy?! Of Course!!: Counter up to 1 Leader or Character +3000 this battle, then with [Portgas.D.Ace] and [Monkey.D.Luffy] Characters of 6000 base power draw 1', 'FAQ ST30-016: both, exactly 6000', [dd('ST30-016.counter', LA.counters), ce('ST30-016.counter', LA.counters)], 'Named counts.'),
  c30('ST30-017', OFF, "And You Get Yourself in Big Trouble!!: Main look at 5, reveal up to 1 Character with 6000 power to hand, the rest at the bottom; Trigger activate this card's Main", 'FAQ ST30-017: exactly 6000', [dd('ST30-017.main-search+trigger-main', LA.search), tr('ST30-017.trigger-main', LA.search)], 'Exact power search.'),
]
CERTIFICATIONS.push(...ST30_CERTIFICATIONS)
const WN = {
  leader: ['M6 ST-22 Leader Ace & Newgate reveals a Whitebeard Pirates hand card to draw 1 and put it on top of the deck, once per turn'],
  reveal: ['M6 FAQ ST22-003: Newgate (Double Attack) and Jozu reveal the top card and draw it with another on a Whitebeard Pirates type, else it stays face-down on top'],
  oden: ['M6 FAQ ST22-005: Oden trashes 2 hand cards instead of being removed by an opposing effect, never with 1; it rests 3 DON!! and returns another Character to set itself active'],
  squard: ['M6 FAQ ST22-007: Squard reveals the top card to give a rested DON!! on a Whitebeard Pirates type; Marco gains +1000 until the end of the next opposing turn when attacking on a match'],
  marco: ['M6 ST-22 Marco trashes 1 hand card instead of a K.O. by an opposing effect once per turn; Izo trashes itself on the opponent attack to draw 1 and put 1 card at the bottom'],
  whitey: ['M6 ST-22 Whitey Bay reveals 2 Whitebeard Pirates hand cards for +2000 to the Leader on your turn; Izo looks at 5 for a Whitebeard Pirates card other than Izo'],
  iam: ['M6 ST-22 I Am Whitebeard!! plays an Edward.Newgate from hand then may add a Life card for +2000 to the Leader until the end of the next opposing turn'],
  events: ['M6 FAQ ST22-016: the Counter reveals the top card for +4000 on a Whitebeard Pirates type, its Trigger draws 1; Fire Fist reveals 2 to draw 1 then bottoms a cost 5 or less, its Trigger returns a cost 3 or less'],
  plain: ['M6 ST-22 Elmy, Decalvan Brothers, Ace, LittleOars Jr. and A.O. (no ability) and Vista ([Blocker]) keep their printed values'],
}
const c22 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569022', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST22_CERTIFICATIONS: Certification[] = [
  c22('ST22-001', OFF, 'Leader Ace & Newgate, Life 5: Activate Main once per turn you may reveal 1 card with a type including "Whitebeard Pirates" from your hand: draw 1 and place the revealed card on top of your deck', 'No FAQ entry', [dd('ST22-001.activate-main-draw', WN.leader)], 'Reveal cost, card to the deck top.'),
  c22('ST22-002', OFF, "Izo: On Play look at 5 for a card with a type including \"Whitebeard Pirates\" other than [Izo]; On Your Opponent's Attack you may trash this Character: draw 1 and place 1 hand card at the bottom of your deck", 'FAQ ST22-002: not once K.O.d by the [When Attacking] effect', [dd('ST22-002.on-play-search+opponent-attack-draw', [...WN.marco, ...WN.whitey])], 'Self-trash cost.'),
  c22('ST22-003', OFF, 'Edward.Newgate: [Double Attack]; On Play reveal the top card: on a "Whitebeard Pirates" type draw 2', 'FAQ ST22-003: the revealed card is drawn; otherwise it stays face-down on top', [dd('ST22-003.on-play-reveal', WN.reveal)], 'revealDeckTopMatch.'),
  c22('ST22-004', M5, 'Elmy: no ability', 'No FAQ entry', [], 'Vanilla Character.', WN.plain),
  c22('ST22-005', OFF, "Kouzuki Oden: if this Character would be removed by your opponent's effect, you may trash 2 hand cards instead; Activate Main once per turn you may rest 3 DON!! and return 1 other Character to hand: set this Character active", 'FAQ ST22-005: not with only 1 hand card', [dd('ST22-005.activate-main-active+guard-trash-two', WN.oden)], 'GUARD TRASH_HAND count 2.'),
  c22('ST22-006', OFF, 'Jozu: On Play reveal the top card: on a "Whitebeard Pirates" type draw 2 and trash 1', 'FAQ ST22-006', [dd('ST22-006.on-play-reveal', WN.reveal)], 'revealDeckTopMatch.'),
  c22('ST22-007', OFF, 'Squard: Activate Main once per turn reveal the top card: on a "Whitebeard Pirates" type give up to 1 rested DON!! to your Leader or 1 Character', 'FAQ ST22-007', [dd('ST22-007.activate-main-reveal', WN.squard)], 'revealDeckTopMatch.'),
  c22('ST22-008', M5, 'Decalvan Brothers: no ability', 'No FAQ entry', [], 'Vanilla Character.', WN.plain),
  c22('ST22-009', M5, 'Vista: [Blocker]', 'No FAQ entry', [bl(WN.plain)], 'Printed [Blocker] only.'),
  c22('ST22-010', M5, 'Portgas.D.Ace: no ability', 'No FAQ entry', [], 'Vanilla Character.', WN.plain),
  c22('ST22-011', OFF, 'Whitey Bay: [Your Turn] On Play you may reveal 2 "Whitebeard Pirates" type cards from hand: up to 1 "Whitebeard Pirates" type Leader +2000 this turn', 'No FAQ entry', [dd('ST22-011.on-play-power', WN.whitey)], 'Reveal cost.'),
  c22('ST22-012', OFF, "Marco: once per turn if this Character would be K.O.d by your opponent's effect, you may trash 1 hand card instead; When Attacking reveal the top card: on a match +1000 until the end of the next opposing turn", 'FAQ ST22-012', [dd('ST22-012.when-attacking-reveal+guard-trash', [...WN.squard, ...WN.marco])], 'GUARD TRASH_HAND.'),
  c22('ST22-013', M5, 'LittleOars Jr.: no ability', 'No FAQ entry', [], 'Vanilla Character.', WN.plain),
  c22('ST22-014', M5, 'A.O.: no ability', 'No FAQ entry', [], 'Vanilla Character.', WN.plain),
  c22('ST22-015', OFF, 'I Am Whitebeard!!: Main with a "Whitebeard Pirates" type Leader play up to 1 [Edward.Newgate] from hand, then you may add a top or bottom Life card to hand: if you do, up to 1 Leader +2000 until the end of the next opposing turn', 'FAQ EB03-017/OP14-112: the Then part follows the Leader condition', [dd('ST22-015.main-play', WN.iam)], 'Named play and Life cost.'),
  c22('ST22-016', OFF, 'Take That Back!! Take Back What You Said!!: Counter reveal the top card: on a "Whitebeard Pirates" type up to 1 Leader or Character +4000 this battle; Trigger draw 1', 'FAQ ST22-016', [dd('ST22-016.counter+trigger-draw', WN.events), ce('ST22-016.counter', WN.events), tr('ST22-016.trigger-draw', WN.events)], 'Counter reveal.'),
  c22('ST22-017', OFF, 'Fire Fist: Main you may reveal 2 "Whitebeard Pirates" type cards from hand: draw 1, then up to 1 Character cost 5 or less to the bottom of its owner deck; Trigger return up to 1 Character cost 3 or less to hand', 'No FAQ entry', [dd('ST22-017.main-draw-bottom+trigger-bounce', WN.events), tr('ST22-017.trigger-bounce', WN.events)], 'Reveal cost.'),
]
CERTIFICATIONS.push(...ST22_CERTIFICATIONS)
const EG = {
  leader: ['M6 ST-29 Leader Luffy draws 1 and trashes 1 when attacking with 2 or less Life; Usopp rests a Character with a cost up to the opposing Life on play and when attacking'],
  kaku: ['M6 ST-29 Kaku gains +1000 with no more Life than the opponent and K.O.s a cost 3 or less as Trigger; Sanji looks at 4 and its Trigger trashes 1 to play it'],
  triggers: ['M6 ST-29 Jinbe, Nami and Robin are played by their Trigger with a Monkey.D.Luffy Leader; Luffy cost 1 is always played by its Trigger and gives a rested DON!! to a Luffy card once per turn'],
  chopper: ['M6 FAQ ST29-007: Chopper adds a Life card to hand on K.O. to put a hand card on top of the Life, never with 0 Life; its Trigger gives a Luffy card +2000'],
  nami: ['M6 FAQ ST29-008: Nami turns the face-down top Life card face-up instead of an Egghead Character being K.O.d by an opposing effect; not when it is already face-up'],
  lucci: ['M6 FAQ ST29-013: Rob Lucci Trigger K.O.s a Character with a cost up to the total of both Life counts, the triggering card excluded'],
  zoro: ['M6 FAQ ST29-014: Zoro has [Rush: Character] against rested Characters and trashes a Trigger card to draw 1 and give a rested DON!!, once per turn'],
  events: ['M6 FAQ ST29-016: Kizaru gives the Luffy Leader [Unblockable] this turn and +3000 as Counter; Raw Heat Strike and Iai Death Lion Song add their Life-dependent parts'],
  plain: ['M6 ST-29 Stussy and Franky (no ability) and Brook ([Blocker]) keep their printed values'],
}
const c29 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569029', number, revision, detail, faqDetail, abilities, notes, tests)
const playIfLuffy = (number: string, name: string, extra: CertifiedAbility[] = []) => c29(number, OFF, `${name}: Trigger with a [Monkey.D.Luffy] Leader play this card`, 'No FAQ entry', [...extra, dd(`${number}.trigger-play`, EG.triggers), tr(`${number}.trigger-play`, EG.triggers)], 'Leader-name Trigger play.')
export const ST29_CERTIFICATIONS: Certification[] = [
  c29('ST29-001', OFF, 'Leader Monkey.D.Luffy, Life 6: When Attacking with 2 or less Life draw 1 and trash 1', 'No FAQ entry', [dd('ST29-001.when-attacking-draw', EG.leader)], 'Life condition.'),
  c29('ST29-002', OFF, 'Usopp: On Play / When Attacking rest up to 1 opposing Character with a cost up to the opposing Life count', 'No FAQ entry', [dd('ST29-002.on-play-rest+when-attacking-rest', EG.leader)], 'maxCostFromLife.'),
  c29('ST29-003', OFF, 'Kaku: +1000 when your Life count is equal to or less than the opposing one; Trigger K.O. up to 1 opposing Character cost 3 or less', 'No FAQ entry', [dd('ST29-003.trigger-ko+life-power', EG.kaku), tr('ST29-003.trigger-ko', EG.kaku)], 'whenOwnLifeAtMostOpponent.'),
  c29('ST29-004', OFF, 'Sanji: On Play look at 4, reveal up to 1 {Straw Hat Crew} card to hand, the rest at the bottom; Trigger you may trash 1: play this card', 'No FAQ entry', [dd('ST29-004.on-play-search+trigger-play', EG.kaku), tr('ST29-004.trigger-play', EG.kaku)], 'Search and Trigger play.'),
  playIfLuffy('ST29-005', 'Jinbe'),
  c29('ST29-006', M5, 'Stussy: no ability', 'No FAQ entry', [], 'Vanilla Character.', EG.plain),
  c29('ST29-007', OFF, 'Tony Tony.Chopper: On K.O. you may add a top or bottom Life card to hand: add up to 1 hand card to the top of your Life; Trigger up to 1 [Monkey.D.Luffy] card +2000 this turn', 'FAQ ST29-007: not with 0 Life', [dd('ST29-007.on-ko-life+trigger-power', EG.chopper), tr('ST29-007.trigger-power', EG.chopper)], 'Life swap.'),
  c29('ST29-008', OFF, "Nami: if your {Egghead} Character would be K.O.d by your opponent's effect, you may turn your top Life card face-up instead; Trigger with a [Monkey.D.Luffy] Leader play this card", 'FAQ ST29-008: not when the top card is already face-up', [dd('ST29-008.trigger-play+guard-life-face-up', [...EG.nami, ...EG.triggers]), tr('ST29-008.trigger-play', EG.triggers)], 'GUARD TURN_LIFE_FACE_UP.'),
  playIfLuffy('ST29-009', 'Nico Robin: [Blocker];', [bl(EG.triggers)]),
  c29('ST29-010', M5, 'Franky: no ability', 'No FAQ entry', [], 'Vanilla Character.', EG.plain),
  c29('ST29-011', M5, 'Brook: [Blocker]', 'No FAQ entry', [bl(EG.plain)], 'Printed [Blocker] only.'),
  c29('ST29-012', OFF, 'Monkey.D.Luffy: Activate Main once per turn give up to 1 rested DON!! to 1 of your [Monkey.D.Luffy] cards; Trigger play this card', 'No FAQ entry', [dd('ST29-012.activate-main-don+trigger-play', EG.triggers), tr('ST29-012.trigger-play', EG.triggers)], 'Named DON!! target.'),
  c29('ST29-013', OFF, "Rob Lucci: Trigger K.O. up to 1 opposing Character with a cost up to the total of both players' Life cards", 'FAQ ST29-013: the triggering card is not counted', [dd('ST29-013.trigger-ko', EG.lucci), tr('ST29-013.trigger-ko', EG.lucci)], 'maxCostFromLife TOTAL.'),
  c29('ST29-014', OFF, 'Roronoa Zoro: [Rush: Character]; Activate Main once per turn you may trash 1 card with a [Trigger]: draw 1 and give up to 1 rested DON!! to your Leader or 1 Character', 'FAQ ST29-014: rested Characters only', [dd('ST29-014.activate-main-draw', EG.zoro)], 'Printed [Rush: Character].'),
  c29('ST29-015', OFF, 'Raw Heat Strike: Counter up to 1 Leader or Character +2000 this battle, then with 1 or less Life up to 1 opposing Leader or Character -2000 this turn; Trigger draw 1', 'No FAQ entry', [dd('ST29-015.counter+trigger-draw', EG.events), ce('ST29-015.counter', EG.events), tr('ST29-015.trigger-draw', EG.events)], 'Life condition.'),
  c29('ST29-016', OFF, 'Kizaru!! Compared to Two Years Ago We\'re a Hundred Times Stronger Now!!: Main your [Monkey.D.Luffy] Leader gains [Unblockable] this turn; Counter your Leader +3000 this battle', 'FAQ ST29-016: an effect may still change the target', [dd('ST29-016.main-unblockable+counter', EG.events), ce('ST29-016.counter', EG.events)], 'Granted [Unblockable].'),
  c29('ST29-017', OFF, 'Iai Death Lion Song: Counter up to 1 Leader or Character +4000 this battle, then with 2 or less Life K.O. up to 1 opposing Character cost 3 or less; Trigger draw 2 and trash 1', 'No FAQ entry', [dd('ST29-017.counter+trigger-draw', EG.events), ce('ST29-017.counter', EG.events), tr('ST29-017.trigger-draw', EG.events)], 'Life condition.'),
]
CERTIFICATIONS.push(...ST29_CERTIFICATIONS)
const BB = {
  leader: ['M6 FAQ OP09-081: Leader Teach negates your own On Play effects and trashes 1 card to negate the opposing On Play effects until the end of the next opposing turn, not When Attacking'],
  burgess: ['M6 FAQ OP09-086: Jesus Burgess cannot be K.O.d by opposing effects and gains +1000 per 4 trash cards with a Blackbeard Pirates Leader'],
  wolf: ['M6 FAQ ST27-004: Sanjuan.Wolf has [Blocker] and +1 cost per 4 trash cards with a Blackbeard Pirates Leader'],
  activate: ['M6 ST-27 Van Augur and Doc Q rest themselves with a Blackbeard Pirates Leader for -3 cost or a cost 1 or less K.O., and draw 1 on K.O.; Catarina Devon trashes herself for -1 cost without drawing'],
  stronger: ['M6 FAQ OP09-089: Stronger trashes a hand card and itself with a Blackbeard Pirates Leader to draw 1 then give -2 cost; Shiryu trashes 2 to draw 2 when attacking with a DON!!'],
  search: ['M6 ST-27 Laffitte rests a DON!! and itself, Fullalead trashes a card and rests itself, to look for a Blackbeard Pirates card; Avalo Pizarro rests Fullalead for +4000'],
  teach: ['M6 FAQ ST27-005: Teach rests itself to K.O. any Character of cost 3 or less, yours too; on K.O. it returns a black card, itself included, from the trash; Kuzan plays a Blackbeard Pirates cost 5 or less rested from the trash on K.O.'],
  plain: ['M6 ST-27 Vasco Shot ([Blocker]) and Sanjuan.Wolf OP10-084 (no ability) keep their printed values'],
}
const c27 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569027', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST27_CERTIFICATIONS: Certification[] = [
  c27('OP09-081', OFF, "Leader Marshall.D.Teach, Life 5: your [On Play] effects are negated; Activate Main you may trash 1 card: your opponent's [On Play] effects are negated until the end of your opponent's next turn", 'FAQ OP09-081: [When Attacking] effects are not negated; a [Trigger] activating an [On Play] does nothing', [dd('OP09-081.activate-main-negate+negate-own-on-play', BB.leader)], 'Leader rule NEGATE_OWN_ON_PLAY and negateOnPlay.'),
  c27('OP09-083', OFF, 'Van Augur: Activate Main you may rest this Character: with a {Blackbeard Pirates} Leader up to 1 opposing Character -3 cost this turn; On K.O. draw 1', 'No FAQ entry', [dd('OP09-083.activate-main-cost+on-ko-draw', BB.activate)], 'Leader condition.'),
  c27('OP09-086', OFF, "Jesus Burgess: cannot be K.O.d by your opponent's effects; with a {Blackbeard Pirates} Leader +1000 for every 4 cards in your trash", 'FAQ OP09-086: counted continuously', [dd('OP09-086.trash-power+no-opponent-effect-ko', BB.burgess)], 'perTrashCards.'),
  c27('OP09-088', OFF, 'Shiryu: [DON!! x1] When Attacking you may trash 2 cards: draw 2', 'No FAQ entry', [dd('OP09-088.when-attacking-draw', BB.stronger)], 'All or nothing hand cost.'),
  c27('OP09-089', OFF, 'Stronger: Activate Main you may trash 1 card and this Character: with a {Blackbeard Pirates} Leader draw 1, then up to 1 opposing Character -2 cost this turn', 'FAQ OP09-089: the drawn card may be looked at first; FAQ EB03-017/OP14-112: the Then part follows the Leader condition', [dd('OP09-089.activate-main-draw', BB.stronger)], 'Two-part cost.'),
  c27('OP09-090', OFF, 'Doc Q: Activate Main you may rest this Character: with a {Blackbeard Pirates} Leader K.O. up to 1 opposing Character cost 1 or less; On K.O. draw 1', 'No FAQ entry', [dd('OP09-090.activate-main-ko+on-ko-draw', BB.activate)], 'Leader condition.'),
  c27('OP09-091', M5, 'Vasco Shot: [Blocker]', 'No FAQ entry', [bl(BB.plain)], 'Printed [Blocker] only.'),
  c27('OP09-095', OFF, 'Laffitte: Activate Main you may rest 1 DON!! and this Character: look at 5, reveal up to 1 {Blackbeard Pirates} card to hand, the rest at the bottom', 'No FAQ entry', [dd('OP09-095.activate-main-search', BB.search)], 'SEQUENCE cost.'),
  c27('OP09-099', OFF, 'Fullalead: Activate Main you may trash 1 card and rest this Stage: look at 3, reveal up to 1 {Blackbeard Pirates} card to hand, the rest at the bottom', 'No FAQ entry', [dd('OP09-099.activate-main-search', BB.search)], 'Stage two-part cost.'),
  c27('OP10-084', M5, 'Sanjuan.Wolf: no ability', 'No FAQ entry', [], 'Vanilla Character.', BB.plain),
  c27('ST27-001', OFF, 'Avalo Pizarro: Activate Main once per turn you may rest 1 of your [Fullalead] cards: with a {Blackbeard Pirates} Leader +4000 this turn; On K.O. draw 1', 'No FAQ entry', [dd('ST27-001.activate-main-power+on-ko-draw', BB.search)], 'Named Stage cost.'),
  c27('ST27-002', OFF, 'Catarina Devon: Activate Main you may trash this Character: with a {Blackbeard Pirates} Leader up to 1 opposing Character -1 cost this turn; On K.O. draw 1', 'FAQ ST27-002: trashing it is not a K.O.', [dd('ST27-002.activate-main-cost+on-ko-draw', BB.activate)], 'Self-trash cost.'),
  c27('ST27-003', OFF, 'Kuzan: [Blocker]; On K.O. play up to 1 {Blackbeard Pirates} Character cost 5 or less from your trash rested', 'No FAQ entry', [bl(BB.teach), dd('ST27-003.on-ko-play', BB.teach)], 'Trash play.'),
  c27('ST27-004', OFF, 'Sanjuan.Wolf: with a {Blackbeard Pirates} Leader [Blocker] and +1 cost for every 4 trash cards; On Play trash 1 card from your hand', 'FAQ ST27-004: 11 cost or more possible', [dd('ST27-004.on-play-trash+trash-cost+conditional-blocker', [...BB.wolf, ...BB.leader])], 'perTrashCards cost.'),
  c27('ST27-005', OFF, 'Marshall.D.Teach: Activate Main you may rest this Character: K.O. up to 1 Character cost 3 or less; On K.O. add up to 1 black card from your trash to hand', 'FAQ ST27-005: yours too; itself too', [dd('ST27-005.activate-main-ko+on-ko-return', BB.teach)], 'Any side K.O.'),
]
CERTIFICATIONS.push(...ST27_CERTIFICATIONS)
const SN = {
  leader: ['M6 FAQ OP07-019: Leader Bonney rests a DON!! when the opponent attacks to rest an opposing Leader or Character, once per turn, and may wait for a later attack'],
  don: ['M6 ST-24 Urouge and Hawkins set a DON!! active at the end of the turn; Caribou gains +1000 with 6 rested DON!!; Coribou plays a Caribou cost 4 or less rested'],
  barto: ['M6 FAQ OP07-031: Bartolomeo draws 1 and trashes 1 when a Character is rested by your effect on your turn, also by an activation cost; Apoo rests a cost 2 or less'],
  luffy: ['M6 ST-24 Luffy protects your other Characters of cost 3 or less from opposing effect K.O.s with 3 or more Characters; Zoro gains +2000 when attacking with 3 or more Characters'],
  events: ['M6 ST-24 Asura Demon Nine Flash gives +3000 then may rest your cost 3 or more Character to rest an opposing cost 5 or less; More Pizza looks for a Supernovas card; Kid & Killer trashes itself on the opponent attack to set a DON!! active'],
  law: ['M6 FAQ ST24-004: Law & Bepo rests an opposing Character that stays rested in the next Refresh Phase and, with 2 or more opposing rested Characters, gives the Leader +2000 until the end of the next opposing turn; Bege draws 1 and trashes 1 with 6 rested cards'],
}
const c24 = (number: string, revision: string, detail: string, faqDetail: string, abilities: CertifiedAbility[], notes: string, tests: string[] = []) => certO('569024', number, revision, detail, faqDetail, abilities, notes, tests)
export const ST24_CERTIFICATIONS: Certification[] = [
  c24('OP07-019', OFF, "Leader Jewelry Bonney, Life 5: [On Your Opponent's Attack] once per turn you may rest 1 DON!!: rest up to 1 opposing Leader or Character", 'FAQ OP07-019: declining keeps it for a later attack', [dd('OP07-019.opponent-attack-rest', SN.leader)], 'ONCE_PER_TURN_WHEN_CHOSEN.'),
  c24('EB01-015', OFF, 'Scratchmen Apoo: On Play rest up to 1 opposing Character cost 2 or less', 'No FAQ entry', [dd('EB01-015.on-play-rest', SN.barto)], 'Rest.'),
  c24('OP07-021', OFF, 'Urouge: [Blocker]; End of Your Turn set up to 1 DON!! active', 'No FAQ entry', [bl(SN.don), dd('OP07-021.end-of-turn-don', SN.don)], 'End of Your Turn.'),
  c24('OP07-023', OFF, 'Caribou: +1000 with 6 or more rested DON!!; [Blocker]', 'No FAQ entry', [dd('OP07-023.rested-don-power', SN.don), bl(SN.don)], 'minimumRestedDon.'),
  c24('OP07-025', OFF, 'Coribou: On Play play up to 1 [Caribou] cost 4 or less from your hand rested', 'No FAQ entry', [dd('OP07-025.on-play-play', SN.don)], 'Named play.'),
  c24('OP07-031', OFF, 'Bartolomeo: [Blocker]; [Your Turn] once per turn if a Character is rested by your effect, draw 1 and trash 1', 'FAQ OP07-031: also a Character rested to pay an activation cost', [bl(SN.barto), dd('OP07-031.rested-by-effect-draw', SN.barto)], 'ON_CHARACTER_RESTED_BY_OWN_EFFECT.'),
  c24('OP07-033', OFF, "Monkey.D.Luffy: with 3 or more Characters, your Characters cost 3 or less other than [Monkey.D.Luffy] cannot be K.O.d by your opponent's effects", 'No FAQ entry', [dd('OP07-033.aura-no-opponent-effect-ko', SN.luffy)], 'K.O. protection aura.'),
  c24('OP07-034', OFF, 'Roronoa Zoro: When Attacking with 3 or more Characters +2000 this turn', 'No FAQ entry', [dd('OP07-034.when-attacking-power', SN.luffy)], 'Count condition.'),
  c24('OP07-036', OFF, 'Demonic Aura Nine-Sword Style Asura Demon Nine Flash: Main up to 1 Leader or Character +3000 this turn, then you may rest 1 of your Characters cost 3 or more: if you do rest up to 1 opposing Character cost 5 or less; Trigger rest up to 1 opposing Character cost 4 or less', 'No FAQ entry', [dd('OP07-036.main-power-rest+trigger-rest', SN.events), tr('OP07-036.trigger-rest', SN.events)], 'Own rest as a cost.'),
  c24('OP07-037', OFF, 'More Pizza!!: Main look at 5, reveal up to 1 {Supernovas} card other than [More Pizza!!] to hand, the rest at the bottom; Trigger draw 1', 'No FAQ entry', [dd('OP07-037.main-search+trigger-draw', SN.events), tr('OP07-037.trigger-draw', SN.events)], 'Search.'),
  c24('ST24-001', OFF, 'Capone"Gang"Bege: [Blocker]; On Play with 6 or more rested cards draw 1 and trash 1', 'No FAQ entry', [bl(SN.law), dd('ST24-001.on-play-draw', SN.law)], 'OWN_RESTED_CARDS_AT_LEAST.'),
  c24('ST24-002', OFF, "Kid & Killer: On Play look at 5, reveal up to 1 {Supernovas} card to hand, the rest at the bottom; On Your Opponent's Attack you may trash this Character: set up to 1 DON!! active", 'FAQ ST24-002: the DON!! set active may pay Bonney in the same attack; not once K.O.d by the [When Attacking] effect', [dd('ST24-002.on-play-search+opponent-attack-don', SN.events)], 'Self-trash cost.'),
  c24('ST24-003', OFF, 'Basil Hawkins: End of Your Turn set up to 1 DON!! active', 'No FAQ entry', [dd('ST24-003.end-of-turn-don', SN.don)], 'End of Your Turn.'),
  c24('ST24-004', OFF, "Law & Bepo: On Play rest up to 1 opposing Character, it does not become active in the opponent's next Refresh Phase; then with 2 or more opposing rested Characters your Leader +2000 until the end of the next opposing End Phase", 'FAQ ST24-004: also with no active opposing Character', [dd('ST24-004.on-play-rest', SN.law)], 'Rest plus lockRefresh.'),
]
CERTIFICATIONS.push(...ST24_CERTIFICATIONS)

// M7 — cards compiled from their official English text (textCompiler.ts). Only the numbers listed here, reviewed one by one
// against the official card list and the set's FAQ (docs/game/evidence/m6/sources/qa_*.txt), are certified; each is exercised
// by the generic real-game scenarios of tests/game-m7-compiled-cards.test.ts. The certificate is derived from the compiled card,
// so a change of the compiler or of the text changes the certified programs and is caught by those tests.
export const M7_TESTS = {
  abilities: 'M7 compiled abilities run in real games and produce their printed result',
  statics: 'M7 compiled static modifiers and conditional keywords apply with their printed condition',
  printed: 'M7 compiled printed keywords and [Blocker] are carried by the definition',
}
const m7Day = '2026-10-16'
const M7_SERIES: Record<string, string> = { 'OP-17': '569117' }
/** label → number → FAQ note (what the FAQ says about it, or that it has no entry). */
export const M7_REVIEWED: Record<string, Record<string, string>> = {
  'OP-17': {
    'OP17-001': 'FAQ OP17-001: with 0 cards in hand the cost cannot be paid and nothing is given; once per turn only when the cost is paid (FAQ OP17-072)',
    'OP17-002': 'No FAQ entry', 'OP17-009': 'No FAQ entry',
    'OP17-011': 'No FAQ entry', 'OP17-013': 'No FAQ entry', 'OP17-016': 'No FAQ entry', 'OP17-019': 'No FAQ entry', 'OP17-024': 'No FAQ entry',
    'OP17-028': 'No FAQ entry', 'OP17-029': 'No FAQ entry', 'OP17-032': 'No FAQ entry', 'OP17-036': 'No FAQ entry', 'OP17-046': 'No FAQ entry',
    'OP17-059': 'No FAQ entry', 'OP17-064': 'No FAQ entry; once per turn only when the cost is paid (FAQ OP17-072)', 'OP17-071': 'No FAQ entry',
    'OP17-072': 'FAQ OP17-072: declining the effect keeps it available for a later attack of the same turn',
    'OP17-089': 'FAQ OP17-089: +12 cost only while this Character is on the field', 'OP17-107': 'No FAQ entry', 'OP17-108': 'No FAQ entry',
    'OP17-110': 'FAQ OP17-110: this Character itself gains [Rush]; not activated when played during the opponent\'s turn', 'OP17-113': 'No FAQ entry',
  },
}
const m7Ref = (source: string, detail: string): SourceReference => ({ source, checkedAt: m7Day, language: 'en', detail })
export const M7_CERTIFICATIONS: Certification[] = Object.entries(M7_REVIEWED).flatMap(([label, cards]) => Object.entries(cards).map(([number, faqDetail]) => {
  const row = officialRow(label, number), c = compileCardText(row, officialDefinitionId(number))
  if (c.unparsed.length) throw new Error(`M7_REVIEWED_NOT_COMPILED:${number}`)
  const trigger = c.abilities.find(a => a.timing === 'TRIGGER'), counter = c.profile.counterEvent?.abilityId
  const statics = [...c.continuous, ...c.conditionalKeywords].length > 0
  const ids = c.profile.abilityIds ?? []
  const abilities: CertifiedAbility[] = [
    ...(c.profile.blocker ? [bl([M7_TESTS.printed, M7_TESTS.abilities])] : []),
    ...(c.profile.keywords ?? []).map(k => ({ kind: 'keyword' as const, id: k, tests: [M7_TESTS.printed] })),
    ...(ids.length ? [dd(ids.join('+'), [...(c.abilities.length ? [M7_TESTS.abilities] : []), ...(statics ? [M7_TESTS.statics] : [])])] : []),
    ...(trigger ? [tr(trigger.id, [M7_TESTS.abilities])] : []),
    ...(counter ? [ce(counter, [M7_TESTS.abilities])] : []),
  ]
  return { definitionId: officialDefinitionId(number), certifiedAt: m7Day, rulesVersion: '1.2.1' as const, rulesetId: 'MUGIWARA_FREE',
    cardText: m7Ref(`https://en.onepiece-cardgame.com/cardlist/?series=${M7_SERIES[label]}#${number}`, `${row.name}: ${row.effect.replace(/\s+/g, ' ').slice(0, 300)}${row.trigger && row.trigger !== '-' ? ` [Trigger] ${row.trigger}` : ''}`),
    faq: m7Ref(faqUrlFor(number), faqDetail), errata: m7Ref('https://en.onepiece-cardgame.com/rules/errata_card/', 'Errata page checked; no erratum for this card'),
    abilities, tests: [...new Set(abilities.flatMap(a => a.tests))], notes: `Compiled from the official text (templates: ${[...new Set(c.templates)].join(', ')}).` }
}))
CERTIFICATIONS.push(...M7_CERTIFICATIONS)
