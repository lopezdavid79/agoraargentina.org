# Exploration: Automatizar deploy a cPanel (git pull + restart Node app)

## Current State

### Repo-side (agoraargentina.org)

- **Entry point / startup**: `app.js` — Express 5 + EJS. `require('dotenv').config()` first, then `validateEnv()` (from `config/validateEnv.js`) which REQUIRES `SESSION_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `EMAIL_USER`, `EMAIL_PASS`, and exits with code 1 if any is missing. Listens on `process.env.PORT || 3000`, binds `0.0.0.0`. Exposes a public `/health` endpoint (`{ status, uptime, env: NODE_ENV }`).
- **package.json scripts**: only `start` (`node app.js`), `dev` (`nodemon`), `test` (`jest --runInBand`). **No deploy script exists.**
- **`.env`** (gitignored, exists locally): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `SESSION_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `PORT=3000`. NOTE: `NODE_ENV` is NOT set locally. Contains real secrets — never commit. Server-side `.env` is separate (`.env` is gitignored, so `git pull`/copy deploys never touch it — good).
- **Existing deployment tooling — `.cpanel.yml`** at repo root:
  ```yaml
  deployment:
    tasks:
      - export DEPLOYPATH=/home/agoraargentina/public_html/agoraargentina
      - /bin/cp -R * $DEPLOYPATH
  ```
  - Reveals: cPanel username `agoraargentina`, app deployed to `/home/agoraargentina/public_html/agoraargentina`, and the git repo checkout on the server is elsewhere (copy-style deploy, not in-place).
  - History: committed FROM cPanel (commit `4c91355` authored `agoraargentinago@rs-or.serverhostgroup.com`), path fixed in `2976e6f`, "force update" comment `fdfe44b`. Hostname hint: `rs-or.serverhostgroup.com`.
  - This is a **static copy** (`cp -R`) — it does NOT install npm deps, does NOT restart the app, and does NOT remove server-only files (so server `.env` survives — good).
- **Git remote**: `origin → https://github.com/lopezdavid79/agoraargentina.org.git` (HTTPS), branch `main`, up to date. **No submodules** (`git submodule status` empty, no mode-160000 entries).
- **No** `ecosystem.config.js` (PM2), `Procfile`, `Dockerfile`, `.htaccess`, `.deploy`, or `deploy*` files anywhere in the repo.
- **CI**: `.github/workflows/test.yml` is the ONLY workflow — `npm ci && npm test` on Node 22 for push/PR to `main`. No deploy workflow.
- **Automation patterns**: `scripts/migrate-images.js` — standalone Node script, loads `.env` via relative path, idempotent, run manually (`node scripts/migrate-images.js`), Spanish messages, no npm-script wrapper. `scripts/generar_cv.js`, `scripts/pdfGenerator.js` also exist. This is the established pattern: **plain Node script in `scripts/` + dotenv + manual invocation**.
- **Style**: plain CommonJS Node, Express 5, no linter/typechecker/formatter (per `openspec/config.yaml`). `strict_tdd: true`, jest runner.
- Production URLs: `app.js` uses `req.get('host') || 'agoraargentina.ar'`; email `info@agoraargentina.ar`; site https://agoraargentina.ar.
- Docs: `docs/auditoria-calidad-web.md` notes no build pipeline; `.env` gitignored.

### External feasibility: cPanel automation (confidence flags)

**Authentication** — HIGH confidence. cPanel UAPI is reachable remotely over HTTPS:
```
curl -H 'Authorization: cpanel <username>:<APITOKEN>' 'https://<host>:2083/execute/<Module>/<function>?param=value'
```
- Port `2083` = secure cPanel account access. API tokens created in cPanel UI (`Security → Manage API Tokens`) or via `Tokens::create_full_access` UAPI.
- Docs apply to **cPanel & WHM v138**; older versions may differ — verify against the server's installed version.

