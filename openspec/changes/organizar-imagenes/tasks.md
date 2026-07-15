# Tasks: Organizar Imágenes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~270 (additions + deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: Yes (under budget, single PR)
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Upload infra + view fixes + migration | PR 1 | Single PR (<400 lines) |

## Phase 1: Upload Infrastructure

- [x] **1.1** Create `middleware/upload.js` — multer diskStorage (subdir via `req.originalUrl`), fileFilter (JPEG/PNG only), 5MB limit. Write unit tests for fileFilter + limits first (RED), then implement (GREEN).
- [x] **1.2** Add `upload.single('imagenUrl')` to `router/adminRouter.js` lines 31 & 33; `upload.single('imagen')` to lines 38 & 40. Add `require('../middleware/upload')`.
- [x] **1.3** Modify `controller/adminController.js`: in `store`, `update`, `storeCurso`, `updateCurso` — if `req.file` exists, build `/images/{subdir}/{filename}` and use as `imagenUrl`/`imagen`. If no file on edit, retain existing value from `req.body`.
- [x] **1.4** Modify `views/admin/modal_contenedor.ejs` line 8: add conditional `enctype="multipart/form-data"` when `multipart` is true.
- [x] **1.5** Modify `views/admin/dashboard.ejs` lines 364-368 & 370-374: pass `multipart: true` to noticia and curso modal includes.
- [x] **1.6** Modify `views/admin/noticias/form_fields.ejs`: replace URL `<input type="url">` with `<input type="file" accept="image/jpeg,image/png">`. Change JS preview from `input` event to `change` + `URL.createObjectURL()`.
- [x] **1.7** Modify `views/admin/cursos/form_fields.ejs`: replace text `<input type="text">` with `<input type="file" accept="image/jpeg,image/png">`. Same JS preview change.
- [x] **1.8** Modify `views/admin/cursos/edit.ejs`: replace URL `<input type="url">` with `<input type="file">`. Adapt JS preview to `change` + `URL.createObjectURL()`.
- [x] **1.9** Write integration tests: `POST /admin/noticias/nuevo` with fixture file → expects redirect + `imagenUrl` stored in Firestore. `POST` without file → 400. `POST` with oversized/PDF → error flash.

## Phase 2: View Bug Fixes

- [ ] **2.1** Fix `views/partials/header.ejs` line 52: change `src="https://agoraargentina.ar/agora20-asaerca.png"` → `src="/images/logos/agora20-asaerca.png"`.
- [ ] **2.2** Fix `views/home.ejs` lines 102-104: uncomment image block, replace `noticia.imagen` → `noticia.imagenUrl`. Add conditional `<% if (noticia.imagenUrl) { %>` guard.
- [ ] **2.3** Write integration tests: `GET /` renders `<img src="/images/logos/"`. `GET /` renders image card when noticia has `imagenUrl`, no broken `<img>` when absent.

## Phase 3: Migration & Cleanup

- [ ] **3.1** Create `scripts/migrate-images.js` — manual MAP of 6 files to subdirs, `fs.mkdirSync` for `logos/` and `cursos/`, `fs.renameSync` for each, Firestore query + update for affected docs.
- [ ] **3.2** Run migration: backup `public/images/`, execute script, verify 6 files in `logos/` + 4 in `noticias/`, `APPS_GOOGLE.png` stays in root. Delete unreferenced orphans. `npm test` passes.

## Next Steps

Ready for implementation (sdd-apply). Single PR under 400 lines — proceed without chaining.
