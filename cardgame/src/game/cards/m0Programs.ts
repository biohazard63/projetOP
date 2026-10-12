import type { EffectDefinition } from '../effects/contracts'

// Executable programs for the M0 reviewed ST01-001 Luffy and ST01-007 Nami (spec kind giveRestedDon). Without
// them a 1.3.0 game would offer these [Activate: Main] abilities nowhere. Same semantics as the tested M1.5C
// prototype; FAQ ST-01 (checked 2026-10-10/11): only rested DON!! of the cost area; Nami may target herself.
export const M0_GIVE_DON_PROGRAMS: EffectDefinition[] = (['ST01-001', 'ST01-007'] as const).map(number => ({
  id: `${number}.activate-main-give-rested-don`, revision: '1', dslVersion: '1.3.0',
  source: { kind: 'CARD_DEFINITION', definitionId: `${number}@m0-2026-10-10`, zone: number === 'ST01-001' ? 'leader' : 'characters' },
  timing: 'ACTIVATE_MAIN', condition: { kind: 'ALWAYS' }, cost: { kind: 'NONE' }, usage: { kind: 'ONCE_PER_TURN' }, program: [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_RESTED_DON' }, min: 0, max: 1, optional: true, bind: 'dons', visibility: 'PUBLIC' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_FIELD' }, min: 1, max: 1, optional: false, bind: 'target', visibility: 'PUBLIC', whenBindingNonempty: 'dons' },
    { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'dons', targetBinding: 'target' } },
  ],
}))
