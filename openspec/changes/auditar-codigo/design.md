# Design: Auditoría de Código — Phase 0 (Diagnóstico 503 deploy)

## Technical Approach

Phase 0 adds deployment diagnostics without modifying existing behavior. A startup validation module runs before `app.listen()`, checking all required env vars and exiting with code 1 on failure. A health endpoint is added directly in `app.js` (before routers, no auth). The 404 handler is updated to render `views/error.ejs` (following the existing header/footer partial pattern) and a proper Express 4-arg error middleware is added. `package.json` test script is fixed to run Jest; a CI workflow is created.

## Architecture Decisions

### Decision 1: Health endpoint placement

| Option | Tradeoff |
|--------|----------|
| Inline route in app.js before router mounting | Simple, direct, zero overhead. No separate file needed for 4 lines. |
| Dedicated route + controller file | Over-engineering for a single diagnostic endpoint. |
| Add to existing mainRouter | Would inherit middleware chain — unnecessary complexity. |

**Choice**: Inline `GET /health` in `app.js` before all `app.use('/', ...)` route mounting.

**Rationale**: Health checks should be available even if downstream routers fail. Single route, no controller logic, no dependencies.

### Decision 2: Startup validation module

| Option | Tradeoff |
|--------|----------|
| Inline env checks in app.js before `listen()` | Quick but clutters the entry point with 20+ lines of validation. |
| Extract to `config/validateEnv.js` | Testable independently, clean separation, follows existing `config/` pattern. |

**Choice**: `config/validateEnv.js` — exported function that takes no args, returns void, calls `process.exit(1)` on failure.

**Rationale**: `config/firebase.js` already establishes this directory pattern. The validation is testable as a unit. `app.js` stays readable.

### Decision 3: Error view rendering for 404 and 500

| Option | Tradeoff |
|--------|----------|
| `res.status(404).redirect('/')` (current) | Silent failure — hides errors from user and developer. |
| `res.status(404).render('error', { ... })` | Transparent, diagnostic, follows standard Express convention. |

**Choice**: Render `views/error.ejs` for both 404 (via existing final middleware) and 500 (via new 4-arg error handler). Error view uses `<%- include('partials/header') %>` / `<%- include('partials/footer') %>` pattern.

**Rationale**: Silent redirects mask deployment problems — the 503 deploy issue will stay invisible. Rendering an error page with status code and message enables diagnosis.

### Decision 4: Jest configuration

| Option | Tradeoff |
|--------|----------|
| Package.json `"jest"` key | Shorter, but harder to read for CI config and IDE integration. |
| `jest.config.js` at root | Separation of concerns, standard CI-friendly, auto-detected by Jest. |

**Choice**: `jest.config.js` with `testEnvironment: "node"`, `testMatch: ["**/tests/**/*.test.js"]`, no coverage threshold.

**Rationale**: No jest config exists; creating one prevents ambiguity about test discovery and environment. `testEnvironment: "node"` is required since the tests mock Firebase and don't use JSDOM.

## Data Flow

```
GET /health
  │
  ▼
app.js (route handler, no middleware)
  │
  ▼
res.json({ status, uptime, env })
  │
  ▼
200 OK ──→ cPanel / monitoring tool
```

```
Error flow (any unhandled error in route stack):
  route throws ──→ Express catches ──→ 4-arg error middleware
                                           │
                    res.status(err.status || 500)
                      .render('error', { status, message })
                                           │
                                           ▼
                                    views/error.ejs
                                    (header + error card + footer)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `config/validateEnv.js` | Create | Checks `SESSION_SECRET`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`, `EMAIL_USER`, `EMAIL_PASS`. Logs missing vars. Calls `process.exit(1)` if any missing. |
| `views/error.ejs` | Create | Simple error page using `<%- include('partials/header') %>` / `<%- include('partials/footer') %>`. Shows status code, error message, link to home. Receives `status` (number) and `message` (string) from `res.locals` or render locals. |
| `app.js` | Modify | 5 changes: (1) require `validateEnv` and call before `listen()`, (2) add `GET /health` route before routers, (3) replace 404 redirect with `status(404).render('error', { status: 404, message: 'Página no encontrada' })`, (4) add 4-arg error middleware rendering `error.ejs`, (5) update startup log to `[server] listening on port ${PORT} in ${NODE_ENV} mode`. |
| `package.json` | Modify | Change `scripts.test` from `"echo \"No tests specified\""` to `"jest --runInBand"`. Add `jest` to devDependencies. |
| `jest.config.js` | Create | `testEnvironment: "node"`, `testMatch: ["**/tests/**/*.test.js"]`, `clearMocks: true`. |
| `.github/workflows/test.yml` | Create | CI workflow: checkout → Node 22 → `npm ci` → `npm test`. Triggers on push/PR to main. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `config/validateEnv.js` — warns on missing vars, exits on failure | Jest unit test with env mocking. Test both green path (all vars present, no exit) and red path (missing vars, process.exit called). |
| Unit | Health endpoint returns 200 with correct JSON shape | Supertest + Jest. Assert `status`, `uptime` is number, `env` matches. |
| Unit | Error middleware renders error.ejs with correct status | Supertest + Jest. Trigger 404 on unknown route, assert rendered view and status. |
| Unit | Existing Jest tests pass with new config | Run `npx jest` — verify both `tests/mainController.test.js` and `tests/authController.test.js` pass. |
| Manual | Startup validation blocks `npm start` when `.env` is missing vars | Temporary rename `.env`, run `node app.js`, assert exit code 1 and log output. |
| Manual | `curl /health` returns 200 on running instance | Integration check post-deploy. |

## Migration / Rollout

No migration required. Phase 0 adds only diagnostic and tooling improvements — no existing behavior changes except the 404 handler (which currently does a silent redirect; the new behavior renders an error page). Rollback: `git revert`.

## Open Questions

- [ ] Should `health.ejs` be created for a browser-friendly health page, or is JSON-only sufficient? (Proposal says JSON-only — confirmed.)
- [ ] Does cPanel require a specific port or path pattern for health checks? (No — standard HTTP GET on the app's port is sufficient.)
- [ ] Are `FIREBASE_STORAGE_BUCKET` or other Firebase vars needed at startup, or only when Firestore operations run? (Only the 3 listed FIREBASE_* vars are needed at startup — others are lazy-loaded.)
