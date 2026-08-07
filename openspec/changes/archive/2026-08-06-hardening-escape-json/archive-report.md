# Archive Report

**Change**: hardening-escape-json
**Archived at**: 2026-08-06
**Artifact Store**: openspec
**Verdict**: PASS — implemented and verified (verify-report: 118/118 tests green, 7/7 spec scenarios compliant, no CRITICAL/WARNING issues)
**Tests**: 118/118 pass (11 net-new: suite grew 107 → 118)
**Commit**: `477c66e` `fix(security): escape JSON in inline scripts to prevent script breakout`

## Specs Synced

This change produces **two** spec artifacts:

1. `script-json-escaping` — a **NEW capability**: `openspec/specs/script-json-escaping/` did not exist, so the delta spec was copied verbatim as the main spec (per the new-capability archive convention).
2. `contact-sanitization` — an **EVOLUTION** of the existing capability: the delta's single added requirement was **merged** into `openspec/specs/contact-sanitization/spec.md`. All pre-existing requirements were preserved verbatim.

| Domain | Action | Details |
|--------|--------|---------|
| script-json-escaping | Created (new capability) | 3 requirements, 5 scenarios — copied verbatim from delta spec |
| contact-sanitization | Updated (merged delta) | 1 requirement ADDED (Script-Context JSON Escaping Exception), 0 MODIFIED, 0 REMOVED, 3 preserved; 1 delta scenario synced; main spec now 4 requirements, 10 scenarios (was 3 requirements, 9 scenarios) |

The added requirement was placed immediately after `Output Escaping in EJS Templates` in the main spec — it is a context-scoped exception to that mandate, and its own text reaffirms that the HTML text context mandate (`<%= %>`) remains unchanged. This preserves spec coherence (exception grouped with the requirement it refines).

## Destructive-Delta Warning (config rule applied)

`openspec/config.yaml` → `rules.archive`: *"Warn before merging destructive deltas."*

**This merge is NOT destructive — it is purely additive.** The `contact-sanitization` delta contains only `ADDED Requirements` (1 requirement, 1 scenario). No existing requirement text was modified or removed, and no scenarios were replaced. The merge introduces a **scoped exception** to the existing `Output Escaping in EJS Templates` mandate: script-data context (JSON inside inline `<script>` blocks) uses `<%- jsonScript(...) %>` (`\uXXXX` OWASP Rule 3.1 escaping) instead of `<%= %>`. This is the correct security posture per OWASP — entity escaping alone is insufficient in script data context — and the delta explicitly scopes the exception so no pre-existing mandate is contradicted or silently weakened.

The merge was **pre-authorized by the orchestrator** (explicit archive instruction). Documented here as the audit-trail record of the warning evaluation: no destructive merge performed, no main-spec content lost.

## Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Intent (stored XSS via `</script>` breakout), scope (in/out), capabilities, approach, affected areas, risks, rollback plan |
| exploration.md | ✅ | Pre-proposal exploration of the breakout vectors |
| design.md | ✅ | Architecture decisions (`\uXXXX` vs HTML-entity, centralized helper, `app.locals`), data flow, site-3 normalization, file changes, interfaces/contracts, testing strategy, invariant |
| tasks.md | ✅ | 12/12 tasks complete (Phases 1–4), 0 incomplete |
| apply-progress.md | ✅ | TDD Cycle Evidence table (12 rows), 118/118 tests, no deviations, workload/PR boundary |
| specs/script-json-escaping/spec.md | ✅ | Delta spec (also synced to `openspec/specs/script-json-escaping/spec.md`) |
| specs/contact-sanitization/spec.md | ✅ | Delta spec (also merged into `openspec/specs/contact-sanitization/spec.md`) |
| verify-report.md | ✅ | PASS — 12/12 tasks, 118/118 tests, 7/7 scenarios compliant, TDD compliance 6/6, 0 CRITICAL / 0 WARNING / 0 SUGGESTION |
| archive-report.md | ✅ | This file |

## Key Evidence

- **Commit**: `477c66e` `fix(security): escape JSON in inline scripts to prevent script breakout` — single commit containing the implementation and all openspec artifacts (delivery decision: implement everything first, no PRs/branches, leave committed for local pass).
- **TDD**: Strict TDD (config `strict_tdd: true`, runner `npm test`); RED confirmed (unit tests + 2 RED integration test files), GREEN confirmed (full suite 118/118, +11 over baseline 107).
- **Scope**: `jsonScript(value)` helper in `config/ejsHelpers.js` (OWASP Rule 3.1: `< > &` U+2028 U+2029 → `\u003c \u003e \u0026 \u2028 \u2029`), registered on `app.locals`; all 3 injection sites switched to `<%- jsonScript(...) %>` (editModulo.ejs:94, form_fields.ejs:268, form_fields.ejs:301-303); site 3 contract normalized — controller passes parsed `participantes` array, `participantesJSON` key removed.
- **Round-trip safety**: `\uXXXX` are valid JSON string escapes → client `JSON.parse()` decodes to original characters (unit-tested).
- **Assertion nuance**: negative assertions scoped to the breakout payload sequence (`</script><script>alert(1)</script>`), never to bare `</script>` in the full response (templates legitimately contain closing script tags) — audited in verify-report.
- **Invariants**: no bare `<%- JSON.stringify(` in inline `<script>` of any view; zero remaining `participantesJSON` consumers in active source; no Firestore scrub (documented limitation — rendering fix only).
- **Spec compliance**: verify-report maps all 7 covered behaviors (5 script-json-escaping + 1 contact-sanitization delta + shared scenarios) to passing tests.
- **Deviations**: None — implementation matches `design.md` exactly.

## Config Rules Applied

From `openspec/config.yaml` `rules.archive`:
- **Warn before merging destructive deltas**: Applied — see "Destructive-Delta Warning" section above. Merge evaluated as non-destructive (purely additive); pre-authorized by orchestrator; no requirements deleted or modified; no active main-spec content silently lost.

## Source of Truth

- `openspec/specs/script-json-escaping/spec.md` — created from the delta spec; now the main spec (3 requirements, 5 scenarios).
- `openspec/specs/contact-sanitization/spec.md` — updated (delta merged): 4 requirements, 10 scenarios.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
