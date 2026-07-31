# Apply Progress: Agendar entrevista en la página de inicio

**Change**: `home-agendar-entrevista`
**Mode**: Strict TDD (openspec/config.yaml `strict_tdd: true`, runner `jest`, command `npm test`)
**Batch**: 1 (only batch — all 7 tasks completed)
**Date**: 2026-07-31
**Previous progress**: None found (fresh artifact)

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/routes.test.js` | Integration (supertest + mocked firebase) | ✅ 12 suites / 83 tests | ✅ Written (2 tests) | N/A (RED phase) | N/A (RED phase) | N/A (RED phase) |
| 1.2 | `tests/routes.test.js` | Integration | ✅ 12/12 suites, 83/83 | ✅ Confirmed: `2 failed, 5 passed` in `routes.test.js` | N/A | N/A | N/A |
| 2.1 | `tests/routes.test.js` | Integration | ✅ Baseline intact | N/A (GREEN phase) | ✅ `7 passed` in `routes.test.js` | N/A (covered by 2.3) | N/A |
| 2.2 | `tests/routes.test.js` | Integration | ✅ Baseline intact | N/A (GREEN phase) | ✅ Same run as 2.1 | N/A (covered by 2.3) | N/A |
| 2.3 | `tests/routes.test.js` | Integration | ✅ Baseline intact | N/A | ✅ Full `npm test`: 12 suites / 85 tests | ✅ 2 cases (spec scenario 1 + scenario 2 firebase-failure path) | ➖ None needed |
| 3.1 | — | — | — | — | — | — | ✅ Confirmed no CSS change; class list matches `home.ejs:74` (`btn btn-lg btn-outline-secondary rounded-pill px-4 py-2`); `public/css/styles.css` untouched |
| 3.2 | — | — | — | — | — | — | ✅ Final full suite `npm test` GREEN: 12 suites / 85 tests |

### Test Summary
- **Total tests written**: 2 (both in `tests/routes.test.js`, `describe('GET /')`)
- **Total tests passing**: 85 (83 pre-existing + 2 new)
- **Layers used**: Integration (2)
- **Approval tests** (refactoring): None — no refactoring tasks
- **Pure functions created**: 0 — static EJS markup, no logic

## Completed Tasks

- [x] 1.1 Add `describe('GET /')` block to `tests/routes.test.js` (after the 404 handler) using `request(app).get('/')`; assert `res.text` contains the exact paragraph copy, `https://calendar.app.google/mXSH4cQgvakNUyXd8`, `target="_blank"`, `rel="noopener"`, and "Agendar mi entrevista" (spec scenario 1)
- [x] 1.2 Run `npm test` and confirm the new `GET /` test FAILS (RED — it asserts markup that does not exist yet)
- [x] 2.1 Insert after the register button's closing `</a>` (line 24) inside the hero `<div class="col-lg-10">`: `<p class="lead text-dark mt-5 mb-3 fs-5">` containing the exact spec paragraph
- [x] 2.2 Insert immediately after the paragraph: `<a href="https://calendar.app.google/mXSH4cQgvakNUyXd8" class="btn btn-lg btn-outline-secondary rounded-pill px-4 py-2" target="_blank" rel="noopener">Agendar mi entrevista</a>`
- [x] 2.3 Run `npm test` and confirm all tests PASS (GREEN), including CTA rendering when the firebase mock fails (spec scenario 2)
- [x] 3.1 Confirm no CSS changes needed — `btn-outline-secondary rounded-pill px-4 py-2` matches the subordinate CTA pattern at `home.ejs:67`; `public/css/styles.css` untouched
- [x] 3.2 Final check: full `npm test` suite green; hero renders paragraph then link below the register button, single source of truth for the URL

**Status**: 7/7 tasks complete. Ready for verify.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `tests/routes.test.js` | Modified | Added `describe('GET /')` after the 404 handler with 2 tests: (1) CTA renders paragraph copy, calendar URL, `target="_blank" rel="noopener"`, and "Agendar mi entrevista"; (2) CTA still renders when the firebase mock fails (`No hay noticias disponibles` empty state) — spec scenario 2 |
| `views/home.ejs` | Modified | Inserted `<p class="lead text-dark mt-5 mb-3 fs-5">` (exact spec copy) + `<a href="https://calendar.app.google/mXSH4cQgvakNUyXd8" class="btn btn-lg btn-outline-secondary rounded-pill px-4 py-2" target="_blank" rel="noopener">Agendar mi entrevista</a>` after the register button (lines 25-31) inside hero `div.col-lg-10` |
| `openspec/changes/home-agendar-entrevista/tasks.md` | Modified | All 7 tasks marked `[x]` |
| `openspec/changes/home-agendar-entrevista/apply-progress.md` | Created | This artifact |

## Deviations from Design

None — implementation matches `design.md` (paragraph classes `lead text-dark mt-5 mb-3 fs-5`, link classes `btn btn-lg btn-outline-secondary rounded-pill px-4 py-2`, attributes `target="_blank" rel="noopener"`, inserted after register `</a>` inside `col-lg-10`).

Notes (non-deviations):
- The register link's missing `rel` attribute was left untouched (out of scope, per task instructions).
- `target="_blank"` alone already exists on the register link (line 23), so the new test asserts the contiguous `target="_blank" rel="noopener"` pair — this binds the assertion to the NEW link only and guarantees a genuine RED (verified: `noopener` appears in no file rendered by the homepage).
- Tests: 2 tests (triangulation: spec scenario 1 happy path + spec scenario 2 firebase-failure path). No CSS class assertions used — all assertions are user-visible text/URL/attribute behavior.

## Issues Found

None.

## Workload / PR Boundary

- Mode: single PR (forecast Low, ~25 lines, `Decision needed before apply: No`)
- Current work unit: 1 (TDD test + EJS CTA implementation) — per tasks.md suggested work units
- Boundary: full change (all 7 tasks), no chaining needed
- Estimated review budget impact: ~25 changed lines (6 in `views/home.ejs` + ~19 in `tests/routes.test.js`)

## Commit Status

NOT committed. The sdd-apply skill defines no commit step (Step 5 = mark tasks, Step 6 = persist progress). Work-tree changes ready: `views/home.ejs` and `tests/routes.test.js` (plus openspec artifacts). The working tree contains many unrelated untracked/modified files (images, `docs/carta_presentación.md`, `coverage/`, `scripts/migrate-images.js`) — a future commit must stage ONLY this change's files.
