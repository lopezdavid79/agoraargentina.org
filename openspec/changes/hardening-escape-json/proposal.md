# Proposal: Hardening — JSON-in-script escaping (`hardening-escape-json`)

## Intent

Stored XSS via `</script>` breakout: 3 EJS templates inject admin free text into inline `<script>` blocks with unescaped `<%- %>`. A stored `</script>` terminates the script block early → injection on every admin edit render. Eliminate via centralized OWASP `\uXXXX` escaping.

## Scope

### In Scope
- New `config/ejsHelpers.js`: `jsonScript(value)` escapes `< > &` → `\u003c \u003e \u0026` plus U+2028/U+2029 (OWASP Rule 3.1).
- Register `app.locals.jsonScript` in `app.js`.
- 3 templates → `<%- jsonScript(...) %>`: `editModulo.ejs:94`, `form_fields.ejs:268`, `form_fields.ejs:302` (raw pre-serialized variant).
- Controller contract: `informesController.js:83` passes parsed `participantes` array (drop `participantesJSON` string) so site 3 uses same helper.
- Tests (RED-first): `jsonScript` unit tests; editModulo GET breakout in `tests/adminController.test.js`; new `tests/informesController.test.js` for `GET /admin/informes/editar/:id` (zero coverage today).

### Out of Scope
- Scrubbing already-stored Firestore payloads (documented limitation — rendering fix only).
- Other template/view cleanup.

## Capabilities

### New Capabilities
- `script-json-escaping`: JSON in inline `<script>` rendered breakout-safe via `\uXXXX` (incl. U+2028/U+2029).

### Modified Capabilities
- `contact-sanitization`: explicit exception — script-context JSON uses `<%- jsonScript(...) %>`, not `<%=`; HTML-context mandate unchanged. No conflict: OWASP — entity escaping alone is insufficient in script data.

## Approach

Exploration Approach 1: single source of truth, parser-agnostic, unit-testable. Site 3 normalized via controller. No new deps.

## Affected Areas

| Area | Impact |
|------|--------|
| `config/ejsHelpers.js` | New |
| `app.js` | Modified |
| `views/admin/capacitaciones/editModulo.ejs:94` | Modified |
| `views/admin/informes/form_fields.ejs:268,302` | Modified |
| `controller/informesController.js:83` | Modified |
| `tests/adminController.test.js`, `tests/ejsHelpers.test.js` | Modified/New |
| `tests/informesController.test.js` | New |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stored payloads remain in Firestore | High | Documented limitation |
| Output bytes change on 3 templates | Low | Audited: no assertions match escaped chars |
| Site 3 contract change breaks render | Med | Template+controller in one change set; route tests |
| Helper missing in a render context | Low | `app.locals` covers all renders; PDF unaffected |

## Rollback Plan

Single-commit revert: restore `participantesJSON` (controller:83), revert 3 template lines to inline `JSON.stringify`/raw injection, remove helper + `app.locals` wiring. Re-run `npm test`.

## Dependencies

- None (no npm packages). Template + controller changes land together.

## Success Criteria

- [ ] `jsonScript` tests green: `< > & </script>` U+2028/U+2029 quotes non-ASCII nesting.
- [ ] editModulo breakout test: no `"</script>"` in `res.text`; `\u003c/script\u003e` present.
- [ ] New informesController tests cover sites 2+3 breakout; valid data still renders.
- [ ] `npm test` fully green (existing 107 + new).
