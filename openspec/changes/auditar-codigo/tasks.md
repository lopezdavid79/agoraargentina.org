# Tasks: Auditoría de Código — Phase 0 (Diagnóstico 503 deploy)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~30 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 0: Diagnóstico 503 deploy

### 0.1 Startup validation

- [x] 0.1 Create `config/validateEnv.js` — export `validateEnv()` that checks `SESSION_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `EMAIL_USER`, `EMAIL_PASS`. Log each missing var via `console.error`, exit code 1 if any missing.
- [x] 0.2 Modify `app.js` — add `const { validateEnv } = require('./config/validateEnv')` at top; call `validateEnv()` before `app.listen()`.

### 0.2 Health endpoint

- [x] 0.3 Modify `app.js` — add `GET /health` route before all router mounts. No auth. Returns `res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV || "development" })`.

### 0.3 Error view & error handling

- [x] 0.4 Create `views/error.ejs` — uses `<%- include('partials/header') %>` / `<%- include('partials/footer') %>`. Receives `status` (number) and `message` (string). Shows error card with status, message, link to home.
- [x] 0.5 Modify `app.js` — replace 404 handler `res.redirect('/')` with `res.status(404).render('error', { status: 404, message: 'Página no encontrada' })`.
- [x] 0.6 Modify `app.js` — add 4-arg Express error middleware after 404 handler: `app.use((err, req, res, next) => { res.status(err.status || 500).render('error', { ... }) })`.

### 0.4 Startup logging

- [x] 0.7 Modify `app.js` — update `app.listen` callback to log ``[server] listening on port ${PORT} in ${process.env.NODE_ENV || "development"} mode``.

### 0.5 CI & testing infrastructure

- [x] 0.8 Create `jest.config.js` — `testEnvironment: "node"`, `testMatch: ["**/tests/**/*.test.js"]`, `clearMocks: true`.
- [x] 0.9 Modify `package.json` — add `jest` to `devDependencies`.
- [x] 0.10 Modify `package.json` — change `scripts.test` to `"jest --runInBand"`.
- [x] 0.11 Update `.github/workflows/test.yml` — change `node-version: [18]` to `node-version: [22]`.

### 0.6 Verification

- [x] 0.12 Run `npm test` — 17/18 pass (1 pre-existing failure in mainController.test.js — sanitization bug, not related to Phase 0).
- [x] 0.13 Run `node app.js` with full env — `GET /health` returns 200 with `{"status":"ok","uptime":5.11,"env":"development"}`.
- [x] 0.14 Run `node app.js` with missing `SESSION_SECRET` — exits with code 1, logs `[validateEnv] Missing required environment variable: SESSION_SECRET`.
- [x] 0.15 Request `GET /nonexistent` — 404 renders error.ejs with "Página no encontrada", status code 404, and "Volver al inicio" link.