**Git pull** — HIGH confidence (documented UAPI):
- `GET /VersionControl/update?repository_root=/home/agoraargentina/...&branch=main` — "only pulls changes from the remote repository if you specify a branch value". `repository_root` is required and identifies the repo. `VersionControl::retrieve` lists the account's repos (to discover `repository_root`).
- `GET /VersionControlDeployment/create?repository_root=...` — the "Deploy HEAD Commit" button: pulls with `--ff-only`, requires a valid checked-in `.cpanel.yml` + branches + **clean working tree**, and **runs the `.cpanel.yml` deployment tasks** (the `cp -R` above). Returns `deploy_id`, `log_path`, `sse_url` (SSE task tracker for async completion).
  - ⚠ This runs `.cpanel.yml` — i.e. the API path can execute the exact deploy tasks the UI runs today.

**Node app restart ("Setup Node.js App")** — MEDIUM confidence / needs verification:
- cPanel's "Setup Node.js App" = the **PassengerApps** UAPI module (Application Manager).
- Documented functions (v138): `list_applications` (returns per-app `name`, `domain`, `path`, `enabled`, `envvars`), `enable_application(name)`, `disable_application(name)`, `edit_application`, `register_application`, `unregister_application`, `ensure_deps`.
- **There is NO `restart_application` function in the current docs** (404 on the docs page). Restart via pure UAPI = `disable_application` + `enable_application` toggle, OR the Passenger convention of touching `tmp/restart.txt` in the app root (verify). The cPanel UI's "Restart" button may do either internally — **verify against the installed cPanel version and test before committing the design**.
- `ensure_deps` exists for installing app dependencies (relevant when `package.json` changes — today `.cpanel.yml` copy does NOT run `npm install`).

**CLI tooling**: no gh-like remote CLI for cPanel exists. The `uapi` CLI (`/usr/local/cpanel/bin/uapi --user=...`) runs ON the server only (needs shell access). Remote automation = HTTPS UAPI with token (above).

## Affected Areas

| Area | Impact | Why |
|------|--------|-----|
| `.cpanel.yml` | Possibly modified | May need `npm install` / touch restart.txt steps appended to deploy tasks |
| `package.json` | New `deploy` script (if local-script approach) | Entry point for `npm run deploy` |
| `scripts/deploy.js` (new) | New | The automation itself (UAPI calls), following `scripts/migrate-images.js` pattern |
| `.env` (local, gitignored) | New vars | `CPANEL_HOST`, `CPANEL_USERNAME`, `CPANEL_TOKEN`, `REPO_ROOT`, `APP_NAME` — never committed |
| `.github/workflows/` (if GH-Action approach) | New `deploy.yml` | Alternative trigger; secrets stored in GitHub |
| `openspec/` | New change artifacts | Proposal/spec/design/tasks for this change |

## Approaches

1. **Local npm script (`npm run deploy`)** — `scripts/deploy.js` using Node's built-in `fetch` (Node ≥18; repo CI uses Node 22) to call the UAPI endpoints with token from `.env`:
   - Sequence: `VersionControl::update` (pull, branch=main) → `VersionControlDeployment::create` (run `.cpanel.yml` tasks) → `PassengerApps::disable_application` + `enable_application` (restart).
   - Pros: matches existing `scripts/` + dotenv pattern exactly; one command from the dev machine; no CI/cloud dependency; token stays local; can discover `repository_root` via `VersionControl::retrieve` and app name via `list_applications`.
   - Cons: only runs from a machine with the token; local Node version must be ≥18 (fetch); manual "on demand" only.
   - Effort: Low–Medium.

2. **GitHub Action workflow (`deploy.yml`, `workflow_dispatch`)** — curl the same UAPI endpoints; credentials as GitHub Actions secrets.
   - Pros: one click in GitHub UI from anywhere (mobile/web); secrets in GH not on disk; can be chained after `test.yml` passes; automatic-on-push option later.
   - Cons: cPanel host must be reachable from GitHub runners (egress/IP); new workflow file + secret setup; harder to test locally; `repository_root`/app-name discovery must be hardcoded or scripted inside the workflow.
   - Effort: Medium.

