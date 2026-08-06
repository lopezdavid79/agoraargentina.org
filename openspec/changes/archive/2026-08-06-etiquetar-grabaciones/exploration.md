# Exploration: Etiquetar grabaciones (labels on module recordings)

> Change: `etiquetar-grabaciones` — Exploration report (sdd-explore)
> Status: **success** — Executed: read current spec, archived change artifacts, controller, both admin forms, candidate view, all tests, and probed LIVE Firestore data (read-only).

## Executive Summary

Every recording in a modulo currently renders as a static "Clase Grabada" link. The previous change `grabaciones-multiples-por-modulo` stored `grabaciones: string[]` (plain URLs) and explicitly left the field shape "compatible with a future evolution to an array of `{url, label}` objects". Live Firestore confirms the evolution is safe: **34 modulos across 4 capacitaciones; only 1 has `grabaciones` and it is a 2-element array of plain strings; 28 rely on legacy `claseGrabada`; zero label-like fields exist anywhere**. The recommended approach is to evolve `grabaciones` to `[{url, label}]` objects with a defensive normalizer (handles leftover strings until re-saved), reusing the informes `participantes` multi-field-row precedent (`data-idx`/`data-campo` inputs → hidden JSON of objects). No Firestore migration needed. Effort: Medium. Strict TDD required — 10 existing tests assert string shapes and must be updated (RED first).

## Current Data Contract (exact)

### Firestore modulo document (`capacitaciones/{id}/modulos/{id}`)
| Field | Type | Notes |
|---|---|---|
| `orden` | number | `parseInt` on save. Required. |
| `tituloModulo` | string | Required. |
| `descripcion` | string | Default `""`. |
| `linkMaterial` | string | Material link (Drive/PDF). Default `""`. |
| `claseGrabada` | string | **Legacy** single recording URL. Default `""`. |
| `grabaciones` | `string[]` | **Primary** recording array. Trimmed non-empty URLs, cap 10. |
| `activo` | boolean | Written by `storeModulo` (gap-fix) and `updateModulo`. |
| `fechaCreacion` / `fechaActualizacion` | Date | |

Precedence on render: `grabaciones` wins when non-empty, else `claseGrabada` (`detail.ejs:70`).

### Live Firestore reality (probed 2026-08-06, read-only)
```
capacitaciones: 4 | modulos: 34
modulos with grabaciones array: 1
element shapes: {"string":1}          → ALL plain strings, no objects
string-only arrays: 1 | object-only: 0 | mixed: 0
modulos with label-like keys: 0      → no label/titulo/nombre/title on recordings
grabaciones only: 1 | legacy claseGrabada only: 28 | both: 0 | neither: 5
sample (cap b1DR2BRrIoFZRNv7qIdh / mod rgYKNmY07zr6tErryy1C):
  ["https://drive.google.com/file/d/1pr09KPayG4HDsJ9ksJ33CinK7iFlHu5T/view",
   "https://drive.google.com/file/d/1e0gTudDkp1THB6YtRYMAl05eQNd7NTdJ/view"]
```
So: **zero object-shaped data exists**. The only `grabaciones` array (2 strings) is on a live module — the renderer must tolerate string elements until that module is re-saved. The `claseGrabada` fallback path (28 modulos) must keep working untouched.

## Touch Points (file + line + snippet)

### 1. `controller/adminController.js` — parse + both write paths
`parseGrabaciones(body)` (**lines 7-12**) — currently string-only:
```js
function parseGrabaciones(body) {
    try {
        const raw = JSON.parse(body.grabaciones_json || '[]');
        return raw.map(s => String(s).trim()).filter(s => s.length > 0).slice(0, 10);
    } catch { return []; }
}
```
Note: `String(s)` on an object yields `"[object Object]"`, which would pass the filter — this helper MUST be rewritten for object elements.

- `storeModulo` (**lines 463-502**): `add({ orden, tituloModulo, descripcion, claseGrabada: ||"", linkMaterial: ||"", grabaciones: parseGrabaciones(req.body), fechaCreacion, activo: true /*gap-fix*/ })`.
- `updateModulo` (**lines 539-571**): `update({ ..., claseGrabada: claseGrabada || "", grabaciones: parseGrabaciones(req.body), activo: activo === "on", fechaActualizacion })`. The form no longer submits `claseGrabada`, so it is always `""` on save via the new form (legacy URL is carried over by the edit seed, see below).

### 2. `views/admin/capacitaciones/createModulos.ejs` — form markup + inline JS
- Markup **lines 52-62**: "Grabaciones (YouTube)" label, `<div id="grabaciones-container">`, hidden `<input name="grabaciones_json">`, `#btn-add-grabacion` button.
- Inline JS **lines 136-187**: `grabData = <%- JSON.stringify((typeof modulo !== 'undefined' && modulo.grabaciones) ? modulo.grabaciones : []) %>`; each row is a **single** `<input type="url">` (`data-idx`, placeholder `https://youtube.com/...`, aria-label "Grabación N") + remove button; `syncJSON()` → `JSON.stringify(grabData)`; submit listener.

