# Apply Progress: grabaciones-multiples-por-modulo

> Phase: apply (sdd-apply) — Status: **success** — 16/16 tasks complete
> Mode: **Strict TDD** (openspec/config.yaml → `strict_tdd: true`, runner `npm test`)
> Artifact store: openspec

## Summary

Implemented additive `grabaciones: string[]` field for capacitación modulo docs with legacy `claseGrabada` fallback, per spec/design/tasks. Write path: `parseGrabaciones` helper (trim, drop empty, cap 10, try/catch → `[]`), wired into `storeModulo` (plus commented `activo: true` gap-fix with BEGIN/END markers) and `updateModulo`. Admin forms (`createModulos.ejs`, `editModulo.ejs`) switched from single `claseGrabada` input to repeatable URL inputs using the hidden-JSON variant (informes `participantes` precedent), vanilla JS, ARIA labels, submit listener. Candidate render (`detail.ejs`) loops `grabaciones`, falls back to `[claseGrabada]`. 10 new tests; full suite 95/95 green (baseline 85).

No commits made (delivery strategy: ask-always → user tests locally before any PR decision; work left uncommitted in the working tree on main).

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/adminController.test.js` | Unit (supertest+mocks) | ✅ 85/85 | ✅ Written | ✅ Passed | ✅ 2 cases (2 URLs; legacy single create) | ➖ None needed |
| 1.2 | `tests/adminController.test.js` | Unit | ✅ 85/85 | ✅ Written | ✅ Passed | ✅ 2 cases (strip+drop; cap-10 with 12 URLs) | ➖ None needed |
| 1.3 | `tests/adminController.test.js` | Unit | ✅ 85/85 | ✅ Written | ✅ Passed | ✅ 3 cases (save array + activo on; removal 3→2 + activo off; 500 error) | ➖ None needed |
| 1.4 | `tests/adminController.test.js` | Unit | ✅ 85/85 | ✅ Written | ✅ Passed | ✅ 2 cases (pre-filled JSON render; 404 not-found) | ➖ None needed |
| 1.5 | `tests/mainController.test.js` | Unit | ✅ 85/85 | ✅ Written | ✅ Passed | ✅ 3 cases (3 links w/ legacy unused; legacy-only 1 link; none → 0 links) | ➖ None needed |
| 2.1–2.3 | (impl via 1.1–1.3) | — | ✅ | — | ✅ Passed | covered by 1.1–1.3 | ✅ Helper extracted to pure function |
| 2.4–2.5 | EJS render verified via 1.4 + ad-hoc render | — | ✅ | — | ✅ Passed | — | ➖ None needed |
| 3.1 | (impl via 1.5) | — | ✅ | — | ✅ Passed | covered by 1.5 | ➖ None needed |
| 4.1 | full suite | — | ✅ | — | ✅ 95/95 | — | — |

Note: task 1.3's task text said `PUT /admin/.../editar/:idModulo`, but the router registers **POST** for `updateModulo` (router/adminRouter.js:76) and the edit form uses POST — tests use POST (see Deviations).

### Test Summary

- **Total tests written**: 10 (7 adminController + 3 mainController; `db` import added to mainController.test.js to support the new describe)
- **Total tests passing**: 95/95 (baseline 85 → +10)
- **Layers used**: Unit (10), Integration (0 new), E2E (0 — Cypress out of scope)
- **Approval tests** (refactoring): 2 — editModulo 404 & updateModulo 500 assert pre-existing behavior; detailCapacitaciones legacy-only and no-recordings cases pass under current code and act as fallback regression guards
- **Pure functions created**: 1 — `parseGrabaciones(body)` in adminController.js

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `controller/adminController.js` | Modified | `parseGrabaciones(body)` helper; `storeModulo` adds `grabaciones` + commented `activo: true` (BEGIN/END activo-gap-fix markers); `updateModulo` adds `grabaciones`, keeps existing `activo` checkbox switch |
| `views/admin/capacitaciones/createModulos.ejs` | Modified | Replaced `claseGrabada` input block with hidden `grabaciones_json` + `#grabaciones-container` + add/remove buttons + inline vanilla JS (design target markup) |
| `views/admin/capacitaciones/editModulo.ejs` | Modified | Same replacement; `grabData` pre-filled from `initialGrabaciones` EJS var |
| `views/capacitaciones/detail.ejs` | Modified | Replaced single `claseGrabada` link with `recordings` loop (grabaciones wins, else `[claseGrabada]`) — design render snippet |
| `tests/adminController.test.js` | Modified | +2 storeModulo tests (grabaciones+activo; strip/cap-10); new updateModulo describe (3 tests); new editModulo describe (2 tests) |
| `tests/mainController.test.js` | Modified | Added `db` require; new detailCapacitaciones describe (3 tests) with Firestore query-chain mock |

## Deviations from Design

1. **`initialGrabaciones` fallback seed in `editModulo.ejs`** (task 2.5). Design said pre-fill `JSON.stringify(modulo.grabaciones || [])`. Implementation seeds from `grabaciones` when non-empty, else `[modulo.claseGrabada]`. Rationale: the new form no longer submits `claseGrabada`, and `updateModulo` writes `claseGrabada: claseGrabada || ""` — editing a legacy-only module would otherwise wipe its recording. With the seed, the legacy URL becomes the first editable grabación and is preserved into `grabaciones` on save (no data loss, no migration). Verified: legacy-only module renders `grabData = ["https://youtube.com/legacy-x"]`.
2. **Route verb in task text vs router** — task 1.3/1.4 named the updateModulo route `PUT`, but the router (router/adminRouter.js:76) and the edit form both use `POST`; tests use POST. No production code deviation; task text corrected in practice.
3. **Test-file infrastructure fix** — `tests/mainController.test.js` had `jest.mock('../config/firebase', ...)` but never imported the module; added `const db = require('../config/firebase')` to enable the new describe.

## Issues Found

- None blocking. Note: `createModulos.ejs` GET render is not covered by a permanent test (only ad-hoc render verification here); browser-level add/remove-input interaction (task 4.2) remains for the user's local manual pass.
- Working tree has unrelated untracked upload artifacts under `public/images/{cursos,noticias}/` — left untouched.

## Remaining Tasks

- None (16/16 complete). Task 4.2's browser-interaction portion is delegated to the user's local testing session per delivery decision.

## Workload / PR Boundary

- Mode: no PR slice (delivery strategy **ask-always**, user decided: implement everything first, no PRs yet)
- Current work unit: N/A — single uncommitted batch on `main`
- Boundary: whole change in working tree; stage only the 6 change-scoped files when committing later
- Estimated review budget impact: **441 changed lines** (+428/−13) — above the 400-line default; if the user later opts for chained PRs, use the tasks.md split (PR 1 write path ~350 lines, PR 2 candidate render ~90 lines)

## Status

16/16 tasks complete. Ready for the user's local manual verification, then sdd-verify.
