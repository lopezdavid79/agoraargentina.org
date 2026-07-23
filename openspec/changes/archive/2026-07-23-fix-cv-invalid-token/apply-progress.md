# Apply Progress: fix-cv-invalid-token

## Summary

Added the missing CSRF hidden input to `views/cv.ejs` to fix the "Token de seguridad inválido" error on CV form submissions.

## Strict TDD Decision

`config.yaml` has `strict_tdd: true`, and a test runner exists (Jest, 69 tests). However, the tasks.md and design.md explicitly decided against RED/GREEN/REFACTOR for this task:

- **No-op delta**: The spec is a pure implementation fix — no behavioral change to specify via tests.
- **No HTTP integration test infrastructure**: The project has no existing CSRF integration test pattern. The existing CV tests (`tests/generar_cv.test.js`) test only pure PDF generation logic, not HTTP request handling.
- **Disproportionate**: Setting up CSRF integration tests (supertest, session setup, token generation, form POST) for a 1-line HTML addition would be disproportionate to the change's risk profile.
- **Design intent**: The design.md explicitly states: "No new automated tests — the change is a one-line HTML addition with no new logic."

### Safety Net (Pre-existing test suite)

| Run | Result | Details |
|-----|--------|---------|
| Before edit | ✅ 69/69 passing | `npm test` — all 9 suites pass |
| After edit | ✅ 69/69 passing | `npm test` — same baseline, no regressions |

The safety net confirms the edit introduced zero regressions to existing behavior.

## Implemented Tasks

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Insert `<input>` in `views/cv.ejs` | ✅ Done | Placed at line 19, right after `<form>` opening tag (line 18), before `<!-- DATOS PERSONALES -->` (line 21). Indentation matches sibling elements (8 spaces). |

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `views/cv.ejs` | Modified | Added `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` at line 19, immediately after the `<form>` opening tag |

## Deviations from Design

None — implementation matches design exactly:
- Hidden input placed after `<form>` opening tag (per Decision #1 in design.md)
- Single line, additive change with zero side effects
- No new tests added (per Decision #2 in design.md)

## Issues Found

None.

## Remaining Tasks

- [ ] 2.1 Run `npm test` to confirm all existing tests still pass
- [ ] 2.2 Open the CV form in-browser and submit to `/cv/generar` — confirm 200 instead of 403
- [ ] 2.3 Click the preview button — confirm `/cv/preview` returns 200 instead of 403

## Workload / PR Boundary

- **Mode**: Single PR — 1 changed line, 400-line budget risk is Low
- **Current work unit**: Phase 1 implementation (task 1.1)
- **Boundary**: Add CSRF hidden input to `views/cv.ejs`
- **Review budget impact**: +1 line addition, negligible
- **Delivery strategy**: Single PR (resolved via `ask-on-risk`, budget risk Low, no chain needed)

## Status

1/4 tasks complete (Phase 1 implementation complete). Ready for verify phase.
