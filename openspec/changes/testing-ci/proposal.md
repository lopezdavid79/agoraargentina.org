# Proposal: Testing & CI Infrastructure

## Intent

Current coverage is minimal (27 unit tests, 1 broken E2E test) with no CI.
This adds controller tests for critical auth and contact flows, fixes the
Cypress E2E test to actually log in before hitting admin routes, and introduces
GitHub Actions to run tests on every push/PR.

## Scope

### In Scope
- Controller tests: `authController` (login success/failure, logout),
  `mainController` (`processContacto` sanitization via mocked nodemailer)
- Fix Cypress `flujo_completo_curso.cy.js`: add login step, remove hardcoded URL
- GitHub Actions workflow: `npm test` on push and PR to `main`

### Out of Scope
- Firebase integration tests (needs test DB — separate change)
- Admin controller tests (coupled to Firebase — needs mocking strategy)
- Additional E2E tests beyond the existing one
- Coverage thresholds, linting, formatting, or type-checking CI steps

## Capabilities

### New Capabilities
None — pure testing and CI infrastructure. No spec-level behavior changes.

### Modified Capabilities
None — no existing capabilities change their requirements.

## Approach

1. **Controller tests**: `jest.mock('../config/firebase')` to stub Firestore.
   Test `authController.login` — valid creds set session, wrong password returns
   401, missing user returns 401, server error returns 500.
   Test `authController.logout` — destroys session, redirects.
   Test `mainController.processContacto` — mocked nodemailer verifies sanitized
   fields reach email body.
2. **Cypress fix**: `cy.visit('/login')`, fill credentials, submit, then navigate
   to `/admin/cursos/nuevo`. Use env vars for credentials.
3. **GitHub Actions**: `.github/workflows/test.yml` — `npm ci`, `npm test` on
   `push`/`pull_request` targeting `main`. Cypress run scoped out for now.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/authController.test.js` | New | Auth login/logout tests |
| `tests/mainController.test.js` | New | Contact form sanitization tests |
| `cypress/e2e/flujo_completo_curso.cy.js` | Modified | Add login step, use relative URL |
| `.github/workflows/test.yml` | New | CI pipeline for unit tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cypress needs browser binary on CI | Medium | Use `cypress run --browser electron` (built-in) or pin `cypress-io/github-action` |
| Test mocks diverge from real Firebase | Low | Deferred integration tests will catch mismatches |

## Rollback Plan

- Delete `.github/workflows/test.yml`
- `git checkout -- cypress/e2e/flujo_completo_curso.cy.js`
- Delete `tests/authController.test.js` and `tests/mainController.test.js`

## Dependencies

- Jest 29 and Cypress 15 (already in `devDependencies`)

## Success Criteria

- [ ] `npm test` passes including new controller tests
- [ ] `npx cypress run --spec cypress/e2e/flujo_completo_curso.cy.js` passes
- [ ] GitHub Actions workflow exists and shows green on push
