# Apply Progress: etiquetar-grabaciones

> Phase: apply (sdd-apply) — Status: **success** — 14/14 tasks complete
> Mode: **Strict TDD** (openspec/config.yaml → `strict_tdd: true`, runner `npm test`)
> Artifact store: openspec

## Summary

Evolved `grabaciones` from `string[]` to `[{url,label}]` per spec/design/tasks. Write path: `parseGrabaciones` rewritten to normalize strings→`{url,label}` and preserve/trim objects, dropping empty-url entries, cap 10, `try/catch → []`; call sites (`storeModulo`, `updateModulo`) unchanged. Candidate render (`detail.ejs`): inline normalizer accepts strings AND objects, link text = trimmed label or positional fallback `"Clase Grabada N"`, href = url, sub-line "Video del encuentro virtual" retained. Admin forms (`createModulos.ejs`, `editModulo.ejs`): two-input rows (label + URL) using the informes `participantes` `data-idx`/`data-campo` pattern, `grabData` as `[{url,label}]`, add pushes `{url:'',label:''}`, `"` escaped in both fields; edit prefill EJS computes `initialGrabaciones` (strings→default labels "Clase Grabada N" 1-based, objects preserved, legacy `claseGrabada` auto-seeds `grabaciones[0]`). 12 net-new/rewritten tests; full suite 107/107 green (baseline 95).

