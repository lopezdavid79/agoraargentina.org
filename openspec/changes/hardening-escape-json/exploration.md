# Exploration: Hardening — JSON-in-script escaping (`hardening-escape-json`)

## Current State

Three EJS templates inject serialized JSON directly into inline `<script>` blocks using EJS **unescaped output** (`<%- ... %>`). Because `<%-` does NOT HTML-escape, any admin-entered free text containing the literal sequence `</script>` terminates the inline `<script>` block early, allowing markup/script injection into the rendered admin page (HTML-context breakout before JS parsing). Data flows from admin form → Firestore → controller → template, so the injected content is stored and re-rendered on every edit GET.

The pattern was flagged in the `2026-08-06-etiquetar-grabaciones` verify report as a SUGGESTION (non-blocking, pre-existing precedent, authenticated-admin threat actor) and deferred to a dedicated hardening change.

EJS is configured plainly in `app.js:18-19` (`app.set('view engine', 'ejs')`, `app.set('views', ...)`). No EJS options, no `app.locals` helper functions, no filters. `app.js:58-75` sets only plain `res.locals` values. There is **no existing JSON-in-script escaping helper** anywhere in the codebase.

## Injection Sites (complete inventory)

Exhaustive grep for `<%- JSON.stringify` / `<%= JSON.stringify` / raw JSON-in-script in all `*.ejs`:

### 1. `views/admin/capacitaciones/editModulo.ejs:94` — HIGH RISK (new, etiquetar-grabaciones)
```ejs
var grabData = <%- JSON.stringify(initialGrabaciones) %>;
```
- Data: `initialGrabaciones` = `[{url, label}]` array (lines 87-91). Both `url` and `label` are **admin-entered free text** stored via `parseGrabaciones` (`adminController.js:9-22`, no HTML/strip validation; only trim + cap 10). `label` is the recording label from the etiquetar-grabaciones change.
- Context: inside inline `<script>` (line 92). **Breakout if label/url contains `</script>`.**
- Existing tests: `tests/adminController.test.js:846-927` (editModulo GET render, 3 seeding tests + 404).

### 2. `views/admin/informes/form_fields.ejs:268` — HIGH RISK (pre-existing)
```ejs
clasesIniciales = <%- JSON.stringify((d.clasesText || '').split('\n').map(l => l.replace(/^\d+\|/, ''))) %>;
```
- Data: `d.clasesText` is built in `informesController.edit` (line 80-82) from `informe.clases` — **admin-entered free text** (per-class content, e.g. "Word Accesible con NVDA"). The `.split('\n')`/`.replace(/^\d+\|/,'')` transform runs server-side; free text is preserved verbatim.
- Context: inside inline `<script>` (line 253). **Breakout on any clase containing `</script>`.**
- Rendered only on edit (`admin/informes/edit.ejs:15`); create passes `{ datos: {} }` so the `if (d.clasesText)` guard (line 267) skips. No test currently covers this render.

### 3. `views/admin/informes/form_fields.ejs:302` — HIGH RISK (pre-existing, raw variant)
```ejs
try { partData = <%- d.participantesJSON %>; } catch(e) {}
```
- Data: `d.participantesJSON` = `JSON.stringify(informe.participantes || [])` (controller line 83). `participantes[].nombre` (and other fields) are **admin-entered free text** (round-trip: client `JSON.stringify(partData)` → hidden input → `JSON.parse` in `_extraerDatos` → Firestore → re-serialized on edit). This is NOT a `JSON.stringify` call in the template — it injects a **pre-serialized JSON string raw**, same breakout class.
- Context: inside the same inline `<script>` (line 253). **Breakout on any participant name containing `</script>`.**
- Same guard/coverage situation as site 2 (edit-only, untested).

### Non-issues (verified)
- `views/admin/capacitaciones/createModulos.ejs` — `grabData = []` only, no injection.
- `views/cv.ejs:348-350` — `JSON.stringify(expData)` are **runtime client-side** calls into hidden-input `.value`, not template interpolation. Safe.
- All other `<%-` occurrences in `*.ejs` are `include(...)` calls or detail-view body content already handled by the `auditoria`/`contact-sanitization` changes.

## EJS Config / Helper Availability

- `app.js:18-19` — default EJS setup. No custom options, no helpers.
- `app.locals` — **never used** in `app.js`. `res.locals` middleware (lines 58-75) sets plain values only.
- No existing JSON/sanitization helper module for views. Only `sanitize-html` (used in `mainController.processContacto`) and `middleware/upload.js: sanitizeFilename` exist as sanitization conventions — neither applies to script-context JSON.
- Conventions in forms: `"` is escaped per-field via `.replace(/"/g,'&quot;')` at runtime in the admin form scripts (attribute-context only; does NOT cover script breakout).

## Approaches

