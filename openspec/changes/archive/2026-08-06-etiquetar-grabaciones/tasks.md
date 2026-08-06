# Tasks: Etiquetar grabaciones

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380–450 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (write+render) → PR 2 (forms) |
| Delivery strategy | ask-always (session override) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `{url,label}` write + render: parseGrabaciones, detail.ejs, save/render tests | PR 1 | Backward-compatible (strings still render); ~180–200 lines, own verification |
| 2 | Admin forms: two-input rows + EJS prefill defaults, edit-seed tests | PR 2 | Completes label UX; ~200–230 lines; base = PR 1 |

## Phase 1: Write + Render (PR 1)

- [x] 1.1 RED: rewrite storeModulo multi-grabaciones + strip/cap-10 tests to `[{url,label}]` (tests/adminController.test.js:629-678)
- [x] 1.2 RED: rewrite updateModulo save + middle-removal tests to object assertions (tests/adminController.test.js:719-771)
- [x] 1.3 GREEN: rewrite parseGrabaciones (controller/adminController.js:7-12): string→`{url,label}`, object preserved, trim url, drop empty, cap 10, try/catch→[]
- [x] 1.4 GREEN: add parseGrabaciones unit cases: mixed blank+valid, legacy string array, malformed JSON→[]
- [x] 1.5 RED: rewrite 3 detailCapacitaciones tests + add 3 (mixed labels, string fallback, renumber) (tests/mainController.test.js)
- [x] 1.6 GREEN: detail.ejs:70-79 inline normalizer — linkText = label.trim() || "Clase Grabada "+(idx+1), keep sub-line "Video del encuentro virtual"

## Phase 2: Admin Forms (PR 2)

- [x] 2.1 RED: add editModulo legacy-seed test — claseGrabada prefills "Clase Grabada 1", URL kept in grabaciones[0] on save
- [x] 2.2 RED: add editModulo string-array-seed test ("Clase Grabada 1/2"); rewrite prefill JSON test to object shape (line 815)
- [x] 2.3 GREEN: editModulo.ejs:87 → initialGrabaciones map (string→default label, object preserved)
- [x] 2.4 GREEN: createModulos.ejs + editModulo.ejs scripts → two-input rows (data-idx/data-campo per participantes), grabData `[{url,label}]`, add pushes `{url:'',label:''}`, escape `"` in both fields
- [x] 2.5 GREEN: add updateModulo labeled-object save test

## Phase 3: Verification

- [x] 3.1 `npm test` full suite green; no string-shape `grabaciones` assertions remain
- [x] 3.2 Cross-check spec scenarios: create labels, legacy fallback, edit seeds, renumbering, cap 10
- [x] 3.3 Rollback check: revert parseGrabaciones + single-input forms; keep render normalizer so object docs still render
