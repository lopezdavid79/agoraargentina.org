# Tasks: Documentación del Módulo Capacitaciones (HTML + Referencia Firebase)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200–1500 (3 HTML con CSS inline; precedente ~400 c/u) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (3 commits por archivo) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Justificación**: Docs aditivas, cero impacto runtime, rollback = borrar `docs/capacitaciones/`. La revisión real es abrir en navegador y spot-check contra código, no leer diff — el tamaño de líneas no mide el costo de review. Si el maintainer prefiere slices, los 3 batches mapean 1:1 a 3 PRs encadenados.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | `docs/capacitaciones/index.html` | PR 1 (o commit 1) | Base: main. Shell compartido + contenido + verify |
| 2 | `docs/capacitaciones/implementacion.html` | PR 2 (o commit 2) | Depende del shell de unit 1 (copiar nav/style) |
| 3 | `docs/capacitaciones/firestore.html` + integración | PR 3 (o commits 3-4) | Schema tables + cross-link final |

Solo archivos nuevos en `docs/capacitaciones/`. NINGÚN cambio a código del módulo, tests, o archivos fuera de `docs/capacitaciones/`.

## Phase 1: `index.html` — Visión General

- [x] 1.1 Crear `docs/capacitaciones/index.html` — shell: `<!DOCTYPE html>`, `<html lang="es">`, `<meta charset="UTF-8">`, `<style>` inline (paleta `#0a6`/`#1e1e2e`, system-ui, `.step`, `.badge-*` copiada de `docs/test-fase1-upload-imagenes.html`), `<nav aria-label="Documentación de Capacitaciones">` con 3 links (`index.html` con `class="active"`), footer `Cambio: documentar-capacitaciones`, ToC con `<h2 id="...">` anclados.
- [x] 1.2 Secciones 1–7: Propósito; Arquitectura MVC (`app.js:1-80`); Tabla de rutas públicas/admin (`router/mainRouter.js:38-39`, `router/adminRouter.js:67-77`); Flujo público (`controller/mainController.js:142-185`); Flujo admin (`controller/adminController.js:313-591`); Ciclo de vida `estado` (`controller/adminController.js:353`, `controller/mainController.js:146`); Middleware/seguridad (`middleware/authMiddleware.js:9-12`, `middleware/csrfMiddleware.js:1-38`, `router/mainRouter.js:10-22`).
- [x] 1.3 Verificar: doble-clic abre sin layout roto; nav y anclas ToC resuelven; página activa resaltada; rutas y filtro `estado == 'Activo'` coinciden con `mainRouter.js:38-39` y `mainController.js:146`.

## Phase 2: `implementacion.html` — Blueprint de Implementación

- [x] 2.1 Crear `docs/capacitaciones/implementacion.html` — mismo shell (nav con `implementacion.html` activo, ToC).
- [x] 2.2 Secciones 1–3: parseGrabaciones (`controller/adminController.js:9-22`); controladores admin: storeCapacitacion/updateCapacitacion/deleteCapacitacion/createModulos/storeModulo/editModulo/updateModulo/deleteModulo (`controller/adminController.js:313-591`); controlador público: capacitacionesViews + detailCapacitaciones (`controller/mainController.js:142-185`).
- [x] 2.3 Secciones 4–5 (vistas): `views/capacitaciones/index.ejs:1-70`, `views/capacitaciones/detail.ejs:70-81`, `views/admin/dashboard.ejs:192-248`, `views/admin/capacitaciones/createModulos.ejs:1-202`, `views/admin/capacitaciones/editModulo.ejs:1-149`, `views/admin/capacitaciones/form_fields.ejs:1-77`.
- [x] 2.4 Sección 6 (patrones): hidden-JSON `grabaciones_json` + JS sync (`createModulos.ejs:55-64`), jsonScript (`config/ejsHelpers.js:14-17`), `_csrf` (`middleware/csrfMiddleware.js:27`), isAdmin, rate limiter, cap 10 (`controller/adminController.js:20`), normalización `{url,label}` (`controller/adminController.js:9-22`), fallback legacy `claseGrabada`.
- [x] 2.5 Verificar: cada cita archivo:línea coincide con el código actual; blueprints cubren store (11 campos) vs update (9 + `fechaActualizacion`); snippets de código legibles.

## Phase 3: `firestore.html` — Referencia Firebase

- [x] 3.1 Crear `docs/capacitaciones/firestore.html` — mismo shell (nav con `firestore.html` activo, ToC).
- [x] 3.2 Jerarquía `capacitaciones/{slug}` → `modulos/{autoId}`; tabla schema `capacitaciones` (12 campos, `design.md:124-139`) verificada contra write sites `adminController.js:343-355` (store) y update; documento ejemplo JSON (`design.md:141-157`).
- [x] 3.3 Tabla schema `modulos` (9 campos, `design.md:159-171`) + documento ejemplo con `grabaciones` (`design.md:173-189`).
- [x] 3.4 Notas de comportamiento: `estado:"borrador"` (`adminController.js:353`), filtro público `"Activo"` (`mainController.js:146`), `activo:true` hardcodeado (`adminController.js:492`), cap 10 (`adminController.js:20`), `fechaActualizacion` solo en update (`adminController.js:423`, ausente en 343-355), filtro módulo `activo` (`mainController.js:179`).
- [x] 3.5 Verificar: spot-check 3 campos por colección contra sus write sites; cada campo de las tablas tiene write site; ejemplo JSON respeta defaults de tabla.

## Phase 4: Integración y Validación Final

- [x] 4.1 Cross-link: en los 3 archivos cada nav apunta a los 3 destinos y los `href="implementacion.html#..."` / `firestore.html#..."` desde index resuelven; anclas ToC funcionan en página.
- [x] 4.2 HTML validity scan: los 3 abren por doble-clic sin CSS roto; `lang="es"`, charset UTF-8, footer presente en los 3.
- [x] 4.3 No-issues scan: grep por `TODO|known issue|fix|pendiente|issue` en `docs/capacitaciones/` — cero menciones de fixes, issues o cambios propuestos; solo implementación existente.
