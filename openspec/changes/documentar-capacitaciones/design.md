# Design: Documentación del Módulo Capacitaciones (HTML + Referencia Firebase)

## Technical Approach

Three self-contained HTML files under `docs/capacitaciones/`, each covering a distinct documentation dimension (overview, implementation blueprint, Firestore schema). All follow the precedent `docs/test-fase1-upload-imagenes.html`: `<html lang="es">`, `<meta charset="UTF-8">`, all CSS in an inline `<style>` block, no external dependencies. Content is structured as a layered manual — a developer should be able to read these files and rebuild the module from scratch without exploring the codebase. Every section cites its authoritative source file:line so the reader can re-verify.

No runtime behavior changes. This is a pure additive deliverable — three HTML files committed to the repo.

## Architecture Decisions

### Decision 1: Inline `<style>` per file (no shared CSS)

| Option | Tradeoff |
|--------|----------|
| Shared `.css` file | Requires a link tag, breaks self-containment, extra file to maintain |
| Inline `<style>` per file (precedent) | Self-contained, browser-openable from any filesystem location |

**Choice**: Inline `<style>` — same pattern as `docs/test-fase1-upload-imagenes.html`.

**Rationale**: These docs must be openable by double-clicking from any directory. Self-containment eliminates broken-link risk.

### Decision 2: Language and charset

| Option | Tradeoff |
|--------|----------|
| `<html lang="es">` + UTF-8 | Matches codebase Spanish, accessible to screen readers |
| English | Code identifiers are Spanglish, but the audience is Spanish-speaking |

**Choice**: Spanish for all prose (`lang="es"`). Code identifiers, field names, and file paths stay as-is from the codebase.

**Rationale**: The team and target audience are Spanish-speaking. Screen reader users benefit from correct `lang` attribute.

### Decision 3: Three-file split vs. single monolithic doc

| Option | Tradeoff |
|--------|----------|
| Single `index.html` | Hard to navigate, large diff, harder to review |
| Three topical files | Each file self-contained, parallel authoring possible, focused review |

**Choice**: Three files: `index.html`, `implementacion.html`, `firestore.html`.

**Rationale**: Each file answers a distinct question — "What is this module?" (index), "How is it built?" (implementacion), "What data does it store?" (firestore). Cross-linked via nav.

### Decision 4: Visual style precedent

| Option | Tradeoff |
|--------|----------|
| Reuse `test-fase1-upload-imagenes.html` styles verbatim | Established pattern, green accent (`#0a6`), system-ui font |
| New visual theme | Creates inconsistency with precedent |

**Choice**: Reuse the precedent's color palette (`#0a6` accent, `#1e1e2e` code blocks, `.step` callouts), table styling, and typography from `docs/test-fase1-upload-imagenes.html`.

**Rationale**: Consistency across `docs/` directory. The precedent already looks professional and readable.

## Deliverable Structure

```
docs/capacitaciones/
├── index.html              ← Overview, purpose, architecture, routes, flows
├── implementacion.html     ← Layer-by-layer implementation blueprint
└── firestore.html          ← Firebase data reference: collections, schemas, samples
```

All three files share:
- `<!DOCTYPE html>` / `<html lang="es">` / `<meta charset="UTF-8">`
- Inline `<style>` block (copy palette/typography from `docs/test-fase1-upload-imagenes.html` — `body { font-family: system-ui, sans-serif; }`, `h1 { border-bottom: 2px solid #0a6; }`, `code`/`pre` styling, `.step` callouts, `.badge-*` classes)
- Shared `<nav>` at top linking all three pages with current-page highlighting
- Footer with generation context (`Cambio: documentar-capacitaciones`)
- Table of contents (anchored `<ul>`) after the `<h1>`

## Navigation & UX

Each page's `<nav>` contains:
```html
<nav aria-label="Documentación de Capacitaciones">
  <a href="index.html">Visión General</a> |
  <a href="implementacion.html">Implementación</a> |
  <a href="firestore.html">Firebase</a>
</nav>
```

The current page link receives `class="active"` (bold, no underline). Every `<h2>` gets an `id` for anchor linking. The ToC at the top links to each section via `href="#section-id"`.

Cross-page references use `<a href="implementacion.html#...">` to link to specific sections.

## Content Outline per File

### index.html — Visión General