| # | Approach | Pros | Cons | Effort |
|---|----------|------|------|--------|
| 1 | **EJS helper `jsonScript()`** (recommended): new module (e.g. `config/ejsHelpers.js`) exporting `jsonScript(value) = JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')`, registered as `app.locals.jsonScript`. Use `<%- jsonScript(...) %>` at all 3 sites. For site 3, controller passes the parsed array (`participantes: informe.participantes \|\| []`) so the same helper applies. | OWASP Rule 3.1 exact recommendation; single source of truth; immune to parser nuances; handles U+2028/U+2029; unit-testable module; future sites just use the helper | One new module + `app.js` wiring + controller tweak for site 3 | Low-Med |
| 2 | **Inline `.replace()` chains** at each `<%- ... %>` site (no helper, no app.js change) | Zero wiring; minimal diff | Duplicated logic at every site; easy to forget on future templates; U+2028/U+2029 handling must be re-added each time; site 3 needs a raw-string variant | Low |
| 3 | **Switch to `<%= JSON.stringify(...) %>`** (HTML-entity escape) | One-token change per site; browsers decode char refs in script data and end-tag matching happens on raw stream, so `&lt;/script&gt;` is safe | Does NOT handle U+2028/U+2029; relies on HTML5 entity decoding nuance (less defensible for non-standard parsers); site 3 becomes `<%= d.participantesJSON %>` (works, but different escaping style in same file) | Low |
| 4 | **Server-side pre-escape in controllers** (controllers emit already-escaped JSON strings) | No template/helper coupling | Escaping logic scattered across controllers; easy to regress when new fields are added; couples persistence shape to rendering concerns | Med |

**Recommendation: Approach 1.** It is the OWASP-endorsed `\uXXXX` escaping, centralized, unit-testable, and covers all three sites including the raw-string site 3 (by normalizing the controller to pass the parsed array). Effort Low-Medium, no new npm deps.

Note on approach 3 vs 1: `&lt;`-style entity escaping is widely used and safe in modern HTML5 parsers, but `\u003c` is unambiguous, works regardless of parser entity-decoding behavior, and also covers U+2028/U+2029 which can crash JS string literals in pre-ES2019 engines.

## Test Strategy (RED-first)

1. **`tests/adminController.test.js`** — add to the editModulo GET describe (lines 845-939): seed a modulo whose `grabaciones[].label` contains the breakout payload `</script><script>window.__x=1</script>`. Assert `res.text` does NOT contain `"</script>"` and DOES contain `\u003c/script\u003e`. Existing seeding assertions (lines 876, 900, 925) contain no `<`/`>` so they remain green.
2. **New `tests/informesController.test.js`** (or extend `informePDF.integration.test.js`) — `GET /admin/informes/editar/:id` (route `informesRouter.js:14`), mock Firestore doc with `clases: ["Intro</script>..."]` and `participantes: [{ nombre: "Juan</script>..." }]`. Assert escaped output for both site 2 and site 3, plus that valid data still renders. **No test covers this route today** (only the PDF route is tested).
3. **New unit test for `jsonScript`** (if Approach 1): `<`, `>`, `&`, `</script>` literal, U+2028/U+2029, quotes, non-ASCII, deep nesting.

Run `npm test` (Jest, `--runInBand`). Current suite is green (107 tests per etiquetar-grabaciones apply-progress).

## Risks

- **Stored payloads already in Firestore**: this change hardens rendering; it does not scrub previously stored malicious content. Out of scope for a rendering fix; document if needed.
- **Behavioral change in output**: escaped JSON changes `res.text` bytes on 3 templates. Any test/assertion matching exact JSON with `<`, `>`, `&`, or U+2028/U+2029 would break — audited: none exist today.
- **Helper availability**: if Approach 1, every EJS render must have `jsonScript` available. Registering via `app.locals` (app.js) covers all routes; the PDF render (`pdf/informe.ejs`) does not use this pattern and is unaffected.
- **Site 3 controller change**: passing the parsed `participantes` array changes the `edit` view-data contract; must be coordinated so spec/tasks keep template + controller in one change set.
- **Consistency with `contact-sanitization` spec**: that spec mandates `<%= %>` for user-controlled values. This change targets script-context JSON where `<%= %>` alone is insufficient per OWASP; the proposal should note the distinction to avoid spec conflicts.

## Ready for Proposal

**Yes.** Complete site inventory, data-flow analysis, approach options, and a RED-first test plan are documented. The orchestrator should tell the user: 3 high-risk injection sites confirmed (2 flagged + 1 raw-string variant of the same class), no existing helper, recommended fix is a centralized `jsonScript` helper (`\u003c`/`\u003e`/`\u0026`/U+2028/U+2029 escapes) applied at all 3 sites with RED-first render tests, including new coverage for the currently untested `GET /admin/informes/editar/:id` route.