3. **Server-side tooling** (cron job on server running the `uapi` CLI, or a GitHub webhook hitting a small listener) —
   - Pros: closest to true "auto-deploy on push"; no token on the dev machine.
   - Cons: needs shell access/SSH on the server (unknown/unlikely for shared cPanel), cron ≠ "on demand", webhook listener = new attack surface; high complexity for a one-command requirement.
   - Effort: High. Not recommended for this requirement.

## Recommendation

**Approach 1 (local `npm run deploy` script)** as primary. It matches the repo's existing conventions (`scripts/` + dotenv + manual run), requires no new CI infrastructure, and satisfies the stated "one-command, on demand" requirement directly. **Approach 2 (GitHub Action `workflow_dispatch`) as the main alternative** if the user prefers triggering deploys from GitHub instead of the local machine — the proposal should pick one, or the explore phase suggests presenting both to the user.

Recommended API sequence (verify each against the live cPanel version before finalizing design):
1. `VersionControl::update` with `branch=main` (git pull) — or skip if `VersionControlDeployment::create` alone performs the pull + `.cpanel.yml` tasks (it does, `--ff-only`).
2. `VersionControlDeployment::create` (runs `.cpanel.yml` deploy tasks) — need to confirm the server's git working tree is clean (uploads/untracked files in the CHECKOUT dir would break `--ff-only`; the DEPLOYPATH copy dir is separate and unaffected).
3. Restart: `PassengerApps::disable_application` + `enable_application`, or touch `tmp/restart.txt` — verify which works on the installed version.

## Risks

- **cPanel version drift**: docs are for v138. `VersionControlDeployment::create` and `PassengerApps` functions may differ/be absent on the server's actual version. Must test with read-only calls (`VersionControl::retrieve`, `list_applications`) first.
- **Credentials storage**: cPanel API token is a full-account-credentials-adjacent secret. MUST live in gitignored `.env` (local) or GitHub secrets (Action), never in the repo. Token should be created with minimal scope if the installed cPanel supports token scoping.
- **No restart endpoint documented**: if the restart toggle doesn't work on the installed version, the automation can't complete — needs manual verification step before the design is final.
- **Server-side env/npm**: copy-style `.cpanel.yml` does not run `npm install`. If `package.json`/`package-lock.json` change, the server deps are stale (server `.env` is safe, but node_modules is not updated). May need `npm install` step added to `.cpanel.yml` tasks or via `PassengerApps::ensure_deps` — verify shell availability on server.
- **Clean working tree requirement** for `VersionControlDeployment::create` (`--ff-only`): any uncommitted/untracked change in the server's git CHECKOUT dir fails the deploy. The checkout location is unknown — must be discovered via `VersionControl::retrieve` and inspected.
- **`NODE_ENV`**: not set in local `.env`; confirm production `.env` on the server sets `NODE_ENV=production` (affects error-handler behavior; `/health` reports it).

## Gaps / Decisions the proposal must make

1. cPanel server hostname + confirm port 2083 reachable from the chosen trigger (local machine vs GitHub runners).
2. Exact `repository_root` of the git checkout on the server (discoverable via `VersionControl::retrieve` — user must run it once, or provide it).
3. Passenger app `name` for restart (discoverable via `PassengerApps::list_applications`).
4. Restart mechanism: disable/enable toggle vs `tmp/restart.txt` — requires verification against installed cPanel.
5. npm-install handling when deps change (extend `.cpanel.yml`? `ensure_deps`? manual?).
6. Approach decision: local script vs GitHub Action (user preference).
7. What the user must provide: cPanel API token (created in cPanel UI), hostname, and confirmation of cPanel version.

## Ready for Proposal

**Yes** — with the following user inputs needed before/at proposal time:
- cPanel API token + server hostname (and confirm `:2083` HTTPS access).
- One-time `VersionControl::retrieve` result (repo root path) and `PassengerApps::list_applications` result (app name) — or the user reading them off the cPanel UI.
- Preference: local `npm run deploy` vs GitHub Action trigger.
- cPanel version installed on the server.
