# Tasks: Grabaciones múltiples por módulo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~330–420 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 write path → PR 2 candidate render |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Write path: `parseGrabaciones`, `storeModulo`/`updateModulo`, admin forms, admin tests, `activo` fix | PR 1 | base = main/tracker; RED tests + GREEN impl together; ~280 lines |
| 2 | Candidate render: `detail.ejs` recordings loop + fallback, `detailCapacitaciones` tests | PR 2 | base = PR 1 branch or main after merge; ~95 lines |

## Phase 1: RED — failing tests (strict TDD)

- [x] 1.1 `tests/adminController.test.js`: extend `storeModulo` — POST `grabaciones_json` (2 URLs); assert `grabaciones` array + `activo: true` in `mockAdd.mock.calls[0][0]` (spec: "Create module with multiple recordings")
- [x] 1.2 `tests/adminController.test.js`: `storeModulo` case — blank/whitespace/empty URLs stripped, cap 10 (spec: "Submit with blank and valid URLs")
- [x] 1.3 `tests/adminController.test.js`: new describe `PUT /admin/capacitaciones/:idCap/modulos/editar/:idModulo` — saves `grabaciones`; removal mid-list 3→2 (spec: "Edit module removing middle recording")
- [x] 1.4 `tests/adminController.test.js`: new describe `GET .../modulos/editar/:idModulo` — renders `editModulo` with pre-filled `grabaciones` JSON
- [x] 1.5 `tests/mainController.test.js`: build Firestore query-chain mock; new describe `GET /capacitaciones/:slug` — 3 grabaciones render 3 links, `claseGrabada`-only renders 1, none renders 0 (spec: "Legacy module", "Module with three recordings")
- [x] 1.6 Run `npm test` — confirm new tests FAIL (RED)

## Phase 2: GREEN — write path

- [x] 2.1 `controller/adminController.js`: extract `parseGrabaciones(body)` — `JSON.parse(grabaciones_json || '[]')`, trim, filter empty, `.slice(0,10)`, try/catch → `[]`
- [x] 2.2 `storeModulo`: call helper, add `grabaciones` to `add()`; append `activo: true` last, wrapped in `// BEGIN activo-gap-fix` / `// END activo-gap-fix`
- [x] 2.3 `updateModulo`: call helper, add `grabaciones` to `update()`
- [x] 2.4 `views/admin/capacitaciones/createModulos.ejs`: replace `claseGrabada` block (lines 52-58) with hidden `grabaciones_json` + container + add/remove buttons + inline JS (design target markup)
- [x] 2.5 `views/admin/capacitaciones/editModulo.ejs`: same replacement (lines 50-56), pre-filled via `JSON.stringify(modulo.grabaciones || [])`
- [x] 2.6 Run `npm test` — 1.1–1.4 green

## Phase 3: GREEN — candidate render

- [x] 3.1 `views/capacitaciones/detail.ejs`: replace `claseGrabada` block (lines 70-78) with `recordings` loop — `grabaciones.length` wins, else `[claseGrabada]` (design render snippet)
- [x] 3.2 Run `npm test` — 1.5 green

## Phase 4: Verification / Cleanup

- [x] 4.1 Full `npm test` — all suites green incl. existing `storeModulo`/`deleteModulo` regression
- [x] 4.2 Manual sanity: add/remove URL inputs in create + edit forms; confirm edit pre-fill; no regressions in candidate detail