### 3. `views/admin/capacitaciones/editModulo.ejs` — same, pre-filled
- Markup **lines 50-60** (same as create).
- Inline JS **lines 87-139**, with the documented deviation (**line 87**):
```ejs
<% const initialGrabaciones = (modulo.grabaciones && modulo.grabaciones.length) ? modulo.grabaciones : (modulo.claseGrabada ? [modulo.claseGrabada] : []); %>
```
Legacy `claseGrabada` seeds as the first grabación so editing a legacy-only module preserves its URL into `grabaciones` on save (no data loss, no migration — archive-report deviation).

### 4. `views/capacitaciones/detail.ejs` — candidate render
**Lines 70-79**:
```ejs
<% const recordings = (modulo.grabaciones && modulo.grabaciones.length) ? modulo.grabaciones : (modulo.claseGrabada ? [modulo.claseGrabada] : []); %>
<% recordings.forEach(function(url) { %>
  <a href="<%= url %>" ...>
    <div class="me-3 text-danger"><i class="fas fa-play-circle fa-lg"></i></div>
    <div>
      <span class="d-block fw-bold text-dark">Clase Grabada</span>
      <small class="text-muted">Video del encuentro virtual</small>
    </div>
  </a>
<% }); %>
```
Every recording renders the static label "Clase Grabada" / sub-label "Video del encuentro virtual". This is where the label must become dynamic (label text → `<span class="fw-bold">`, URL → `href`).

### 5. Routes — unchanged
`router/adminRouter.js:73-77`: createModulos / storeModulo / editModulo / updateModulo / deleteModulo. No route changes needed.

### 6. Tests
- `tests/adminController.test.js`:
  - `storeModulo` describe (574-679): 5 tests; **lines 629-678** assert `addData.grabaciones` as **string arrays** (2 URLs; strip+cap-10).
  - `updateModulo` describe (718-785): **lines 719-771** assert `updateData.grabaciones` string arrays + removal mid-list.
  - `editModulo` describe (790-828): **line 815** asserts rendered JSON `["https://youtube.com/a",...]` (string array) in `res.text`.
- `tests/mainController.test.js`, `detailCapacitaciones` describe (119-233): **lines 159-185** (3 recordings → `match(/Clase Grabada/g)` length 3), **187-209** (legacy fallback), **211-232** (zero links).
- Mock seams: `adminController.test.js:33-70` (chain `collection→doc→collection→add/update/get`), `mainController.test.js:127-142` (chain `collection→where→limit→get`, `collection→doc→collection→orderBy→get`). Reusable as-is for the new shape.

## Precedent: multi-field dynamic rows (informes `participantes`)

`views/admin/informes/form_fields.ejs:298-373` is the exact pattern needed for `{url, label}` rows: array-of-objects `partData`, one `<input>` per field with `data-idx` + `data-campo`, on `input` → `partData[i][campo] = value`, remove button `splice(idx,1)` + re-render, hidden JSON `participantesJSON` synced on submit. `informesController.js:216-221` parses the JSON into an array of objects and stores it as-is. This is the direct precedent for two-inputs-per-recording rows.

## Gaps / Unknowns the Proposal Must Decide

1. **Label optional vs required** — request says "optional LABEL". Decide: label is optional; empty label → fallback text "Clase Grabada" in render (and probably keep the "Video del encuentro virtual" sub-line). **Recommendation: optional.**
2. **Max label length** — no length caps exist elsewhere (`tituloModulo` is unbounded). Decide: no cap (consistent) or a sane cap (~100 chars). Must be specified.
3. **Backward compat with string arrays** — 1 live module has `grabaciones` as plain strings. Decide: render must tolerate both `string` and `{url,label}` elements (defensive normalizer) vs. one-time backfill of that single module. **Recommendation: defensive normalize, no migration** (matches the previous "no migration" decision; the string module gets re-saved in object form next edit).
4. **Default labels for existing recordings** — when editing a legacy module or string-array module, seeded recordings get `label: ""` → render fallback "Clase Grabada". Decide whether to auto-generate labels (e.g. "Clase N") or leave empty. **Recommendation: leave empty (fallback covers it); no backfill.**
5. **Hidden-JSON wire format** — `grabaciones_json` now carries `[{url, label}]`. The parser must also tolerate the old string-array format (defensive `try/catch`, normalize both). Old clients can't post (form is the only writer), but the live string data is on-disk, not in the wire — wire tolerance is cheap insurance.
6. **Form row UX / order** — per row: URL input + label input (two columns, `data-idx`/`data-campo` per participantes). Decide label field first (it's the visible text) or URL first (it's required). Placeholders + ARIA labels must follow the existing a11y style ("Grabación N", "Etiqueta grabación N").
7. **Cap of 10** — keep the existing 10-recording cap (spec-pinned). Label rows don't change it.
8. **Spec/scope changes** — the delta spec MUST rewrite requirement "Data Model — Multiple Recordings" (`string[]` → `{url,label}[]`, drop "URLs MUST be stored as plain strings"), the "Validation" requirement, and move "Per-recording labels or titles" OUT of Out-of-Scope. The existing sentence "field shape MUST remain compatible with a future evolution" becomes satisfied (this IS that evolution).

