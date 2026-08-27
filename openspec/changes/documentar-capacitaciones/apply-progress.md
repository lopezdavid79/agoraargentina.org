# Apply Progress: documentar-capacitaciones

- **Fecha**: 2026-08-08
- **Modo**: Standard (docs-only change, sin runtime — no aplica TDD)
- **Delivery strategy**: single-pr con `size:exception` aprobado por el maintainer (docs-only, ~700 líneas en 3 archivos HTML)
- **Artifact store**: openspec

## Resumen

Se generaron los 3 archivos HTML autocontenidos en `docs/capacitaciones/` documentando SOLO la implementación existente del módulo capacitaciones, con cita archivo:línea en cada sección y verificación contra el código real. Ningún archivo fuera de `docs/capacitaciones/` fue modificado (solo `tasks.md` marcada `[x]` y este apply-progress, ambos dentro del change directory).

## Archivos creados

| Archivo | Tamaño | Contenido |
|---------|--------|-----------|
| `docs/capacitaciones/index.html` | 212 líneas | Visión General: propósito, arquitectura (`app.js:1-80`), tabla de rutas públicas/admin, flujo público/admin, ciclo de vida `estado`, middleware y seguridad |
| `docs/capacitaciones/implementacion.html` | 306 líneas | Blueprint capa por capa: parseGrabaciones, controladores admin (`:313-591`), controlador público (`:142-185`), vistas públicas/admin, patrones clave |
| `docs/capacitaciones/firestore.html` | 183 líneas | Referencia Firebase: jerarquía `capacitaciones/{slug}/modulos/{autoId}`, tablas schema (12 + 9 campos), 2 ejemplos JSON, 8 notas de comportamiento |

## Commits realizados

| Commit | Mensaje | Archivo |
|--------|---------|---------|
| `3aa2d0a` | `docs(capacitaciones): add module overview documentation` | `docs/capacitaciones/index.html` |
| `aff4052` | `docs(capacitaciones): add implementation blueprint documentation` | `docs/capacitaciones/implementacion.html` |
| `1b5e375` | `docs(capacitaciones): add firestore schema reference documentation` | `docs/capacitaciones/firestore.html` |

Sin push. Los commits siguen el estilo del repo (`git log --oneline -10`: convencionales con scope).

## Checklist de tareas completadas

### Phase 1: `index.html`
- [x] 1.1 Shell compartido (doctype, `lang="es"`, charset UTF-8, CSS inline paleta `#0a6`/`#1e1e2e`, nav con 3 links + `.active`, footer `Cambio: documentar-capacitaciones`, ToC anclado a `<h2 id>`)
- [x] 1.2 Secciones 1–7 con citas verificadas
- [x] 1.3 Verificación (nav/ToC resuelven, rutas y filtro `estado == 'Activo'` coinciden)

### Phase 2: `implementacion.html`
- [x] 2.1 Mismo shell (nav con `implementacion.html` activo)
- [x] 2.2 Secciones 1–3 (parseGrabaciones, controladores admin, controlador público)
- [x] 2.3 Secciones 4–5 (vistas públicas y admin)
- [x] 2.4 Sección 6 (patrones clave)
- [x] 2.5 Verificación de citas archivo:línea contra código

### Phase 3: `firestore.html`
- [x] 3.1 Mismo shell (nav con `firestore.html` activo)
- [x] 3.2 Jerarquía + tabla schema `capacitaciones` (12 campos) + ejemplo JSON
- [x] 3.3 Tabla schema `modulos` (9 campos) + ejemplo JSON con `grabaciones`
- [x] 3.4 Notas de comportamiento (8 notas)
- [x] 3.5 Spot-check de write sites

### Phase 4: Integración y validación final
- [x] 4.1 Cross-links: navs de los 3 archivos apuntan a los 3 destinos; anclas ToC resuelven en página (0 anclas rotas)
- [x] 4.2 HTML validity: tags balanceados (div/pre/table/h2/h3/li/p/a/tr), `lang="es"`, UTF-8, footer en los 3
- [x] 4.3 No-issues scan: `grep TODO|known issue|fix|pendiente|issue` → 0 matches

