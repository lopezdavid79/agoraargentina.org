# Design: Auto-Deploy a cPanel

## Technical Approach

Extend `test.yml` with a `deploy` job (`needs: test`, `if: push + main`, concurrency group `cancel-in-progress: false`). Two new Node scripts: `deploy-analysis.js` (pure, unit-tested risk scan) and `cpanel-deploy.js` (UAPI orchestrator: sanity check → pull → deploy with SSE polling → restart → health). Optional LLM summary via OpenAI-compatible API, never blocks. Deps via `.cpanel.yml` amendment (`npm install --production` after cp, fast no-op when current). Report → `$GITHUB_STEP_SUMMARY`.

## Architecture Decisions

### Decision: UAPI orchestration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `scripts/cpanel-deploy.js` (Node fetch) | SSE polling natural in JS, matches repo pattern, clean error handling | **Selected** |
| Inline `run: curl` steps | Transparent logs, but SSE polling verbose/fragile in bash | Rejected |

**Rationale**: `VersionControlDeployment::create` is async (returns `sse_url`). Bash polling is brittle; Node handles event-stream cleanly. UAPI calls are integration-only — untestable without live cPanel.

### Decision: Restart mechanism

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `PassengerApps::disable_application` + `enable_application` | ~2-5s downtime, documented UAPI, explicit timing | **Selected** |
| `tmp/restart.txt` in `.cpanel.yml` | Zero-downtime, but fires during deploy tasks, no ordering control | Rejected |

**Rationale**: Both functions documented for cPanel ≥136. Toggle ensures restart happens AFTER deploy tasks. Verify manually: curl toggle → confirm `/health` uptime resets.

### Decision: Dep installation strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `npm install --production` in `.cpanel.yml` | Always runs, ~2s no-op when current, zero UAPI complexity | **Selected** |
| Conditional `ensure_deps` UAPI call | Efficient but async SSE polling adds fragility | Rejected |

**Rationale**: `npm install` is effectively free when deps unchanged. Amending `.cpanel.yml` avoids UAPI polling complexity. Risk scan still flags dep changes in report (diagnostic, not gating).

### Decision: LLM provider

| Option | Tradeoff | Decision |
|--------|----------|----------|
| OpenAI `/v1/chat/completions`, `gpt-4o-mini` default | Cheap, configurable via `LLM_MODEL`, broad compatibility | **Selected** |
| Anthropic Messages API | Separate auth, higher cost | Rejected |

**Rationale**: Covers OpenAI, Azure, Ollama. Model overridable. try/catch in script — failure writes "LLM summary: not available", deploy proceeds.

## Sequence Diagram

```
push(main)  deploy job       scripts/                    cPanel UAPI         LLM
    │           │                │                            │                │
    ├─test ok──►│                │                            │                │
    │           ├─checkout──────►│                            │                │
    │           │  deploy-analysis.js (risk scan)            │                │
    │           │◄──risk JSON───│                            │                │
    │           ├─[LLM key?]───►│───────────────────────────────────────────►│
    │           │◄─prose────────│ (skip on failure)                          │
    │           ├──────────────►│                            │                │
    │           │  cpanel-deploy.js                          │                │
    │           │  sanity: VersionControl::retrieve ────────►│                │
    │           │  pull:   VersionControl::update(main) ────►│                │
    │           │  deploy: VersionControlDeployment::create─►│                │
    │           │          (.cpanel.yml: cp + npm install)   │                │
    │           │          poll SSE until done ─────────────►│                │
    │           │  restart: disable ────────────────────────►│                │
    │           │           enable ─────────────────────────►│                │
    │           │  verify: GET /health (3x, 5s)              │                │
    │           │◄──exit 0──│                                │                │
    │           ├─report → $GITHUB_STEP_SUMMARY              │                │
    ▼           ▼                                            │                │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/test.yml` | Modify | Add `deploy` job with secrets, concurrency, two run steps |
| `scripts/deploy-analysis.js` | Create | `analyzeChanges(files, commits)` → `{deps, env, infra, security, commits}` |
| `scripts/cpanel-deploy.js` | Create | UAPI orchestrator with SSE polling, restart, health check |
| `tests/deploy-analysis.test.js` | Create | Unit tests: all flag combinations, empty input, edge cases |
| `.cpanel.yml` | Modify | Append `cd $DEPLOYPATH && npm install --production` after cp |
| `.env.example` | Create | `CPANEL_TOKEN`, `CPANEL_HOST`, `CPANEL_USER`, `LLM_API_KEY`, `LLM_MODEL` — no values |

## Contracts

**deploy-analysis.js**: pure function. Flags: `package.json|package-lock.json` → `deps`, `.env.example` → `env`, `app.js|.cpanel.yml` → `infra`, `routes/|config/|auth/` → `security`. Returns `{deps:bool, env:bool, infra:bool, security:bool, commits:string[]}`.

**Secrets** (job-level `env:`, from GitHub secrets): `CPANEL_TOKEN`, `CPANEL_HOST`, `CPANEL_USER` (required); `LLM_API_KEY`, `LLM_MODEL` (optional, defaults `gpt-4o-mini`). Auth: `Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}`.

**Health**: `GET https://agoraargentina.ar/health` → 200 `{status:"ok"}`. Timeout 30s, retry 3× at 5s intervals.

## Testing Strategy

| Layer | Scope | Tool |
|-------|-------|------|
| Unit | `deploy-analysis.js` — deps/env/infra/security flags, multi-flag, empty | Jest |
| Syntax | `test.yml` YAML | GitHub validation on push |
| Integration | UAPI sequence, restart, health, deps | **Manual** — requires cPanel 136 |

**Manual verification**: (1) `VersionControl::retrieve` → confirm root, (2) `PassengerApps::list_applications` → confirm `name`, (3) curl disable/enable → confirm uptime resets, (4) full push dry-run.

## Failure & Rollback

Any UAPI/health failure → job fails, site unchanged, no auto-retry. LLM failure → ignored. Rollback: `git revert <sha> && git push` (documented in every report). Manual fallback: cPanel UI → Deploy HEAD Commit.
