# Tasks: Agendar entrevista en la página de inicio

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25 (6 in `views/home.ejs` + ~19 in `tests/routes.test.js`) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | TDD test + EJS CTA implementation | PR 1 | Single PR to main; test + implementation in one commit (strict TDD) |

## Phase 1: RED — Failing Test

- [x] 1.1 Add `describe('GET /')` block to `tests/routes.test.js` (after the 404 handler) using `request(app).get('/')`; assert `res.text` contains the exact paragraph copy, `https://calendar.app.google/mXSH4cQgvakNUyXd8`, `target="_blank"`, `rel="noopener"`, and "Agendar mi entrevista" (spec scenario 1)
- [x] 1.2 Run `npm test` and confirm the new `GET /` test FAILS (RED — it asserts markup that does not exist yet)

## Phase 2: GREEN — Implement CTA in views/home.ejs

- [x] 2.1 Insert after the register button's closing `</a>` (line 24) inside the hero `<div class="col-lg-10">`: `<p class="lead text-dark mt-5 mb-3 fs-5">` containing the exact spec paragraph
- [x] 2.2 Insert immediately after the paragraph: `<a href="https://calendar.app.google/mXSH4cQgvakNUyXd8" class="btn btn-lg btn-outline-secondary rounded-pill px-4 py-2" target="_blank" rel="noopener">Agendar mi entrevista</a>`
- [x] 2.3 Run `npm test` and confirm all tests PASS (GREEN), including CTA rendering when the firebase mock fails (spec scenario 2)

## Phase 3: Verification / Refactor

- [x] 3.1 Confirm no CSS changes needed — `btn-outline-secondary rounded-pill px-4 py-2` matches the subordinate CTA pattern at `home.ejs:67`; `public/css/styles.css` untouched
- [x] 3.2 Final check: full `npm test` suite green; hero renders paragraph then link below the register button, single source of truth for the URL
