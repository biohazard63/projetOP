import type { CardDefinition, SourceReference } from './types'
import type { EffectRegistry } from '../effects/contracts'
import { M5_CARDS, M5_REVISION } from './m5Catalog'
import { M3_ABILITY_CARDS } from './m3Abilities'

// M4-C1 — certification per definition revision. A certification is a separate, explicit record bound to
// one definitionId (number@revision); it is never carried by `review.playabilityStatus`, never inherited by
// a clone and never granted to a whole deck. The historic `playabilityStatus` field stays as laboratory
// metadata and cannot by itself make a card PLAYABLE_VERIFIED.
export type CertifiedAbility = { kind: 'blocker' | 'declarative' | 'giveRestedDon' | 'counterEvent' | 'trigger'; id: string; tests: string[] }
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
// ST09-010 Portgas.D.Ace is not certified: its K.O. replacement (in battle too) is not executable.
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
  if (JSON.stringify(kinds) !== JSON.stringify(c.abilities.map(a => a.kind).sort())) errors.push('ABILITY_SET_MISMATCH')
  // M6: a [Counter] Event is certifiable only through its declared COUNTER program, named and tested in the certificate.
  const counter = definition.review.counterEvent
  if (counter && (counter.kind !== 'DECLARATIVE' || !c.abilities.some(a => a.kind === 'counterEvent' && a.id === counter.abilityId)
    || !registry.definitions.some(d => d.id === counter.abilityId && d.timing === 'COUNTER' && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId))) errors.push('UNCERTIFIED_CAPABILITY')
  if (!definition.review.effects.length && (definition.review.effectOriginal.trim() || definition.review.effectFr.trim())) errors.push('TEXT_WITHOUT_ABILITY')
  for (const e of definition.review.effects) if (e.kind === 'declarative' && e.abilityIds.some(id => !registry.definitions.some(d => d.id === id && d.source.kind === 'CARD_DEFINITION' && d.source.definitionId === definition.definitionId)
    && !registry.continuous?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.conditionalKeywords?.some(d => d.id === id && d.definitionId === definition.definitionId)
    && !registry.koProtections?.some(d => d.id === id && d.definitionId === definition.definitionId))) errors.push('ABILITY_NOT_EXECUTABLE')
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