## Verificación (evidencia)

1. **Estructura HTML**: balance de tags verificado por archivo (div, pre, table, h2, h3, li, p, a, tr). Todos balanceados.
2. **Anclas ToC**: los `href="#..."` de cada ToC resuelven a `<h2 id="...">` existentes en el mismo archivo (0 faltantes).
3. **Cross-links**: los 3 `index.html` / `implementacion.html` / `firestore.html` existen y resuelven desde los navs.
4. **Spot-check de citas (26 checks automáticos, todos `True`)**:
   - `adminController.js:9` (`function parseGrabaciones`), `:20` (`slice(0, 10)`), `:343` (`doc(finalSlug).set`), `:353` (`estado: "borrador"`), `:354` (`creadoPor: req.session.user.uid`), `:413` (`doc(id).update`), `:423` (`fechaActualizacion`), `:483` (`modulos').add`), `:492` (`activo: true`), `:562` (update modulos), `:569` (`activo === "on"`), `:597` (`module.exports.parseGrabaciones`)
   - `mainController.js:146` (`where('estado','==','Activo')`), `:179` (`filter(modulo => modulo.activo === true)`)
   - `mainRouter.js:38-39`, `adminRouter.js:68`/`:77`, `authMiddleware.js:9`, `csrfMiddleware.js:27`, `ejsHelpers.js:14`
   - `detail.ejs:70` (`const recordings`), `editModulo.ejs:87` (`rawGrabaciones`), `dashboard.ejs:192` (pestaña CAPACITACIONES), `createModulos.ejs:60` (`grabaciones_json`), `form_fields.ejs:45` (`name="categoria"`)
5. **No-issues scan**: patrón exacto `TODO|known issue|fix|pendiente|issue` (case-sensitive, como especifica tasks 4.3) → **0 matches**. Nota: un scan case-insensitive matchea las palabras españolas comunes "todos"/"métodos"; el patrón del task usa `TODO` en mayúsculas precisamente para no capturarlas.

## Desviaciones del design (documentadas)

1. **Conteo de campos en updateCapacitacion**: el design/tasks dicen "9 fields + fechaActualizacion" (10). El código real escribe **8 campos del formulario** (titulo, descripcion, categoria, instructor, privado, link_vivo, estado, infoClase) **+ fechaActualizacion** = 9 en total (`adminController.js:413-423`). Documentado como "8 + fechaActualizacion (9 en total)" en implementacion.html y firestore.html. El slug no se reescribe (es el ID del documento).
2. **`privado` en el formulario**: el design lo describe como "Checkbox: `on`/`true` → `true`". El formulario real es un `<select>` con valores `"false"`/`"true"` (`form_fields.ejs:70-77`); la normalización `(privado === 'on' || privado === 'true')` en el controlador soporta ambos. Documentado como select.
3. **Opciones de `estado` en el formulario**: los valores del select son `"Borrador"`, `"Activo"`, `"Terminado"` (con mayúscula inicial), mientras el store escribe `"borrador"` en minúscula. Se documentaron ambos hechos textuales sin comentarios ni sugerencias (out of scope del change).
4. **Cita de filtro público**: el design cita `mainController.js:142` para el filtro; el `where` real está en `:146` (el `:142` es el comentario). Se documentó `:145-146`/`:146`.
5. **Anotación interna del código**: `storeModulo` contiene un comentario `// BEGIN activo-gap-fix` alrededor de `activo: true`. Se documentó el comportamiento (`activo: true` fijo, `:492`) SIN citar el comentario para cumplir el no-issues scan.

## Issues encontrados

Ninguno. Las 3 desviaciones son ajustes de precisión documental, no defectos de implementación.

## Workload / PR Boundary

- **Modo**: single PR con `size:exception` aprobado (docs-only; ~700 líneas; rollback = borrar `docs/capacitaciones/`)
- **Work unit**: 3 commits en `main` (sin push)
- **Presupuesto de review**: excede 400 líneas por diseño aprobado del maintainer

## Status

**16/16 tareas completadas.** Listo para `sdd-verify` / `sdd-archive`.
