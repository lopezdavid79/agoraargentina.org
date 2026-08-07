# Design: JSON-in-script escape hardening

## Technical Approach

Centralized EJS helper `jsonScript(value)` registered on `app.locals`. All 3 injection sites switch from bare `<%- JSON.stringify(...) %>` (or raw pre-serialized string) to `<%- jsonScript(...) %>`. Site 3 is normalized: controller passes parsed `participantes` array instead of a pre-serialized `participantesJSON` string, so all sites use the same helper signature. OWASP Rule 3.1 `\uXXXX` escaping (`<` `>` `&` U+2028 U+2029). No new npm deps.

Round-trip safe: `\u003c` etc. are valid JSON string escapes → client `JSON.parse()` decodes to original chars.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `\uXXXX` escaping (OWASP 3.1) vs HTML-entity (`&lt;`/`<%=`) | `\uXXXX` unambiguous, immune to parser entity-decoding variance; handles U+2028/U+2029; `\u003c` is JS-string-safe, not just HTML-safe | `\uXXXX` — OWASP recommendation, future-proof |
| Centralized helper vs per-site `.replace()` chains | Helper = single source of truth, unit-testable, discoverable; per-site = zero wiring but duplicates logic at each site | Centralized — one line per site, prevents regression |
| `app.locals` vs `res.locals` middleware | `app.locals` persists once across all requests/views; `res.locals` re-sets per-request unnecessarily | `app.locals` — Express auto-exposes `app.locals` properties to all EJS templates |

## Data Flow

```
Admin form (free text)
  └── Firestore (stored as-is, no scrubbing)
        └── Controller (reads doc, builds view data)
              └── EJS template: <%- jsonScript(value) %>
                    └── Browser: JSON.parse() → original chars restored
```

Site 3 normalisation:
```
Before: controller serializes → template raw-injects string
After:  controller passes parsed array → template jsonScript(array)
        ── all 3 sites use identical jsonScript(value) call pattern
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `config/ejsHelpers.js` | Create | `jsonScript(value)` — serializes + escapes `<` `>` `&` U+2028 U+2029 |
| `app.js` | Modify | Register `app.locals.jsonScript` after view engine config (line 19) |
| `views/admin/capacitaciones/editModulo.ejs:94` | Modify | `JSON.stringify(initialGrabaciones)` → `jsonScript(initialGrabaciones)` |
| `views/admin/informes/form_fields.ejs:268` | Modify | `JSON.stringify(...)` → `jsonScript(...)` |
| `views/admin/informes/form_fields.ejs:302` | Modify | `<%- d.participantesJSON %>` → `<%- jsonScript(participantes) %>`; guard `if (d.participantesJSON)` → `if (d.participantes && d.participantes.length)` |
| `controller/informesController.js:83` | Modify | Drop `participantesJSON` string; pass `participantes: informe.participantes \|\| []` (array) |
| `tests/adminController.test.js` | Modify | Add breakout test in editModulo describe block |
| `tests/informesController.test.js` | Create | `GET /admin/informes/editar/:id` breakout + valid-data render tests |
| `tests/ejsHelpers.test.js` | Create | Unit tests for `jsonScript` |

## Interfaces / Contracts

```js
// config/ejsHelpers.js
function jsonScript(value) {
  const json = JSON.stringify(value);
  const ESCAPE_MAP = { '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };
  return json.replace(/[<>&\u2028\u2029]/g, ch => ESCAPE_MAP[ch]);
}
module.exports = { jsonScript };
```

Controller contract change (informesController.edit, ~line 83):
```js
// Before:
datos: { ..., participantesJSON: JSON.stringify(informe.participantes || []) }
// After:
datos: { ..., participantes: informe.participantes || [] }
```

Template site 3 (form_fields.ejs:301-303):
```ejs
<% if (d.participantes && d.participantes.length) { %>
    try { partData = <%- jsonScript(d.participantes) %>; } catch(e) {}
<% } %>
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `jsonScript` helper: breakout payload, unicode, null, arrays, objects, empty string | `tests/ejsHelpers.test.js` — pure function, no mocking |
| Integration | editModulo GET renders escaped JSON | `tests/adminController.test.js` — seed modulo with `grabaciones[].label = '</script><script>alert(1)</script>'`, assert no literal `</script>`, `\u003c/script\u003e` present |
| Integration | informes edit GET renders escaped JSON (sites 2+3) | `tests/informesController.test.js` — mock Firestore doc with breakout text in `clases` and `participantes`, assert both sites escaped; also assert valid data still renders |

Mocking pattern for `informesController.test.js`: same as `adminController.test.js` — `jest.mock('../config/firebase')` before `require('../app')`, construct mock chain `db.collection('informes').doc(id).get()` resolving to a doc with `exists: true` and `.data()` returning test payload.

## Migration / Rollout

No migration required. Rendering-only change. Rollback: single-commit revert — restore `participantesJSON`, revert 3 template lines, remove helper + `app.locals` wiring.

## Invariant

No bare `<%- JSON.stringify(...) %>` or raw pre-serialized JSON injection in `<script>` context. Enforced by code review; grep `JSON\.stringify` in `.ejs` under `<script>` tags as pre-commit check.

## Open Questions

None.