No commits made (delivery strategy: ask-always → user tests locally before any PR decision; work left uncommitted in the working tree on main, matching the previous change's precedent).

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/adminController.test.js` | Unit (supertest+mocks) | ✅ 95/95 | ✅ Written | ✅ Passed | ✅ 2 cases (labeled create + claseGrabada empty; mixed strip/cap-10) | ➖ None needed |
| 1.2 | `tests/adminController.test.js` | Unit | ✅ 95/95 | ✅ Written | ✅ Passed | ✅ 2 cases (labeled save + activo on; middle-removal 3→2 + activo off) | ➖ None needed |
| 1.3 | `controller/adminController.js` | Unit | ✅ 4 RED → green | ✅ Written (via 1.1/1.2) | ✅ Passed | ✅ mixed string/object, trim url+label, drop empty url, cap 10 | ✅ Pure function kept; comment updated |
| 1.4 | `tests/adminController.test.js` (parseGrabaciones describe) | Unit | ✅ 33/33 | ✅ Written (export missing → TypeError) | ✅ Passed (added `module.exports.parseGrabaciones`) | ✅ 5 cases (mixed blank/valid; legacy strings; mixed elements; cap 10; malformed/missing → []) | ➖ None needed |
| 1.5 | `tests/mainController.test.js` | Unit | ✅ 95/95 | ✅ Written | ✅ Passed | ✅ 6 cases (labeled labels; legacy "Clase Grabada 1"; none; mixed labels; string-array fallback; renumber after removal) | ➖ None needed |
| 1.6 | `views/capacitaciones/detail.ejs` | Unit (render) | ✅ 5 RED → green | ✅ Written (via 1.5) | ✅ Passed | ✅ covered by 1.5 cases | ➖ None needed |
| 2.1 | `tests/adminController.test.js` (editModulo) | Unit | ✅ 40/40 | ✅ Written | ✅ Passed | ✅ legacy-seed: `{"url":"https://legacy.com/x","label":"Clase Grabada 1"}` in page | ➖ None needed |
| 2.2 | `tests/adminController.test.js` (editModulo) | Unit | ✅ 40/40 | ✅ Written (2 seed tests) | ✅ Passed | ✅ string-array-seed "Clase Grabada 1/2"; prefill JSON test rewritten to object shape (GREEN on rewrite — approval) | ➖ None needed |
| 2.3 | `views/admin/capacitaciones/editModulo.ejs` | Unit (render) | ✅ 2 RED → green | ✅ Written (via 2.1/2.2) | ✅ Passed | ✅ covered by 2.1/2.2 | ✅ EJS map extracted to `initialGrabaciones` |
| 2.4 | `tests/adminController.test.js` (createModulos GET + editModulo prefill) | Unit | ✅ 41/41 | ✅ Written (data-campo assertions) | ✅ Passed | ✅ both forms: `data-campo="label"`, `data-campo="url"`, "Etiqueta (opcional)" | ✅ Shared participantes pattern verbatim |
| 2.5 | `tests/adminController.test.js` (updateModulo) | Unit | ✅ 41/41 | ✅ Written | ✅ Passed on first run — behavior already covered by task 1.3 write normalizer; adds update-path regression coverage (label trim, blank-url drop) | ✅ 1 case | ➖ None needed |
| 3.1 | full suite | — | ✅ 95/95 | — | ✅ 107/107 | grep: no string-shape `grabaciones` assertions remain | — |
| 3.2 | spec cross-check | — | — | — | ✅ all scenarios mapped to tests (see below) | — | — |
| 3.3 | rollback analysis | — | — | — | ✅ render normalizer independent of write path; object docs survive revert | — | — |

### Test Summary

- **Total tests written**: 12 net-new (adminController: +6 rewritten +2 new seed +1 createModulos GET +1 updateModulo labeled +5 parseGrabaciones unit; mainController: 3 rewritten +3 new). Suite went 95 → 107.
- **Total tests passing**: 107/107
- **Layers used**: Unit (12), Integration (0 new), E2E (0 — Cypress out of scope)
- **Approval tests** (refactoring): 3 — detail "no recordings" case, editModulo 404, prefill JSON rewritten to object shape (green on rewrite since object dumps were already preserved)
- **Pure functions created**: 0 new (existing `parseGrabaciones` rewritten, now exported for unit tests)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `controller/adminController.js` | Modified | `parseGrabaciones` rewritten: string→`{url,label}`, object→preserved+trimmed, drop empty url, cap 10, try/catch→[]; exported via `module.exports.parseGrabaciones` for unit tests |
| `views/admin/capacitaciones/createModulos.ejs` | Modified | `grabData = []`; two-input rows (label text input `data-campo="label"` + url input `data-campo="url"` + remove btn), listeners write `grabData[i][campo]`, add pushes `{url:'',label:''}`, `"` escaped in both fields |
| `views/admin/capacitaciones/editModulo.ejs` | Modified | `initialGrabaciones` EJS map (strings→"Clase Grabada N" 1-based, objects preserved, legacy `claseGrabada` seeds `[url]`); same two-input rows + `data-campo` binding as create |
| `views/capacitaciones/detail.ejs` | Modified | Inline normalizer: `rec` string→`{url,label:''}`; `linkText = label.trim() || 'Clase Grabada '+(idx+1)`; href = `r.url`; sub-line retained |
| `tests/adminController.test.js` | Modified | 2 storeModulo tests rewritten to objects (+`claseGrabada === ''`); 2 updateModulo tests rewritten to objects; prefill JSON test rewritten to object shape; +2 editModulo seed tests; +1 createModulos GET test; +1 updateModulo labeled-normalize test; +5 parseGrabaciones unit tests; `adminController` import added |
| `tests/mainController.test.js` | Modified | 3 detailCapacitaciones tests rewritten (dynamic labels / "Clase Grabada 1" / no-recordings) + 3 new (mixed labels, string-array fallback, renumber after removal) |

## Deviations from Design

1. **Task 1.5 renumber test data** — the design's "Remove middle recording renumbers" scenario is the POST-removal stored state (2 recordings). My first version of the test used 3 empty-label recordings (renders 1,2,3) and failed `not.toContain('Clase Grabada 3')`; the implementation was correct, the test data was not modeling the scenario. Fixed test data to 2 recordings. No production deviation.
2. **`parseGrabaciones` export** — design's testing table said "direct function call" for unit tests but the function was private. Added `module.exports.parseGrabaciones = parseGrabaciones` (additive property on the controller object; no behavior change, router unaffected). Needed for the RED-first unit describe (task 1.4).
3. **createModulos GET test** — design/tasks didn't list a permanent test for the createModulos page render; added one (task 2.4 RED) asserting `data-campo` markers, closing the gap noted in the previous change's apply-progress.

## Issues Found

- None blocking. The 1 live module holding 2 plain strings renders via the detail.ejs normalizer (string elements → fallback labels) and edits with seeded default labels — no migration needed.
- Working tree has unrelated untracked upload artifacts under `public/images/{cursos,noticias}/` — left untouched (not change-scoped).

## Remaining Tasks

- None (all 14 tasks complete). Next: user's local manual pass (forms add/remove interaction, live module render), then PR decision — forecast suggests 2 chained PRs (PR 1: write+render; PR 2: forms) at ~408 changed lines.

## Workload / PR Boundary

- Mode: single batch, no PRs yet (delivery strategy ask-always; user tests locally before PR decision)
- Current work unit: N/A — full change implemented in working tree on `main`
- Boundary: `parseGrabaciones` + `detail.ejs` + both admin forms + both test files; ~408 changed lines (365 insertions, 43 deletions) — above the 400-line review budget, so the PR decision should consider the 2-unit split from tasks.md
- Estimated review budget impact: High (as forecast)

## Spec Scenario → Test Mapping

| Spec Scenario | Test |
|---|---|
| Create with custom labels | adminController: "creates modulo with multiple labeled grabaciones and activo true" |
| Legacy module fallback | mainController: "renders single link 'Clase Grabada 1' from legacy claseGrabada" |
| String elements normalize | adminController: parseGrabaciones "converts legacy string arrays"; mainController: "Plain string array renders fallback labels" |
| Remove middle recording | adminController: "persists exactly the remaining order after removing the middle recording 3 → 2" |
| Edit legacy seeds default label | adminController: "edit legacy-only module seeds one row ... 'Clase Grabada 1'" |
| Edit string-array seeds defaults | adminController: "edit string-array module seeds default labels 'Clase Grabada 1'/'Clase Grabada 2'" |
| Blank and valid mixed | adminController: storeModulo "normalizes mixed string/object elements..." + parseGrabaciones unit + updateModulo labeled-object test |
| Legacy string array parses | adminController: parseGrabaciones "converts legacy string arrays" |
| Three recordings with mixed labels | mainController: "renders 'Intro', fallback 'Clase Grabada 2', and 'Avanzado'" |
| Plain string array renders fallback labels | mainController: "renders 'Clase Grabada 1' and 'Clase Grabada 2' for legacy string arrays" |
| Remove middle recording renumbers fallback labels | mainController: "renumbers fallback labels after removing the middle recording" |
| String-shape tests go RED first | Confirmed during cycle: 4 adminController + 2 mainController tests failed (RED) before implementation |

## Rollback Plan

Per design: revert `parseGrabaciones` to string-only, single-input forms, static labels — but KEEP the detail.ejs render normalizer so already-saved `{url,label}` docs still render. The render normalizer is self-contained (accepts strings and objects), so the live string module and any object docs both render regardless of write-path state.
