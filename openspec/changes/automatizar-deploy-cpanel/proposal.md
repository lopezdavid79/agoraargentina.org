# Proposal: Auto-Deploy a cPanel

## Intent

Zero-touch deploy to cPanel on every verified push to `main`: tests pass → git pull → restart → AI-assisted deploy report. Ends manual `cp -R` deploys.

## Scope

### In Scope
- Extend `.github/workflows/test.yml` with `deploy` job (`needs: test`)
- `scripts/cpanel-deploy.js` (UAPI client) + `scripts/deploy-analysis.js` (pure scan, unit-tested)
- Secrets: `CPANEL_TOKEN`, `CPANEL_HOST`, `CPANEL_USER`; optional `LLM_API_KEY`
- Report → job summary (`$GITHUB_STEP_SUMMARY`); verify `/health`

### Out of Scope
- Server cron/webhook (approach 3), local `npm run deploy` (superseded), unrelated cleanup

## Capabilities

### New Capabilities
- `auto-deploy`: push-to-main pipeline (test gate, UAPI pull, deps, restart, health check, report)

### Modified Capabilities
- `ci-pipeline`: push-to-main tests MUST deploy (pending delta in `auditar-codigo`)

## Approach

1. `needs: test` INSIDE `test.yml` — `needs:` cannot cross workflows; separate `deploy.yml` would double-run tests or need fragile `workflow_run`.
2. Job `if: github.event_name == 'push'` — PRs never deploy; concurrency group serializes deploys.
3. UAPI (token auth): `VersionControl::update` (main) → `VersionControlDeployment::create` (executes `.cpanel.yml`) → restart `PassengerApps::disable_application`+`enable_application` (no restart endpoint — verify; fallback `tmp/restart.txt`).
4. Conditional `PassengerApps::ensure_deps` when scan flags package.json.
5. `GET /health` MUST return 200/ok post-restart, else job fails.
6. **AI — hybrid, LLM off by default**: deterministic scan ALWAYS analyzes commits (`github.event.before..after`, `fetch-depth: 0`) flagging package.json/config + rollback; optional LLM step (OpenAI-compatible, `LLM_API_KEY`-gated) writes prose ONLY, never decides deploys. Works keyless — honest, low-friction.

## Affected Areas

| Area | Impact |
|------|--------|
| `.github/workflows/test.yml` | Modified — deploy job |
| `scripts/cpanel-deploy.js` | New |
| `scripts/deploy-analysis.js` | New |
| `tests/deploy-analysis.test.js` | New |
| `.cpanel.yml` | Possibly modified — npm deps task (verify) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| cPanel version drift (docs v138) | Med | Read-only `VersionControl::retrieve` first |
| Restart toggle unsupported | Med | Verify; fallback `tmp/restart.txt` |
| Dirty server checkout breaks pull | Med | Discover root; cleanup |
| Stale node_modules | Med | `ensure_deps` / `.cpanel.yml` |
| LLM key missing/unreachable | Low | Optional; deploy never blocks |

## Rollback Plan

One-command: `git revert <sha>` → push `main` → pipeline redeploys. Fallback: cPanel UI → Deploy HEAD Commit.

## Dependencies

User MUST provide before apply: API token, host (:2083), `CPANEL_USER`, cPanel version, `repository_root` (`VersionControl::retrieve`), app name (`list_applications`). Optional: `LLM_API_KEY`.

## Success Criteria

- [ ] Push to main: tests green → update → restart → `/health` 200
- [ ] PR: tests only, deploy skipped
- [ ] Report in job summary with risk flags + rollback
- [ ] Revert push redeploys cleanly

## Decisions for Spec/Design

- Restart: toggle vs `tmp/restart.txt`
- `Deployment::create` vs plain `update` pull
- Deps: `ensure_deps` vs `.cpanel.yml` step
- LLM provider/model (default OpenAI-compatible)