| Section | Content | Source Citations |
|---------|---------|-----------------|
| 1. Propósito del Módulo | What the module does (public training catalog + admin CRUD) | — |
| 2. Arquitectura General | Layered MVC: router → controller → Firestore, EJS views, session auth | `app.js:1-80` (middleware stack) |
| 3. Tabla de Rutas | Public routes + Admin routes with method, path, handler, middleware | `router/mainRouter.js:38-39` (public), `router/adminRouter.js:67-77` (admin) |
| 4. Flujo Público | Visitor browses `/capacitaciones` → clicks slug → detail with modules | `controller/mainController.js:142-185` |
| 5. Flujo Admin | Dashboard → create/edit/delete capacitación, manage modules | `controller/adminController.js:313-591` |
| 6. Ciclo de Vida `estado` | borrador → Activo → Terminado; public filter `where('estado', '==', 'Activo')` | `controller/adminController.js:353` (default "borrador"), `controller/mainController.js:146` (filter) |
| 7. Middleware y Seguridad | isAdmin, CSRF, rate limiter (contacto, 10/15min) | `middleware/authMiddleware.js:9-12`, `middleware/csrfMiddleware.js:1-38`, `router/mainRouter.js:10-22` |

### implementacion.html — Blueprint de Implementación

| Section | Content | Source Citations |
|---------|---------|-----------------|
| 1. parseGrabaciones | Hidden-JSON parser: string→object, trim, filter empty, cap 10, catch→[] | `controller/adminController.js:9-22` |
| 2. Controladores Admin | storeCapacitacion (slug gen, 11 fields, estado:"borrador"), updateCapacitacion (9 fields + fechaActualizacion), deleteCapacitacion, createModulos (GET), storeModulo (8 fields, activo:true), editModulo (GET fetch), updateModulo (POST 8 fields), deleteModulo | `controller/adminController.js:313-591` |
| 3. Controlador Público | capacitacionesViews (activo filter), detailCapacitaciones (slug lookup, activo gate, módulos filter activo:true) | `controller/mainController.js:142-185` |
| 4. Vistas — Públicas | index.ejs (card grid, slug links, empty state), detail.ejs (recordings loop, legacy fallback) | `views/capacitaciones/index.ejs:1-70`, `views/capacitaciones/detail.ejs:70-81` |
| 5. Vistas — Admin | dashboard.ejs (capacitaciones tab, table, copy-link, edit modal, delete), createModulos.ejs (add form + module list), editModulo.ejs (pre-fill modulo), form_fields.ejs (shared form fields for modal) | `views/admin/dashboard.ejs:192-248`, `views/admin/capacitaciones/createModulos.ejs:1-202`, `views/admin/capacitaciones/editModulo.ejs:1-149`, `views/admin/capacitaciones/form_fields.ejs:1-77` |
| 6. Patrones Clave | grabaciones_json hidden input + JS sync, jsonScript (OWASP 3.1), _csrf token in forms, isAdmin middleware, rate limiter, cap 10 recordings, legacy string fallback, normalización {url, label} | `views/admin/capacitaciones/createModulos.ejs:55-64` (hidden+JS), `config/ejsHelpers.js:14-17` (jsonScript), `middleware/csrfMiddleware.js:27` (_csrf), `controller/adminController.js:20` (slice 10) |

### firestore.html — Referencia Firebase

| Section | Content |
|---------|---------|
| 1. Jerarquía de Colecciones | `capacitaciones/{slug}` → `modulos/{autoId}` (subcollection) |
| 2. Schema: `capacitaciones/{slug}` | Full table: campo, tipo, requerido, default, notas |
| 3. Schema: `capacitaciones/{slug}/modulos/{autoId}` | Full table: campo, tipo, requerido, default, notas |
| 4. Documento Ejemplo: capacitación | Complete JSON sample |
| 5. Documento Ejemplo: módulo | Complete JSON sample with `grabaciones` array |
| 6. Notas de Comportamiento | Create defaults, update delta, active filter, grabaciones cap, legacy fallback |

## Firestore Schema Tables

### Colección: `capacitaciones/{slug}`

