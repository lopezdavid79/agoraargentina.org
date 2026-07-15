# Design: Organizar Imágenes

## Technical Approach

3 fases simplificadas: mantener nombres originales, sin sharp ni optimización. Solo: crear subdirectorios, mover archivos, configurar multer, cambiar forms a file input, corregir bugs en vistas. Límite 5MB, solo JPEG/PNG.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Storage engine | Disk vs MemoryStorage | Disk | Archivos pequeños, sin cloud, cPanel-friendly. `public/images/` ya es servido por `express.static`. |
| Multer enctype scope | Global vs per-route | Per-route (en router) | Solo noticias y cursos necesitan upload. Capacitaciones y usuarios no. Mantiene `express.urlencoded` para el resto. |
| Form multipart | Condicional en modal_contenedor | Parámetro `multipart` booleano | Dashboard reutiliza modal_contenedor para 5 entidades. Solo 2 necesitan `enctype="multipart/form-data"`. |
| File naming | UUID vs timestamp+slug | `{timestamp}-{slug-sanitized}` | Legible, ordenable, sin colisiones. Slug viene del título del form. |
| Keep URL fallback | Sí vs No | No | Cambio completo a file input. Simplifica. Si se necesita URL externa, se agrega después. |
| Migration script | Automático vs manual mapping | Manual mapping en script Node | Solo 10 archivos. Clasificación por nombre (contiene "logo", "asaerca", "foal", etc.). |

## Folder Structure

```
public/images/
├── logos/
│   ├── agora20-asaerca.png        (movido de raíz)
│   ├── logo_Agora_rgbk.jpg        (movido de raíz)
│   ├── Logo_ASAERCA.jpg           (movido de raíz)
│   ├── logo_FOAL_2022_rgb.jpg     (movido de raíz)
│   └── OPM-logo-positivo.png      (movido de raíz)
├── noticias/
│   ├── findeaño.png               (ya estaba)
│   ├── imagenes de impresas.png   (ya estaba)
│   ├── noticia-1766061952286-.png (ya estaba)
│   └── NVDA_INICIAL.png           (movido de raíz, es captura de noticia)
├── cursos/                        (nuevo, vacío inicialmente)
├── APPS_GOOGLE.png                (se queda en raíz, badge no clasificable)
└── (huérfanos eliminados en fase 3)
```

## Multer Config: `middleware/upload.js`

```js
// Pattern: same as authMiddleware.js — exports a configured function
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route determines subdir: /admin/noticias → noticias/, /admin/cursos → cursos/
    const subdir = req.originalUrl.includes('noticias') ? 'noticias' : 'cursos';
    cb(null, path.join(__dirname, '..', 'public', 'images', subdir));
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safeName = file.originalname
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]/g, '-');
    cb(null, `${ts}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png'];
  cb(allowed.includes(file.mimetype) ? null : new Error('Tipo no permitido'), allowed.includes(file.mimetype));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

## Admin Form Changes

### `modal_contenedor.ejs` (línea 8)
```
<form action="<%= actionForm %>" method="POST" <%= typeof multipart !== 'undefined' && multipart ? 'enctype="multipart/form-data"' : '' %>>
```

### `dashboard.ejs` — pasar `multipart: true`
Líneas 358-363 (modalNuevaNoticia) y 370-374 (modalNuevoCurso): agregar `multipart: true` al objeto de include.

Template calls nuevos:
```ejs
<%- include('./modal_contenedor', { 
    ..., multipart: true 
}) %>
```

### `noticias/form_fields.ejs` (líneas 33-36)
```ejs
<!-- Reemplazar input type="url" por file -->
<input type="file" class="form-control mb-2" id="imagenUrl" name="imagenUrl"
       accept="image/jpeg,image/png">
```
JavaScript preview: cambiar evento `input` → `change`, usar `URL.createObjectURL()` en vez de src directo.

### `cursos/form_fields.ejs` (líneas 96-100)
```ejs
<!-- Reemplazar input type="text" por file -->
<input type="file" class="form-control mb-2" id="imagen" name="imagen"
       accept="image/jpeg,image/png">
```
Mismo cambio de preview JS.

### `cursos/edit.ejs` (línea 65)
Igual cambio: `type="url"` → `type="file"` con `accept="image/jpeg,image/png"`. JS existente adapta `input` → `change` + `URL.createObjectURL`.

## Controller Changes: `adminController.js`

En `store`, `update`, `storeCurso`, `updateCurso`: si `req.file` existe, construir path `/images/{subdir}/{filename}` y usarlo como `imagenUrl`/`imagen`. Si no hay file pero hay body (edición sin cambiar imagen), mantener valor existente del body.

```js
// Patrón en store (noticias):
const imagenUrl = req.file 
  ? `/images/noticias/${req.file.filename}` 
  : req.body.imagenUrl || '';
```

## Router Change: `adminRouter.js`

Agregar multer a las rutas POST/PUT de noticias y cursos:

```js
const upload = require('../middleware/upload');
// Línea 31: router.post('/admin/noticias/nuevo', isAdmin, upload.single('imagenUrl'), adminController.store);
// Línea 33: router.put('/admin/noticias/editar/:id', isAdmin, upload.single('imagenUrl'), adminController.update);
// Línea 38: router.post('/admin/cursos/nuevo', isAdmin, upload.single('imagen'), adminController.storeCurso);
// Línea 40: router.put('/admin/cursos/editar/:id', isAdmin, upload.single('imagen'), adminController.updateCurso);
```

