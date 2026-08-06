# Exploration: Grabaciones múltiples por módulo

> Change: `grabaciones-multiples-por-modulo` — Exploration report (sdd-explore)
> Status: **success** — Executed: read controllers, routers, admin views, candidate view, tests, and existing dynamic-form conventions.

## Executive Summary

Capacitaciones use a layered MVC (router → controller → view) over Firestore. Each capacitación doc (`capacitaciones` collection, id = slug) has a `modulos` subcollection. Each modulo doc stores a **single** recording as a plain URL string in the field **`claseGrabada`** (labeled "Link a Grabación (YouTube)"). The admin manages modules through `controller/adminController.js` (`storeModulo`/`updateModulo`/`deleteModulo`) and the EJS views `createModulos.ejs` (create + list) and `editModulo.ejs` (edit). Candidates see the recording as one "Clase Grabada" link in `views/capacitaciones/detail.ejs`. There is **no** support for multiple recordings today. A proven convention for repeatable fields already exists in the informes admin form (`clase_1..N` inputs with add/remove buttons + a server-side `while` loop in `informesController.js`), which is the natural precedent to follow.

## Current State

### Flow
- Admin creates a capacitación → `storeCapacitacion` (`adminController.js:323`), doc id = slug, initial `estado: "borrador"`.
- Admin manages modules at `GET /admin/capacitaciones/:id/modulos` (`createModulos`, `adminController.js:436`): renders the module list + "Nuevo Módulo" form.
- `storeModulo` (`adminController.js:453`): reads `{ orden, tituloModulo, descripcion, claseGrabada, linkMaterial }`, validates only `tituloModulo` + `orden`, then `modulos.add({...})`.
- `updateModulo` (`adminController.js:525`): same fields plus `activo` (`activo === "on" ? true : false`).
- Candidates: `GET /capacitaciones/:slug` (`mainController.detailCapacitaciones`, `mainController.js:155`) loads active modules (`activo === true`), ordered by `orden`, and renders `capacitaciones/detail.ejs`.

### Modulo document schema (Firestore `modulos` subcollection)
| Field | Type | Notes |
|---|---|---|
| `orden` | number | Required. `parseInt` on save. |
| `tituloModulo` | string | Required. |
| `descripcion` | string | Default `""`. |
| `linkMaterial` | string (URL) | Material link (Drive/PDF). Default `""`. |
| **`claseGrabada`** | **string (URL)** | **THE single recording field.** YouTube link. Default `""`. |
| `activo` | boolean | Only written by `updateModulo`; **not set by `storeModulo`** (new modules lack the field → filtered out by `activo === true` until edited). Pre-existing gap. |
| `fechaCreacion` / `fechaActualizacion` | Date | |

Recording is a **single URL string**, not an object/array. No `grabacion`, `recording`, `video`, or `linkGrabacion` fields exist anywhere. (Note: the exploration brief expected `linkMaterial` as the recording field — it is NOT; the recording field is `claseGrabada`. `linkMaterial` is the downloadable material link.)

### Routes (`router/adminRouter.js:73-77`)
```
GET    /admin/capacitaciones/:id/modulos                → createModulos
POST   /admin/capacitaciones/:id/modulos/nuevo          → storeModulo
GET    /admin/capacitaciones/:idCap/modulos/editar/:idModulo → editModulo
POST   /admin/capacitaciones/:idCap/modulos/editar/:idModulo → updateModulo
DELETE /admin/capacitaciones/:idCap/modulos/eliminar/:idMod → deleteModulo
```
`method-override` (`_method`) is global (`app.js:37`). All state-changing routes are protected by `isAdmin` and the global CSRF middleware (hidden `_csrf` input in every form).

### Admin views
- **`views/admin/capacitaciones/createModulos.ejs`** — create form: `orden`, `tituloModulo`, `descripcion`, `linkMaterial`, `claseGrabada` (single `<input type="url">`, lines 52-58). Below: module list table with edit/delete and a "Visible/Bloqueado" badge.
- **`views/admin/capacitaciones/editModulo.ejs`** — edit form: same fields pre-filled, plus `activo` switch (lines 50-56 for `claseGrabada`).

### Candidate-facing render
- **`views/capacitaciones/detail.ejs:70-78`** — renders `modulo.claseGrabada` as a single "Clase Grabada" list-group link ("Video del encuentro virtual"). `linkMaterial` rendered separately (lines 60-68). Multiple recordings would be displayed here as additional list items.

### Existing "repeated field" conventions (the pattern to copy)
- **`views/admin/informes/form_fields.ejs:265-296`** — dynamic numbered inputs `clase_1..clase_N` in `#dosificacion-container`, `btn-add-clase`/`btn-remove-clase` buttons re-render the list, pre-filled from edit data (`d.clasesText` split by newline, strips `N|` prefix).
- **`controller/informesController.js:209-214`** — server-side parse: `while (body[`clase_${i}`] !== undefined) { clases.push(...); i++; }`.
- **`views/admin/informes/form_fields.ejs:298-369`** — alternative convention: a hidden JSON input (`participantes`) synchronized via JS on input, `JSON.parse` server-side (`informesController.js:216-221`).
- No such pattern exists yet in the capacitaciones views (only slug/date/image-preview listeners in other admin forms).

