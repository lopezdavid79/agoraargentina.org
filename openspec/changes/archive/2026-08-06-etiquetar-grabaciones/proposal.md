# Proposal: Etiquetar grabaciones (per-recording labels)

## Intent

Every recording in a módulo renders as a static "Clase Grabada" link. Admins need per-recording labels so candidates can distinguish recordings. This delivers the `{url, label}` evolution the previous change (`grabaciones-multiples-por-modulo`) explicitly anticipated. Live Firestore: only 1 module holds `grabaciones` (2 plain strings); 28 rely on legacy `claseGrabada` — no migration needed.

## Scope

### In Scope
- `parseGrabaciones` rewrite: accepts `string` AND `{url,label}` elements, normalizes every element to `{url, label}`; drops empty-url elements; cap 10; `try/catch` → `[]`.
- `storeModulo` / `updateModulo`: persist normalized `{url,label}[]` (shared helper, call sites unchanged).
- Both admin forms: per-row label + URL inputs (informes `participantes` `data-idx`/`data-campo` pattern → hidden `grabaciones_json` as `[{url,label}]`).
- Edit seed (INCLUDED — legacy URLs must not be lost): `claseGrabada` and string-array elements pre-fill as `{url, label}` with default label "Clase Grabada N" (1-based position), admin can change it; legacy URL preserved into `grabaciones[0]` on save.
- `detail.ejs`: link text = label, href = url; fallback "Clase Grabada N" by position; keep sub-line "Video del encuentro virtual".
- Rewrite ~10 tests asserting string shapes (RED first) + new label cases.

### Out of Scope
- Data migration/backfill of existing docs (normalizer handles the 1 string module).
- Cypress E2E.
- Deleting `claseGrabada` or the legacy fallback path.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `capacitaciones-modulos`: Data Model (`string[]` → `{url,label}[]`), Admin Forms (label+URL rows, edit prefill with default labels), Validation (object normalization, label optional), Candidate Render (dynamic label text, positional fallback), Out-of-Scope (per-recording labels move in).

## Approach

Approach A from exploration: evolve `grabaciones` to `{url,label}[]` objects with a defensive normalizer on write and render. Forms reuse the participantes two-inputs-per-row precedent. Strict TDD: string-shape tests go RED first, rewritten for the object shape with new label cases.

## Backward Compatibility

- Render normalizer MUST accept plain `string` elements → `{url: s, label: ""}` → fallback label. The live 2-string module keeps rendering without migration.
- `parseGrabaciones` MUST tolerate both wire shapes (object arrays and legacy string arrays).
- `claseGrabada` fallback (28 modules) untouched; edit seed MUST keep migrating legacy URL into `grabaciones[0]`.

## Render Fallback Rule

Link text = `label.trim()` when non-empty, else `"Clase Grabada " + (index+1)` over the normalized recordings list (positional, 1-based). Confirms decision 4: empty/custom-less labels fall back to "Clase Grabada N".

## Label Length

No hard max length — consistent with `tituloModulo` (no length caps anywhere in this codebase; render uses auto-escaping `<%= %>`).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `controller/adminController.js` | Modified | `parseGrabaciones` normalize; call sites unchanged |
| `views/admin/capacitaciones/createModulos.ejs` | Modified | Label+URL rows, hidden JSON of objects |
| `views/admin/capacitaciones/editModulo.ejs` | Modified | Same + prefill default labels, legacy seed |
| `views/capacitaciones/detail.ejs` | Modified | Label as link text, positional fallback |
| `tests/adminController.test.js` | Modified | ~8 tests rewritten + new cases |
| `tests/mainController.test.js` | Modified | ~2 render tests rewritten + string-element case |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live string module loses links | Low | Render-normalizer unit test |
| Legacy URL lost on edit | Low | Seed test guards `claseGrabada` → `grabaciones[0]` |
| innerHTML escaping (labels) | Med | Escape `"` in JS like existing; EJS `<%= %>` auto-escapes |
| Test churn | Med | Strict TDD RED first, bounded rewrite |

## Rollback Plan

Additive field evolution. Revert: restore `parseGrabaciones` string-only, single-input forms, static label render — but KEEP the render normalizer so already-saved `{url,label}` docs still render. `npm test` must stay green.

## Dependencies

- None (routes unchanged; no new packages).

## Success Criteria

- [ ] Create/edit stores `{url,label}[]`; labels render as link text
- [ ] Edit of legacy/string module pre-fills default labels and keeps the URL on save
- [ ] Empty label renders "Clase Grabada N" by position
- [ ] All tests green (rewritten RED first)

## Open Decisions (for spec/design)

- Row field order + ARIA copy (recommend: label first; "Etiqueta grabación N" / "URL grabación N").
- Numbering source: 1-based position over the final recordings list used for render (grabaciones, else `[claseGrabada]`).