## Migration Script: `scripts/migrate-images.js`

```js
// Pseudocode — one-shot, idempotente
const MAP = {
  'agora20-asaerca.png':    'logos/agora20-asaerca.png',
  'logo_Agora_rgbk.jpg':    'logos/logo_Agora_rgbk.jpg',
  'Logo_ASAERCA.jpg':       'logos/Logo_ASAERCA.jpg',
  'logo_FOAL_2022_rgb.jpg': 'logos/logo_FOAL_2022_rgb.jpg',
  'OPM-logo-positivo.png':  'logos/OPM-logo-positivo.png',
  'NVDA_INICIAL.png':       'noticias/NVDA_INICIAL.png',
};
// 1. fs.mkdirSync('public/images/logos', {recursive:true})
// 2. fs.mkdirSync('public/images/cursos', {recursive:true})
// 3. Por cada [src, dst] en MAP: fs.renameSync(src, dst)
// 4. Firestore: actualizar docs que referencian rutas viejas → nuevas
//    db.collection('noticias').where('imagenUrl','==', oldPath).get()
//    → doc.ref.update({imagenUrl: newPath})
```

## Error Handling

| Escenario | Qué pasa |
|-----------|----------|
| Archivo >5MB | Multer rechaza con `LIMIT_FILE_SIZE`. Error via multer error handler → flash message + redirect al dashboard con `?errores=Archivo+muy+grande`. |
| MIME no JPEG/PNG | Multer `fileFilter` rechaza. Error `Tipo no permitido` → igual flujo. |
| Sin archivo en creación | Validación en controller: si `!req.file` → 400 "Imagen requerida". |
| Sin archivo en edición | Usa `req.body.imagenUrl` existente. Sin cambios. |
| Error de disco | `next(err)` → error middleware de Express (4-arg, línea 109 de app.js). |

## Sequence Diagram: Upload Flow

```
Form (file input) ──POST multipart──→ adminRouter
                                          │
                                    upload.single('imagenUrl')
                                          │
                                    ┌─────┴─────┐
                                    │  multer    │
                                    │  fileFilter │── MIME check
                                    │  limits     │── size check
                                    │  diskStorage│── save to disk
                                    └─────┬─────┘
                                          │ req.file populated
                                          ▼
                                    adminController.store
                                          │
                                    construye path:
                                    /images/noticias/{filename}
                                          │
                                          ▼
                                    db.collection('noticias').add({
                                      imagenUrl: path,
                                      ...
                                    })
                                          │
                                          ▼
                                    res.redirect('/admin/dashboard')
```

## Bug Fixes

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `header.ejs` | 52 | `src="https://agoraargentina.ar/agora20-asaerca.png"` → `src="/images/logos/agora20-asaerca.png"` |
| `home.ejs` | 102-104 | Descomentar bloque. Cambiar `noticia.imagen` → `noticia.imagenUrl`. Resultado: `<% if (noticia.imagenUrl) { %> <img src="<%= noticia.imagenUrl %>" ...> <% } %>` |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `middleware/upload.js` | Create | Multer config (disk, 5MB, JPEG/PNG) |
| `scripts/migrate-images.js` | Create | One-shot: mkdir + rename + Firestore update |
| `router/adminRouter.js` | Modify | Add `upload.single()` a 4 rutas noticias/cursos |
| `controller/adminController.js` | Modify | `req.file` → path en store/update/storeCurso/updateCurso |
| `views/admin/modal_contenedor.ejs` | Modify | `enctype` condicional vía parámetro `multipart` |
| `views/admin/noticias/form_fields.ejs` | Modify | URL input → file input + JS preview con ObjectURL |
| `views/admin/cursos/form_fields.ejs` | Modify | Text input → file input + JS preview con ObjectURL |
| `views/admin/cursos/edit.ejs` | Modify | URL input → file input + JS preview adaptado |
| `views/admin/dashboard.ejs` | Modify | Pasar `multipart: true` a noticias/cursos modals |
| `views/partials/header.ejs` | Modify | Logo URL hardcodeada → ruta local |
| `views/home.ejs` | Modify | Descomentar imagen + `imagen` → `imagenUrl` |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `middleware/upload.js` — fileFilter, limits | Jest: mock req.file con distintos MIME/tamaños |
| Integration | POST `/admin/noticias/nuevo` con archivo | Supertest + `attach()` — verificar redirect y firestore.add llamado con path correcto |
| Integration | POST sin archivo | Supertest — verificar 400 |
| Integration | Header logo carga en `/` | Supertest — verificar `<img src="/images/logos/` presente |
| E2E | Upload en UI real | Cypress: `cy.fixture()` + `cy.get('input[type=file]').selectFile()` |

## Migration / Rollout

- `scripts/migrate-images.js` se corre manualmente en local y en cPanel tras deploy.
- Backup: copiar `public/images/` entera antes de ejecutar.
- Rollback: restaurar backup de imágenes + revertir commit.

## Open Questions

None.