### Tests
- **`tests/adminController.test.js`** — Jest + supertest with mocked firebase (`mockAdd`, `mockDelete`, etc., chained via `mockCollection`). Module tests: `storeModulo` (creates+redirects, 400 on missing `tituloModulo`/`orden`, 500 on firebase error — lines 574-628) and `deleteModulo` (2 tests — lines 633-661). **No tests for `editModulo`/`updateModulo`**.
- **`tests/mainController.test.js`** — only tests `/contacto`; **no tests for `capacitacionesViews`/`detailCapacitaciones`**.
- **Cypress 15** — single spec `cypress/e2e/flujo_completo_curso.cy.js` (courses flow only; no capacitaciones/modules E2E).
- Config: `openspec/config.yaml` — Jest unit (`npm test`, `--runInBand`), strict TDD (`apply.tdd: true`), Cypress baseUrl `localhost:3000`.

## Affected Areas

| File | Why |
|---|---|
| `controller/adminController.js` | `storeModulo`/`updateModulo` must collect multiple recording URLs into the new field; `createModulos`/`editModulo` unchanged (they just pass data). |
| `views/admin/capacitaciones/createModulos.ejs` | Replace single `claseGrabada` input with repeatable URL inputs (+ add/remove). |
| `views/admin/capacitaciones/editModulo.ejs` | Same, pre-filled from existing data. |
| `views/capacitaciones/detail.ejs` | Render all recordings as list-group links (plus legacy `claseGrabada` fallback). |
| `tests/adminController.test.js` | Extend `storeModulo` tests; add `updateModulo` tests (currently missing). |
| (optional) `tests/mainController.test.js` | Add coverage for `detailCapacitaciones` render if candidate-side behavior is specified. |

## Gaps / Unknowns the Proposal Must Decide

1. **Max number of recordings** — no requirement stated; recommendation: unbounded (or a sane cap like 10) — must be specified.
2. **Field naming & migration strategy** — keep `claseGrabada` (string) and add a new array field (e.g. `grabaciones: string[]`)? Or migrate `claseGrabada` into the array everywhere? **Backward compatibility**: existing modules have `claseGrabada` populated — the render must still show them.
3. **Labels for recordings** — plain URLs only (informes `clase_` style), or optional per-recording title/description (object array)? Affects form UX and render.
4. **Form submission convention** — numbered inputs (`clase_1..N` + `while` loop) vs. hidden JSON input (`participantes` style). Both precedents exist; the JSON one survives reordering/removal in edit mode more cleanly.
5. **`activo` gap** — `storeModulo` never sets `activo`; newly created modules are invisible to candidates until edited. Adjacent bug worth fixing in the same touch-point (proposal should decide).
6. **Server-side validation** — current module forms have none beyond required fields; multiple URLs add surface (basic URL shape / dedup / max count).

## Approaches

1. **Add array field, keep legacy string (backward-compatible)** — new field `grabaciones` (array of URL strings); `storeModulo`/`updateModulo` write it from the dynamic form inputs; `detail.ejs` renders `grabaciones` array and falls back to `claseGrabada` when empty.
   - Pros: no data migration; existing modules keep working; matches Firestore native arrays; minimal diff.
   - Cons: two fields represent the same concept (dual source of truth in read paths).
   - Effort: Low-Medium.

2. **Migrate to array only** — one-time backfill script moves every module's `claseGrabada` into `grabaciones: [claseGrabada]`, then remove the string field everywhere.
   - Pros: single source of truth; cleanest model.
   - Cons: requires migration script + validation over live data; more risk and churn; the audit trail of `claseGrabada` disappears from docs (though Firestore keeps old versions).
   - Effort: Medium.

3. **Reuse informes numbered-field convention verbatim** — `claseGrabada_1..N` inputs + `while (body[\`claseGrabada_${i}\`])` parse, no new field name (reuse existing `claseGrabada` as a joined string? no — separate `claseGrabada_*` fields would need a wrapper or an array anyway).
   - Pros: zero new server-side concepts; matches existing informes code exactly.
   - Cons: numbered fields renumber/break on removal in edit mode (informes mitigates by re-render); naming collision with existing `claseGrabada`; still ends up needing an array on the doc.
   - Effort: Medium.

## Recommendation

**Approach 1**: add a `grabaciones` array field (plain URL strings), keep `claseGrabada` as legacy fallback, implement the repeatable URL inputs in both admin forms following the informes JS pattern (ideally the hidden-JSON variant for cleaner edit/reorder semantics), and render all recordings in `capacitaciones/detail.ejs` with `claseGrabada` fallback. It is the lowest-risk option: no migration, backward compatible, and the field name (`grabaciones`) matches the change name and the UI label ("Grabación"). Recommend also fixing the `activo`-on-create gap in the same change since it touches the exact same form/submission path.

## Risks

- **Backward compatibility** — if the new field replaces `claseGrabada` without a fallback, all existing modules (already published to candidates) lose their recording link. Mitigated by Approach 1's fallback.
- **Dual source of truth** — modules could have both `claseGrabada` and `grabaciones`; the proposal must pin down precedence (recommend: `grabaciones` wins when non-empty).
- **No existing tests for `updateModulo`/candidate render** — the change adds behavior in untested code paths; strict TDD (`config.yaml: strict_tdd: true`) means new tests must be written, and the 400/500 behaviors of `updateModulo` are currently unverified.
- **EJS/JS inline-script conventions** — the dynamic-input JS must follow the existing vanilla-JS, accessibility-aware style (ARIA labels used throughout); the project has no bundler or formatter.
- **No Cypress coverage for capacitaciones** — E2E risk if the admin flow regresses; adding a Cypress spec is optional and was not requested.

## Ready for Proposal

**Yes** — exploration complete. The orchestrator should tell the user: multiple recordings per module is feasible with a backward-compatible array field (`grabaciones`) layered on the existing `claseGrabada` string, reusing the informes dynamic-form pattern. One open product question for the proposal: **do recordings need individual labels/titles, or plain URLs are enough?** (Recommend plain URLs for v1.)
