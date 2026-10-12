# M2.5 Combat Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing M1.5D/M2 combat path to cover verified combat abilities, Counter Events, Trigger, combat keywords and interruption/recovery without introducing a parallel engine.

**Architecture:** Keep `GameState`, `applyCommand`, `getLegalActions`, `projectState`, `restoreGame`, the M1.5D scheduler, operation pipeline and characteristic evaluator authoritative. Extend the serialized battle context and versioned declarative card metadata/contracts; route only confirmed events through the scheduler and use JSON continuations for private choices.

**Tech Stack:** TypeScript, Node test runner + `tsx`, existing Zod schemas, existing Next.js/Prisma application (no UI/database changes).

**Spec:** `docs/game/M2_5_ROADMAP.md` and the user mission M2.5.

## Global Constraints

- Preserve existing local changes on `maintenance/catalog-rebuild`.
- No UI `/game`, collection, boosters, coins, Prisma/database, scraper, master catalog, user decks, push, deploy, reset, destructive cleanup, or unapproved commit.
- Use official Comprehensive Rules v1.2.1 and official FAQ/card rulings; scraped text alone cannot certify behavior.
- Reject unknown definitions/primitives explicitly; never silently ignore them.
- Keep all private choices and hidden-card identity out of opponent projections/events/errors.
- Do not invent simultaneous replacement / multiple-KO ordering.

## Review Focus

- State restored from old snapshots without later battle fields → compatibility tests per serialized-state task.
- Attacker/target changing zones during a window → no later step proceeds; test per transition task.
- Payment insufficient initially vs interrupted after partial payment vs technical error → distinct outcomes and transaction tests per Counter Event task.
- Life card containing Trigger or hidden card identity → only authorized reveal and correct out-of-zone resolution; projection tests per Trigger task.
- Damage fixed for Double Attack despite intervening Trigger moving source → finish damage count from captured battle context; official FAQ regression test per damage task.

---

### Task 1: Audit baseline and evidence ledger

**Files:** Read M2/M1.5 reports and source; create `docs/game/evidence/m2_5/BASELINE.md` and `docs/game/M2_5_ROADMAP.md`.

- [ ] Run baseline full test, typecheck and lint; record output and branch/worktree status.
- [ ] Map command → battle transition → confirmed event → scheduler paths and known missing timings/operations.
- [ ] Record rules sections/rulings in roadmap; do not change gameplay code in this task.

### Task 2: Serializable combat progression and interruption

**Files:** Modify `cardgame/src/game/core/types.ts`, `core/combat.ts`, `core/game.ts`, `core/invariants.ts`; test `tests/game-m2-5-combat.test.ts`.

- [ ] Add failing tests for attack-step state and attacker/target leaving zones between steps.
- [ ] Add versioned step representation while restoring legacy `BLOCKER` battle snapshots.
- [ ] Route declaration through operation confirmation and scheduler; only transition to Blocker if both presences remain.
- [ ] Test serialization/replay and full suite/type/lint.

### Task 3: Attack/Blocker automatic abilities

**Files:** Modify `cards/types.ts`, `effects/contracts.ts`, `effects/runtime.ts`, `core/combat.ts`; add reviewed fixture definitions and targeted tests.

- [ ] Verify card text and FAQ from Bandai Card List/official PDFs before fixtures.
- [ ] Add versioned declarative combat timing and a safe, bounded operation subset.
- [ ] Capture confirmed attack and Blocker events in M1.5D scheduler and resume through JSON.
- [ ] Test multiple players/cascades only where scheduler rules directly cover them; reject unresolved timing.

### Task 4: Counter Events and payments

**Files:** Modify combat command/action contracts, effects cost schemas/runtime/operations; tests.

- [ ] Test legal/illegal Event Counter from hand and insufficient DON!!.
- [ ] Implement generic Event Counter action with fixed cost; Event enters trash as part of activation and effect resolves using existing runtime.
- [ ] Add DON!! −X only after representing it as versioned alternative cost with exact return source and timing from official rule/card ruling.
- [ ] Persist paid-operation IDs so restore/replay never pays twice; distinguish INITIAL_UNPAYABLE, INTERRUPTED and technical failure.

### Task 5: Trigger and Life resolution

**Files:** Modify `BattleState`, combat commands, state projection/invariants, effect contracts/runtime; tests.

- [ ] Add private choice to activate/refuse only after a battle-damage Life card is identified.
- [ ] Model Trigger card in no zone while resolving, then trash unless effect changes destination.
- [ ] Pause remaining damage while Trigger resolves; resume exact captured damage count, even if the attacker leaves/loses keyword per official Q&A.
- [ ] Test privacy, refusal, successful Trigger, suspended resolution, stale/repeated answer, Life zero defeat check.

### Task 6: Rush, Double Attack, Banish and Unblockable

**Files:** Add reviewed keyword metadata and generic evaluation in card adapter/definitions and combat; tests.

- [ ] Add tests proving Rush vs Rush: Character destination restrictions and ordinary summoning sickness.
- [ ] Capture damage count at Damage Step; process Life items sequentially and resolve Trigger between items according to official rules.
- [ ] Banish sends each affected Life to trash without Trigger; combine with Double Attack without leaking hidden identities.
- [ ] Unblockable suppresses Blocker action only for that battle.

### Task 7: Real inter-series and future-set scenarios

**Files:** Add review-bundle definitions (no master catalog edits), tests and traces under `docs/game/evidence/m2_5/`.

- [ ] Select cards from at least two real product families; verify exact card text, keyword and FAQ.
- [ ] Implement end-to-end scenarios for each supported family, and explicitly mark unsupported requirements for selected cards.
- [ ] Add `TEST-FUTURE-SET` registry fixture using existing primitives without a kernel series branch.
- [ ] Do not mark a card playable if another printed ability is unsupported.

### Task 8: Final validation and reports

**Files:** Create six lot reports, final report, evidence and certification matrix.

- [ ] Run targeted tests and complete suite; record counts and exit codes.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, isolated `npm run build`, `git diff --check`.
- [ ] Review modified/untracked files against explicit scope and preserve prior workspace state.
- [ ] Final verdict PASS only if all acceptance criteria pass; otherwise PARTIAL/BLOCKED with exact gaps.
