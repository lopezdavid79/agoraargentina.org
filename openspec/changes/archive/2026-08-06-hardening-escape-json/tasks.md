# Tasks: Hardening — JSON-in-script escaping

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–330 |
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
| 1 | `jsonScript` helper + 3 template sites + controller contract + 3 test files, `npm test` green | PR 1 | Base: main. Tests-first per `strict_tdd`; single commit = rollback plan. |

## Phase 1: Foundation — `jsonScript` helper (RED → GREEN)

- [x] 1.1 RED — Create `tests/ejsHelpers.test.js`: `jsonScript` scenarios — breakout `</script><script>alert(1)</script>` (no literal, has `\u003c/script\u003e`); U+2028/U+2029 → `\u2028`/`\u2029`; quotes + non-ASCII + nested objects intact; `JSON.parse` round-trips; null / arrays / objects / empty string. Run → fails (module missing).
- [x] 1.2 GREEN — Create `config/ejsHelpers.js`: `jsonScript(value)` = `JSON.stringify` + `replace(/[<>&\u2028\u2029]/g, ch => ESCAPE_MAP[ch])`; `module.exports = { jsonScript }`. Run unit tests → green.

## Phase 2: Integration tests (RED)

- [x] 2.1 RED — `tests/adminController.test.js` editModulo block: seed `grabaciones[].label` with breakout payload; assert response lacks the breakout sequence and contains `\u003c/script\u003e` (assert scoped to payload — template's own `</script>` tags are legit). Run → fails.
- [x] 2.2 RED — Create `tests/informesController.test.js` (mock `../config/firebase` + `express-rate-limit` + `bcryptjs`, require `../app`, loginAsAdmin agent): `GET /admin/informes/editar/:id` — breakout in `clases` (site 2) and `participantes` (site 3) escaped; valid data renders 200; 404 when doc missing; 302 unauth. Run → fails (zero coverage today).

## Phase 3: Core implementation (GREEN)

- [x] 3.1 `app.js` — `require('./config/ejsHelpers')` + `app.locals.jsonScript` after view-engine config (line 19).
- [x] 3.2 `views/admin/capacitaciones/editModulo.ejs:94` — `JSON.stringify(initialGrabaciones)` → `jsonScript(initialGrabaciones)`.
- [x] 3.3 `controller/informesController.js:83` — drop `participantesJSON`; pass `participantes: informe.participantes || []` (array).
- [x] 3.4 `views/admin/informes/form_fields.ejs:268` — `JSON.stringify(...)` → `jsonScript(...)`.
- [x] 3.5 `views/admin/informes/form_fields.ejs:301-303` — guard → `if (d.participantes && d.participantes.length)`; `partData = <%- jsonScript(d.participantes) %>`.
- [x] 3.6 Run `ejsHelpers` + `adminController` + `informesController` tests → all green.

## Phase 4: Verification

- [x] 4.1 Run `npm test` — full suite green (existing 107 + new).
- [x] 4.2 Invariant grep — no bare `JSON.stringify` / raw pre-serialized JSON inside `<script>` in `.ejs`; confirm existing assertions unaffected by escaped output bytes.
