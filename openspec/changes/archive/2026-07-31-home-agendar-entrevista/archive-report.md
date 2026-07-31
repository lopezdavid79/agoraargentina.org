# Archive Report

**Change**: home-agendar-entrevista
**Archived at**: 2026-07-31
**Artifact Store**: openspec
**Verdict**: PASS (2/2 scenarios COMPLIANT, 0 CRITICAL, 0 WARNING)
**Tests**: 85/85 pass (12 suites)

## Specs Synced

No delta specs to merge. The `landing-cta` capability was created as a new full spec directly at `openspec/specs/landing-cta/spec.md` during the spec phase. It is already the source of truth.

| Domain | Action | Details |
|--------|--------|---------|
| landing-cta | Created (new capability) | 1 requirement, 2 scenarios |

## Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Intent, scope (in/out), capabilities, approach, risks, rollback plan |
| exploration.md | ✅ | Homepage CTA conventions, no existing scheduling feature, approach fork resolved (external Google Calendar link) |
| design.md | ✅ | Architecture decisions (btn-outline-secondary subordinate variant, mt-5/mb-3 spacing, px-4 py-2 padding, test location/assertions), HTML contract |
| tasks.md | ✅ | 7/7 tasks complete (RED/GREEN/verification phases), 0 incomplete |
| apply-progress.md | ✅ | TDD Cycle Evidence (7 tasks), 2 tests written, no deviations from design |
| verify-report.md | ✅ | PASS — 2/2 scenarios COMPLIANT, 85/85 tests, spec compliance matrix complete |
| archive-report.md | ✅ | This file |

## Key Evidence

- **Commit**: `fcbf904` `feat(home): add interview scheduling CTA` — single commit containing the EJS change, tests, and all openspec artifacts.
- **TDD**: Strict TDD (config `strict_tdd: true`); RED confirmed (`2 failed` in `routes.test.js`), GREEN confirmed (full suite 85/85 across 12 suites).
- **Scope boundary respected**: `git diff --stat` for the change shows only `tests/routes.test.js` (+27) and `views/home.ejs` (+7). No routes, controllers, models, middleware, or CSS changes.
- **Spec compliance**: 2/2 scenarios COMPLIANT — (1) homepage renders exact paragraph + "Agendar mi entrevista" link with `https://calendar.app.google/mXSH4cQgvakNUyXd8`, `target="_blank"`, `rel="noopener"`; (2) CTA renders when the Firestore `noticias` fetch fails.
- **Accessibility**: semantic `<p>` (no manual numbering), link's visible text serves as accessible name — consistent with the site's WCAG AA stance.
- **Non-blocking SUGGESTION** (from verify): both `GET /` tests exercise the firebase-failure path because the mock stubs only `collection`; consider a richer mock for the success path in a future change. Not blocking, spec scenarios met.

## Config Rules Applied

From `openspec/config.yaml` `rules.archive`:
- No destructive deltas to warn about — no delta spec to merge; `landing-cta` was authored directly in `openspec/specs/` and is untouched by this archive.

## Source of Truth

- `openspec/specs/landing-cta/spec.md` — already the source of truth since the spec phase (created in commit `fcbf904`). No merge performed; spec unchanged by archiving.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