## Approaches

| # | Approach | Pros | Cons | Effort |
|---|---|---|---|---|
| A | **Evolve `grabaciones` to `[{url, label}]` objects** — normalize on write (`parseGrabaciones` accepts strings or objects, emits objects); forms get 2 inputs/row (participantes `data-idx`/`data-campo` pattern); render normalizes defensively (string element → `{url: s, label: ""}`); label text = link text, fallback "Clase Grabada" | Single source of truth; exactly the shape the spec anticipated ("future evolution to `{url, label}` objects"); participants precedent covers the UX; no migration (render tolerates the 1 string module) | Touches all 4 files + 10 tests (strict TDD RED first); render must handle mixed shapes until re-save; label escaping surface in innerHTML JS | **Medium** |
| B | **Keep `grabaciones: string[]` + parallel `grabacionesLabels: string[]`** (index-aligned) | `grabaciones` untouched → most of the write path unchanged; render reads label by index | Two arrays must stay index-aligned on remove (the exact fragility the hidden-JSON pattern avoids); contradicts the documented foresight; two sources of truth; form must sync two hidden inputs or one combined | Medium (but higher ongoing risk) |
| C | **New separate field, e.g. `grabacionesEtiquetas` keyed objects** — leave `grabaciones` strings, add `{url: label}` map | Zero changes to existing field | Third variant of the same concept; render/validation duplicated; nothing gained vs A | Medium |

## Recommendation

**Approach A**: evolve `grabaciones` to an array of `{url, label}` objects, exactly as the archived spec's "future evolution" sentence anticipated.

- `parseGrabaciones` rewrites each element: string → `{url: trimmed, label: ""}`; object → `{url: String(g.url||"").trim(), label: String(g.label||"").trim()}`; drop elements with empty url; cap 10; `try/catch` → `[]`.
- Forms: per-row **two** inputs (label + URL) using the participantes `data-idx`/`data-campo` binding; `grabaciones_json` carries `[{url,label}]`; edit seed normalizes `claseGrabada` → `[{url, label:""}]` and string arrays → `[{url, label:""}]`.
- Render (`detail.ejs`): normalize each recording to `{url, label}`; link text = `label || "Clase Grabada"`, href = `url`; sub-line "Video del encuentro virtual" retained. Mixed/string data (the 1 live module) renders correctly without migration.
- Tests: update the 10 existing string-shape assertions; add cases — create with labels, edit prefill with labels, label fallback when empty, string-element backward compat in render, mixed array.

## Risks

- **Test churn** — 10 existing tests assert `grabaciones` string arrays / "Clase Grabada" counts; strict TDD means they go RED first and must be rewritten for the object shape. Moderate diff in `tests/adminController.test.js` + `tests/mainController.test.js`.
- **Live string data** — the 1 module with 2 plain-string recordings must keep rendering until re-saved. If the render normalizer is forgotten, that module loses its links. Mitigate with a render-normalizer unit test.
- **innerHTML escaping** — labels are free text; the existing JS escapes `"` (`replace(/"/g,'&quot;')`); labels add a second field to escape. EJS render side uses `<%= %>` (auto-escaped) — safe. Screen-reader labels (this project targets NVDA) must stay descriptive ("Grabación N", "Etiqueta grabación N").
- **`claseGrabada` fallback (28 modulos)** — untouched; the edit seed keeps migrating legacy URLs into `grabaciones[0]` on first edit. Any change to the seed must preserve that behavior or legacy URLs are lost on edit (regression already guarded by the archive-report deviation).
- **Spec ambiguity** — label optionality, max length, and default-label behavior are product decisions; the proposal must pin them or apply will guess.

## Ready for Proposal

**Yes** — exploration complete. The orchestrator should tell the user: labels on recordings are fully feasible by evolving `grabaciones` to `[{url, label}]` objects (the shape the previous change anticipated). Only 1 live module holds string-format data (2 URLs) — render-side normalization avoids any migration. No other unknowns block the proposal; product decisions to pin are label optionality (recommend optional), max label length (recommend no cap or ~100), and no auto-generated default labels.
