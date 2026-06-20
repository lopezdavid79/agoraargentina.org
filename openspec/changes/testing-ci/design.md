# Design: Testing & CI Infrastructure

## Technical Approach

Add Jest unit tests for login/logout and contact sanitization controllers (mocking Firebase + nodemailer), fix the broken Cypress E2E test (add login + remove hardcoded URL), and create a GitHub Actions workflow for `npm test`. No production code changes — testing and CI only.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| **Firebase mock strategy** | (A) Empty mock `jest.mock('../config/firebase', () => ({}))`  | (A) Simple but useless for chain calls. (B) Chainable stub needed for `login()` flow | (B) Chainable stub |
| | (B) Chainable mock returning `{ collection, where, limit, get }` stubs | | |
| **Cypress login flow** | (A) `cy.session()` + `cy.visit('/login')`  | (A) Cypress 15 API, persists session. (B) Simpler, direct POST to bypass UI | (A) `cy.session()` |
| | (B) `cy.request('POST', '/login', { ... })` | | |
| **nodemailer mock** | (A) Mock entire module  | (A) Clean, matches existing pattern. (B) Over-engineering for one test | (A) `jest.mock('nodemailer', ...)` |
| | (B) Dependency injection | | |
| **Cypress baseUrl** | (A) Create `cypress.config.js`  | No config file exists yet — must create. (A) is the only standard path | (A) `cypress.config.js` |
| | (B) Env variable only | | |
| **CI Cypress scope** | (A) Include now with `cypress run --browser electron`  | (A) Risk of binary issues in CI — deferred per proposal. (B) Unblock immediately | (B) Jest only for now |
| | (B) Defer, jest only | | |

## Data Flow (authController.login test)

```
test setup                     test assertions
──────────                     ───────────────
jest.mock('../config/firebase',
  () => mockChain)  ──→  authController.login(req, res)
                              │
                              ├── db.collection('usuarios')  ←── mockChain
                              │        .where('username', '==', username)
                              │        .limit(1)
                              │        .get()  ←── returns stubSnapshot
                              │
                              ├── snapshot.empty?  ──→ res.status(401).render(...)
                              │
                              ├── bcrypt.compare(password, user.password) ←── real bcrypt
                              │
                              ├── valid?  ──→ req.session.user = { ... }
                              │              res.redirect('/admin/dashboard')
                              │
                              └── not valid?  ──→ res.status(401).render(...)
```

## Mock Chain Pattern (authController)

Must match Firestore chain `.collection().where().limit().get()`:

```js
const mockGet = jest.fn();
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockCollection = jest.fn(() => ({ where: mockWhere }));

jest.mock('../config/firebase', () => mockCollection);
```

Each test sets `mockGet.mockResolvedValue({ empty: ..., docs: [...] })` as needed.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/authController.test.js` | Create | Login (valid/wrong-pass/missing-user/500) + logout tests |
| `tests/mainController.test.js` | Create | `processContacto` sanitization + nodemailer call verification |
| `cypress.config.js` | Create | Set `baseUrl: 'http://localhost:3000'` for relative paths |
| `cypress/e2e/flujo_completo_curso.cy.js` | Modify | Add `cy.session()` login step, replace hardcoded URL with `/admin/cursos/nuevo` |
| `.github/workflows/test.yml` | Create | CI: push/PR on main → Node 18, `npm ci`, `npm test` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `authController.login` — 4 scenarios | Chainable Firestore mock, fake req/res objects (same pattern as `authMiddleware.test.js`) |
| Unit | `authController.logout` — session destroy | Verify `req.session.destroy` called, `res.redirect('/login')` |
| Unit | `mainController.processContacto` — sanitization + email | Mock nodemailer, verify `sendMail` receives sanitized HTML (no tags) |
| E2E | Full admin course creation flow | Cypress `cy.session()` login, relative URL navigation |

## Open Questions

- [ ] Test credentials for Cypress: use existing admin account in `.env` or create a dedicated test user? (Proposal defers to env vars — confirm with team)

### Next Step
Ready for tasks (sdd-tasks).
