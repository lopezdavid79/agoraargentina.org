# Tasks: Testing & CI Infrastructure

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 (5 files: 3 new, 1 modified, 1 CI) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Controller Tests (TDD — RED / GREEN)

- [x] 1.1 RED: Write test — `authController.login` with valid credentials sets `session.user` and redirects
- [x] 1.2 GREEN: Implement chainable Firestore mock + login scenario passes
- [x] 1.3 RED: Write test — `authController.login` with wrong password returns 401
- [x] 1.4 GREEN: Invalid credentials path branches correctly
- [x] 1.5 RED: Write test — `authController.login` with missing user returns 401
- [x] 1.6 GREEN: Missing-user path renders login with error
- [x] 1.7 RED: Write test — `authController.login` on Firestore error returns 500
- [x] 1.8 GREEN: Error path handled via catch
- [x] 1.9 RED: Write test — `authController.logout` destroys session and redirects to `/login`
- [x] 1.10 GREEN: `req.session.destroy()` callback invoked
- [x] 1.11 RED: Write test — `mainController.processContacto` sanitizes HTML tags in fields
- [x] 1.12 GREEN: Mock nodemailer, verify `sendMail` receives stripped HTML

## Phase 2: Cypress Fix

- [x] 2.1 Create `cypress.config.js` with `baseUrl: 'http://localhost:3000'`
- [x] 2.2 Modify `flujo_completo_curso.cy.js`: add `cy.session()` login before admin routes, replace hardcoded URL with `/admin/cursos/nuevo`

## Phase 3: CI

- [x] 3.1 Create `.github/workflows/test.yml`: Node 18, `npm ci`, `npm test` on push/PR to `main`

## Phase 4: Verification

- [x] 4.1 Run `npm test` — 28 tests pass (existing 19 + 9 new controller tests)
- [ ] 4.2 Run `npx cypress run --spec cypress/e2e/flujo_completo_curso.cy.js` — E2E passes (requires running server; cannot run in CI without server)
