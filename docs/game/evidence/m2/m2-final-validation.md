# M2 validation evidence

Commands freshly rerun from `cardgame/` during final validation on 2026-10-11:

- `npm test` — exit 0, 242 tests passed, 0 failed. Full TAP output: `m2-final-tests.log`.
- `npx tsc --noEmit` — exit 0, no diagnostics. `m2-final-typecheck.log` is empty by design.
- `npm run lint` — exit 0, 0 errors and 99 warnings. Full output: `m2-final-lint.log`.

The isolated production build was rerun from a clean temporary copy and exited 0; see `m2-final-build.md`. `git diff --check` also exited 0. Git status remains on `maintenance/catalog-rebuild`; no changes were staged. Existing user/worktree changes remain uncommitted and were preserved.
