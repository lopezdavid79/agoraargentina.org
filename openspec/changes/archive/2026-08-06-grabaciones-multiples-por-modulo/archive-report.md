# Archive Report

**Change**: grabaciones-multiples-por-modulo
**Archived at**: 2026-08-06
**Artifact Store**: openspec
**Verdict**: PASS — implemented, verified locally by the user ("ya funciona"), 95/95 tests green
**Tests**: 95/95 pass (10 new: 7 adminController + 3 mainController; baseline 85)

## Specs Synced

The delta spec was synced into the specs registry. `openspec/specs/capacitaciones-modulos/spec.md` did not exist prior to this change, so the delta spec was copied directly as the main spec (it is a full spec for a new capability, not a delta against an existing one).

| Domain | Action | Details |
|--------|--------|---------|
| capacitaciones-modulos | Created (new capability) | 6 requirements, 6 scenarios |

## Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Intent, scope (in/out), capabilities, approach, risks, rollback plan |
| exploration.md | ✅ | Current-state analysis, existing form conventions, approaches, recommendation |
| design.md | ✅ | Architecture decisions (additive field, hidden-JSON form pattern), sequence diagram, target markup |
| tasks.md | ✅ | 16/16 tasks complete (RED/GREEN/verification phases), 0 incomplete |
| apply-progress.md | ✅ | TDD Cycle Evidence, 95/95 tests, deviations, workload/PR boundary |
| specs/capacitaciones-modulos/spec.md | ✅ | Delta spec (also synced to `openspec/specs/capacitaciones-modulos/spec.md`) |
| verify-report.md | ⚠️ | Not produced as a separate artifact — verification was done locally by the user (user confirmed the feature works). No CRITICAL issues known. |
| archive-report.md | ✅ | This file |

## Key Evidence

- **Commit**: `bfb12a3` `feat(capacitaciones): allow multiple recordings per module` — single commit containing the implementation (controller, views, tests) and all openspec artifacts.
- **TDD**: Strict TDD (config `strict_tdd: true`, runner `npm test`); RED → GREEN confirmed per apply-progress (full suite 95/95, +10 over baseline 85).
- **Scope**: additive `grabaciones: string[]` field with legacy `claseGrabada` fallback; no migration; `activo: true` gap-fix included (commented BEGIN/END markers for easy revert).
- **Design deviation documented**: `editModulo.ejs` seeds from `grabaciones` when non-empty, else `[claseGrabada]` — prevents data loss when editing a legacy-only module (the new form no longer submits `claseGrabada`).
- **Spec compliance**: delta spec scenarios map 1:1 to implemented behavior (create with multiple recordings, legacy fallback render, mid-list removal on edit, blank-URL stripping, three-recording render, activo default).

## Config Rules Applied

From `openspec/config.yaml` `rules.archive`:
- **Warn before merging destructive deltas**: No destructive merge performed — the `capacitaciones-modulos` capability is NEW (no existing main spec), so the delta was copied verbatim as a full spec. No requirements were modified or removed; no warning required.

## Source of Truth

- `openspec/specs/capacitaciones-modulos/spec.md` — created from the delta spec; now the main spec.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
