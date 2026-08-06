# Archive Report

**Change**: etiquetar-grabaciones
**Archived at**: 2026-08-06
**Artifact Store**: openspec
**Verdict**: PASS — implemented and verified (verify-report: 107/107 tests green, 13/13 spec scenarios compliant, no CRITICAL/WARNING issues)
**Tests**: 107/107 pass (12 net-new/rewritten: suite grew 95 → 107)
**Commits**: `0677eb6` `feat(capacitaciones): normalize recordings to {url,label} on write and render` + `b5bac74` `feat(capacitaciones): add per-recording labels to module forms`

## Specs Synced

This change is an **EVOLUTION** of the existing `capacitaciones-modulos` capability: the delta spec was **merged** into `openspec/specs/capacitaciones-modulos/spec.md`, replacing the `string[]` data-model requirements with the new `{url, label}` object requirements. `Active by Default` was NOT touched by the delta and was preserved as-is.

| Domain | Action | Details |
|--------|--------|---------|
| capacitaciones-modulos | Updated (merged delta) | 5 requirements MODIFIED (Data Model, Admin Forms, Validation, Candidate Render, Test Coverage), 0 ADDED, 0 REMOVED, 1 preserved (Active by Default); 12 delta scenarios synced + 1 preserved scenario = 13 total; Out-of-Scope updated (per-recording labels moved IN scope) |

## Destructive-Delta Warning (config rule applied)

`openspec/config.yaml` → `rules.archive`: *"Warn before merging destructive deltas."*

**This merge IS destructive by nature**: the delta replaces the previously-specified `grabaciones: string[]` data model and its string-shape scenarios with `[{url, label}]` object semantics. Specifically replaced requirement text + scenarios:

- `Data Model — Multiple Recordings`: `string[]` type + "future evolution compatibility" note → `[{url, label}]` type; scenarios `Create module with multiple recordings` / `Legacy module renders single recording fallback` → `Create with custom labels` / `Legacy module fallback` / `String elements normalize`.
- `Admin Forms — Repeatable URL Inputs` (renamed `Repeatable Recording Inputs`): single URL inputs → per-row label+URL inputs with default-label seeding; scenario `Edit module removing middle recording` replaced by object-shape `Remove middle recording` + `Edit legacy seeds default label` + `Edit string-array seeds defaults`.
- `Validation — Recording URLs` (renamed `Recording Objects`): plain-string validation → object normalization (trim url, discard empty, cap 10, no format validation, accepts both wire shapes); scenario `Submit with blank and valid URLs` → `Blank and valid mixed` + `Legacy string array parses`.
- `Candidate Render`: static "Clase Grabada" link text → dynamic label text with positional fallback; scenario `Module with three recordings` → `Three recordings with mixed labels` + `Plain string array renders fallback labels` + `Remove middle recording renumbers fallback labels`.
- `Test Coverage`: string-shape assertion requirements → object-shape + RED-first requirement.
- **Out of Scope**: `Per-recording labels or titles` moved from out-of-scope to IN scope.

**No requirements were deleted** — every old requirement maps to a MODIFIED successor, and `Active by Default` (not in the delta) was preserved verbatim. This merge was **pre-authorized by the orchestrator** (explicit archive instruction) and is the required openspec evolution per the SDD archive convention. Documented here as the audit-trail record of the warning.

## Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Intent, scope (in/out), capabilities, approach, backward compatibility, render fallback rule, risks, rollback plan |
| exploration.md | ✅ | Current-state analysis, form conventions, approaches, recommendation |
| design.md | ✅ | 6 architecture decisions, data flow, file changes, key patterns, testing strategy, migration/rollout |
| tasks.md | ✅ | 14/14 tasks complete (Phases 1–3), 0 incomplete |
| apply-progress.md | ✅ | TDD Cycle Evidence table (14 rows), 107/107 tests, 3 deviations documented, spec-scenario → test mapping, rollback plan |
| specs/capacitaciones-modulos/spec.md | ✅ | Delta spec (also merged into `openspec/specs/capacitaciones-modulos/spec.md`) |
| verify-report.md | ✅ | PASS — 14/14 tasks, 107/107 tests, 13/13 scenarios compliant, TDD compliance 6/6, 3 SUGGESTIONs (all non-blocking: `<%- %>` escaping hardening — pre-existing informes pattern, not a regression) |
| archive-report.md | ✅ | This file |

## Key Evidence

- **Commits**: `0677eb6` (write+render: `parseGrabaciones` rewrite, `detail.ejs` normalizer, save/render tests) and `b5bac74` (forms: two-input rows, EJS prefill default labels, edit-seed tests) — two chained work units per the tasks.md forecast (PR split suggested for the ~408 changed lines).
- **TDD**: Strict TDD (config `strict_tdd: true`, runner `npm test`); RED confirmed (string-shape assertions rewritten first), GREEN confirmed (107/107, +12 over baseline 95).
- **Scope**: `grabaciones` evolved `string[]` → `[{url,label}]`; single `parseGrabaciones` normalizer on write + inline EJS normalizer on render; `claseGrabada` legacy fallback retained (28 modules); no data migration needed (only 1 live module holds string-array grabaciones, renders/edits via normalizers).
- **Backward compatibility**: render normalizer accepts plain strings → fallback labels; legacy `claseGrabada` seeds `grabaciones[0]` with default label "Clase Grabada 1" on edit — legacy URLs not lost.
- **Spec compliance**: verify-report maps all 13 covered behaviors to passing tests.
- **Deviations** (all acceptable, documented in apply-progress): test-data fix for renumber scenario, `parseGrabaciones` export for unit tests, added createModulos GET test.

## Config Rules Applied

From `openspec/config.yaml` `rules.archive`:
- **Warn before merging destructive deltas**: Applied — see "Destructive-Delta Warning" section above. Merge pre-authorized by orchestrator; destructive replacement of the `string[]` data model documented; no requirements deleted; no active main-spec content silently lost.

## Source of Truth

- `openspec/specs/capacitaciones-modulos/spec.md` — updated (delta merged): 6 requirements, 13 scenarios.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
