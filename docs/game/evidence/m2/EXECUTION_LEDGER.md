# M2 execution ledger

- 2026-10-11: M2 roadmap and single plan approved by the user (`ok je valide`).
- Baseline: 234/234 tests passed before implementation; see `m2-baseline-tests.log`.
- Preservation: repository contains pre-existing untracked M0–M1.5 sources/tests and user assets; `cardgame/src/game` plus `game-m1-5d.test.ts` snapshotted to `/private/tmp/mugiwara-m2-original/` before product edits.
- Workspace decision: execute in place to preserve the existing local engine and avoid copying over pre-existing work. No Git staging, push, deploy, DB operation, or server action.

## M2A

- Status: PARTIAL — serializable battle, legal attacks, Character KO, current power compare; Leader damage also integrated later.
- TDD: 8 M2 tests were added before/alongside implementation; see `tests/game-m2a.test.ts`.
- Tests/type/lint: final complete suite 242/242 PASS; TypeScript PASS; lint 0 errors/99 existing warnings.

## M2B

- Status: PARTIAL — Blocker and Counter Character only; Counter Events and payment costs absent.

## M2C

- Status: PARTIAL — simple Life damage and decisive damage at zero Life; Trigger, Banish and Double Attack absent.

## M2D

- Status: PARTIAL — one synthetic M1.5D ON_KO battle continuation; no complete multi-series real-card combat certification.
- Isolated production build: PASS after a sandbox DNS failure fetching Google Fonts; see `m2-final-build.md`.