| Campo | Tipo | Requerido | Default | Notas |
|-------|------|-----------|---------|-------|
| `titulo` | `string` | Sí (store) | — | Trimmed. Validated non-empty. |
| `slug` | `string` | Sí (generado) | — | Normalized from titulo/slug input. Serves as document ID. |
| `descripcion` | `string` | No | `""` | Free text. |
| `categoria` | `string` | No | `"General"` | Dropdown: Herramientas para el trabajo, Accesibilidad digital, Alfabetización Digital. |
| `instructor` | `string` | No | `""` | Free text. |
| `privado` | `boolean` | No | `false` | Checkbox: `on`/`true` → `true`. |
| `link_vivo` | `string` | No | `""` | Live class link. |
| `infoClase` | `string` | No | `""` | Class info text. |
| `fecha` | `Timestamp` | Sí (store) | `new Date()` | Set on create only. |
| `estado` | `string` | No | `"borrador"` | Values: `"borrador"`, `"Activo"`, `"Terminado"`. Public filter uses `"Activo"`. |
| `creadoPor` | `string` | Sí (store) | — | `req.session.user.uid`. Set on create only. |
| `fechaActualizacion` | `Timestamp` | No (update only) | — | Set on update only. Not present on create. |

**Sample JSON:**
```json
{
  "titulo": "Introducción a la Accesibilidad Web",
  "slug": "introduccion-a-la-accesibilidad-web",
  "descripcion": "Fundamentos de WCAG y diseño inclusivo para desarrolladores.",
  "categoria": "Accesibilidad digital",
  "instructor": "María Gómez",
  "privado": false,
  "link_vivo": "https://meet.google.com/abc-defg-hij",
  "infoClase": "Martes y Jueves 18:00-20:00",
  "fecha": "2026-03-15T14:30:00.000Z",
  "estado": "Activo",
  "creadoPor": "uXyZ123abc",
  "fechaActualizacion": "2026-04-01T10:00:00.000Z"
}
```

### Colección: `capacitaciones/{slug}/modulos/{autoId}`

| Campo | Tipo | Requerido | Default | Notas |
|-------|------|-----------|---------|-------|
| `orden` | `number` | Sí (store) | — | `parseInt(orden)`. Controls display order. |
| `tituloModulo` | `string` | Sí (store) | — | Validated non-empty. |
| `descripcion` | `string` | No | `""` | Topic/syllabus text. |
| `linkMaterial` | `string` | No | `""` | URL to Drive/PDF material. No format validation. |
| `claseGrabada` | `string` | No | `""` | Legacy single recording URL. Fallback when `grabaciones` is empty. |
| `grabaciones` | `[{url, label}]` | No | `[]` | Primary recordings. Normalized via `parseGrabaciones`. Cap 10. |
| `activo` | `boolean` | No (store) | `true` | storeModulo hardcodes `true`. updateModulo sets from form checkbox. |
| `fechaCreacion` | `Timestamp` | Sí (store) | `new Date()` | Set on create only. |
| `fechaActualizacion` | `Timestamp` | No (update only) | — | Set on update only. |

**Sample JSON:**
```json
{
  "orden": 1,
  "tituloModulo": "Principios POUR",
  "descripcion": "Perceptible, Operable, Comprensible y Robusto.",
  "linkMaterial": "https://drive.google.com/file/d/xyz",
  "claseGrabada": "",
  "grabaciones": [
    { "url": "https://youtube.com/watch?v=aaa", "label": "Parte 1 — Teoría" },
    { "url": "https://youtube.com/watch?v=bbb", "label": "Parte 2 — Práctica" }
  ],
  "activo": true,
  "fechaCreacion": "2026-03-20T18:00:00.000Z",
  "fechaActualizacion": "2026-03-25T12:00:00.000Z"
}
```

## Verification Criteria

1. **HTML validity**: Open each `.html` in a browser (double-click). Page renders without broken layout.
2. **Broken links**: Click every internal nav link and ToC anchor. All resolve within-page or to the correct sibling file.
3. **Firestore field accuracy**: Spot-check 3 fields per collection against their write sites:
   - `estado` default `"borrador"` → `controller/adminController.js:353`
   - `activo: true` → `controller/adminController.js:492`
   - `grabaciones` cap 10 → `controller/adminController.js:20`
   - Public filter `estado == 'Activo'` → `controller/mainController.js:146`
   - `fechaActualizacion` only on update → `controller/adminController.js:423`, absent from store (lines 343-355)
   - Modulo `activo` filter in public detail → `controller/mainController.js:179`
4. **Schema completeness**: Every field in the tables matches a write site in `adminController.js` (store/update).
5. **No known-issues section**: Scan all three files — zero mentions of fixes, TODOs, or proposed changes. Only the implementation as it exists.
