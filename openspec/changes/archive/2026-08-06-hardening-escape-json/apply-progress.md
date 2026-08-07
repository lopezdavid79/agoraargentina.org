# Apply Progress — `hardening-escape-json`

- **Date**: 2026-08-06
- **Mode**: Strict TDD (config.yaml `strict_tdd: true`, runner `npm test`)
- **Artifact store**: openspec
- **Delivery**: ask-always — user decided: implement everything first, NO PRs/branches, leave uncommitted for local pass. Work tree on `main`.

## Status

**12/12 tasks complete.** Full suite green: 118 passed (baseline 107 + 11 new), 14 suites.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/ejsHelpers.test.js` | Unit | ✅ 107/107 | ✅ Written (fails: module missing) | ✅ 5/5 pass | ✅ 5 scenarios | ✅ Clean |
| 1.2 | `config/ejsHelpers.js` (GREEN) | Unit | — | — | ✅ 5/5 pass | — | ✅ Clean (ESCAPE_MAP const extracted) |
| 2.1 | `tests/adminController.test.js` (breakout test) | Integration | ✅ 107/107 | ✅ Written (fails: raw payload present) | ✅ after 3.x | ✅ 2 payload shapes (isolated site 1 vs existing sites) | ➖ None needed |
| 2.2 | `tests/informesController.test.js` (new) | Integration | ✅ 107/107 | ✅ Written (2 breakout tests fail, 3 pass) | ✅ after 3.x | ✅ 5 scenarios (302, 404, valid render, clases breakout, participantes breakout) | ➖ None needed |
| 3.1 | `app.js` (wiring) | — | ✅ 107/107 | — | ✅ via route tests | ➖ Single | ✅ Clean |
| 3.2 | `editModulo.ejs:94` | — | — | — | ✅ via adminController breakout | ➖ Single | ➖ None needed |
| 3.3 | `controller/informesController.js:83` | — | — | — | ✅ via informesController tests | ➖ Single | ✅ Clean |
| 3.4 | `form_fields.ejs:268` | — | — | — | ✅ via informesController clases test | ➖ Single | ➖ None needed |
| 3.5 | `form_fields.ejs:301-303` | — | — | — | ✅ via informesController participantes test | ➖ Single | ✅ Clean |
| 3.6 | ejsHelpers + adminController + informesController | — | — | — | ✅ 53/53 | — | — |
| 4.1 | `npm test` (full suite) | — | — | — | ✅ 118/118, 14 suites | — | — |
| 4.2 | Invariant grep | — | — | — | ✅ no `<%- JSON.stringify` / `participantesJSON` in views | — | — |

### Test Summary
- **Total tests written (new)**: 11 (5 unit ejsHelpers + 1 adminController breakout + 5 informesController)
- **Total tests passing**: 118 (was 107)
- **Layers used**: Unit (5), Integration (6)
- **Approval tests**: None — no pure refactoring of existing behavior (site 3 contract changed per spec, covered by new tests)
- **Pure functions created**: 1 (`jsonScript`)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `config/ejsHelpers.js` | Created | `jsonScript(value)` — `JSON.stringify` + escape `< > &` U+2028 U+2029 → `\u003c \u003e \u0026 \u2028 \u2029` (OWASP Rule 3.1); `module.exports = { jsonScript }` |
| `app.js` | Modified | `require('./config/ejsHelpers')` + `app.locals.jsonScript` registered after view-engine config (section 1) |
| `views/admin/capacitaciones/editModulo.ejs:94` | Modified | `JSON.stringify(initialGrabaciones)` → `jsonScript(initialGrabaciones)` (site 1) |
| `views/admin/informes/form_fields.ejs:268` | Modified | `JSON.stringify(...)` → `jsonScript(...)` (site 2, clases) |
| `views/admin/informes/form_fields.ejs:301-303` | Modified | guard `if (d.participantesJSON)` → `if (d.participantes && d.participantes.length)`; `partData = <%- jsonScript(d.participantes) %>` (site 3) |
| `controller/informesController.js:83` | Modified | dropped `participantesJSON: JSON.stringify(...)`; now passes `participantes: informe.participantes \|\| []` (parsed array) |
| `tests/ejsHelpers.test.js` | Created | 5 unit tests for `jsonScript` |
| `tests/adminController.test.js` | Modified | +1 editModulo GET breakout test (site 1) |
| `tests/informesController.test.js` | Created | 5 tests: 302 unauth, 404 missing doc, valid render 200, clases breakout, participantes breakout |
| `openspec/changes/hardening-escape-json/tasks.md` | Updated | all 12 tasks marked `[x]` |
| `openspec/changes/hardening-escape-json/apply-progress.md` | Created | this artifact |

## Deviations from Design

None — implementation matches `design.md` exactly:
- Helper signature `jsonScript(value)` identical to design contract (ESCAPE_MAP + regex).
- `app.locals.jsonScript` wired at end of view-engine section (line ~19-23, right after `app.set('views', ...)`).
- Site 3 controller contract + template guard per design.
- Assertion nuance honored: negative assertions scoped to the breakout payload sequence (`</script><script>alert(1)</script>`), NOT to literal `</script>` in the whole response (templates legitimately contain closing script tags).

## Issues Found

None. Note: `views/cv.ejs`, `createModulos.ejs`, and client-side `syncJSON()` lines still use `JSON.stringify` — all are browser-side writes to hidden inputs (no EJS `<%- %>` injection), so they are out of scope per proposal ("Other template/view cleanup" excluded).

## Workload / PR Boundary

- Mode: single PR (forecast Low, 250–330 lines) — but user chose NOT to open a PR yet; changes left uncommitted on `main` for local pass.
- Current work unit: whole change (single suggested work unit per tasks.md).
- Boundary: full `hardening-escape-json` change implemented and verified.
- Estimated review budget impact: ~145 changed lines (5 modified + 3 new files + 2 SDD artifacts).

## Next Recommended

sdd-verify — run the verification phase (`npm test` re-run + spec/design/task compliance check). No PR until the user completes their local pass.

## Risks

- Stored Firestore payloads remain unescaped (documented limitation — rendering fix only).
- Site 3 contract change: `participantesJSON` removed — any other consumer of that view-data key would break; grep found none (views/ + controllers covered).
- Express 5 + EJS `app.locals` exposure confirmed by integration tests (all 3 sites render escaped output).
