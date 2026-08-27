# Proposal: Documentación del Módulo Capacitaciones (HTML + Referencia Firebase)

## Intent

El módulo capacitaciones (`/capacitaciones` público + CRUD admin) creció sin documentación: no hay forma de regenerarlo desde cero. Generar un manual de implementación en HTML — blueprint para reconstruir el módulo — que documente SOLO el código tal como existe, más una referencia de datos Firebase (colecciones, documentos, campos).

## Scope

### In Scope
- `docs/capacitaciones/` — 3 archivos HTML autocontenidos (`lang="es"`; precedente: `docs/test-fase1-upload-imagenes.html`)
- Manual de implementación: rutas, controladores, vistas, lógica de negocio y patrones (hidden-JSON `grabaciones_json`, `jsonScript`, CSRF, `isAdmin`, rate limiter)
- Referencia Firebase: `capacitaciones/{slug}` y `modulos/{autoId}` con tablas campo/tipo/default/notas + ejemplos
- Consistente con `openspec/specs/capacitaciones-modulos/spec.md`

### Out of Scope
- Fix de known issues (estado casing, `privado` mismatch, dead templates, GET stubs, validaciones)
- Cualquier cambio de código del módulo; README/docs en Markdown
- Migración de datos (`claseGrabada` legacy)

## Capabilities

### New Capabilities
None — deliverable documental, sin cambio de comportamiento en runtime.

### Modified Capabilities
None — `capacitaciones-modulos` no altera sus requirements.

## Approach

1. Crear `docs/capacitaciones/` (HTML autocontenido, precedente `docs/test-fase1-upload-imagenes.html`).
2. `index.html` — overview: propósito, arquitectura, tabla de rutas (`mainRouter.js:38-39`, `adminRouter.js:67-77`), flujos público/admin, ciclo de vida `estado`.
3. `implementacion.html` — blueprint capa por capa: `adminController.js:9-22` (parseGrabaciones), `:313-591` (store/updateModulo), `mainController.js:142-185` (detailCapacitaciones), vistas (`index.ejs`, `detail.ejs:70-81`, `createModulos.ejs`, `editModulo.ejs:87-91`, `form_fields.ejs`, `dashboard.ejs:192-248`), patrones (normalización `{url,label}`, cap 10, fallback legacy).
4. `firestore.html` — jerarquía de colecciones; tablas schema (campo/tipo/requerido/default/notas) para `capacitaciones` (12 campos) y `modulos` (8 campos); 2 documentos de ejemplo JSON; notas de comportamiento (`estado:"borrador"` al crear, filtro público exige `"Activo"`, `grabaciones` cap 10).
5. Cada sección cita archivo:línea de origen para re-verificación.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/capacitaciones/index.html` | New | Overview, rutas, flujos |
| `docs/capacitaciones/implementacion.html` | New | Blueprint por capa |
| `docs/capacitaciones/firestore.html` | New | Colecciones, schemas, ejemplos |
| `openspec/specs/capacitaciones-modulos/spec.md` | Reference | Documentado, no modificado |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drift entre docs y código futuro | Med | Cita archivo:línea; regenerable |
| Campos Firestore inexactos | Med | Verificar contra controladores |
| HTML difícil de revisar en diff | Low | 1 archivo por tema; revisión navegador |

## Rollback Plan

Aditivo puro: `git revert <sha>` o eliminar `docs/capacitaciones/`. Cero impacto en runtime.

## Dependencies

Ninguna. Lectura de controladores/vistas/tests disponible localmente.

## Success Criteria

- [ ] 3 archivos HTML en `docs/capacitaciones/` abren en navegador con links internos OK
- [ ] Firebase cubre ambas colecciones con tablas campo/tipo/default + documentos de ejemplo
- [ ] Cada campo verificado contra el código (spot-check en `adminController.js` / `mainController.js`)
- [ ] Sin sección de issues ni cambios propuestos — solo la implementación existente
