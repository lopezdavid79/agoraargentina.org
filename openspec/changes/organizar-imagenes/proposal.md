# Proposal: Organizar Imágenes

## Intent

11 imágenes sueltas en `public/images/`, multer instalado sin configurar, nombres inconsistentes (mayúsculas, espacios, tildes), 4 archivos >1MB, logo hardcodeado a URL producción (falla local), `home.ejs` con imagen comentada + campo incorrecto. Organizar assets, configurar upload multer, normalizar rutas, optimizar peso, corregir vistas.

## Scope

### In Scope
- Subdirectorios: `logos/`, `noticias/`, `cursos/`
- Multer middleware con validación MIME + tamaño
- Normalizar nombres: kebab-case, lowercase, sin espacios/tildes
- Optimizar 4 imágenes >1MB (target <800KB)
- Fix header: logo → ruta local `/images/logos/agora20-asaerca.png`
- Fix `home.ejs`: descomentar imagen, `imagen` → `imagenUrl`
- Script one-shot: rename disco + update Firestore
- Admin forms: input URL/text → file input con preview

### Out of Scope
- Footer imgbb (enlaces externos FOAL/ASAERCA)
- CDN/cloud storage, resize automático, WebP/AVIF
- Logo `logo_chaltu_bags.jpg` hardcodeado en cursos

## Capabilities

### New Capabilities
- `image-management`: Upload, almacenamiento, naming y optimización de imágenes

### Modified Capabilities
None

## Approach

4 fases progresivas, cada una con PR reversible. Fase 0: infraestructura upload. Fases 1-3: migrar assets, fix vistas, limpieza.

## Phases

**Phase 0** — Subdirectorios, `middleware/upload.js` (multer 5MB, image/*), file inputs en admin forms.

**Phase 1** — Renombrar 11 archivos a kebab-case, mover a subdirectorios, optimizar >1MB. Script one-shot: rename disco + sync Firestore fields.

**Phase 2** — Header logo ruta local. home.ejs: descomentar + fix field. Verificar vistas sin rutas rotas.

**Phase 3** — Eliminar huérfanos. `npm test` pasa. Verificar carga local + prod.

## Affected Areas

| Area | Impact |
|------|--------|
| `public/images/` | Estructura + naming + optimización |
| `middleware/upload.js` | New |
| `controller/adminController.js` | Procesar req.file |
| `views/admin/noticias/form_fields.ejs` | File input + preview |
| `views/admin/cursos/form_fields.ejs` | File input + preview |
| `views/partials/header.ejs` | Logo local |
| `views/home.ejs` | Imagen + field fix |
| Firestore docs | URLs post-rename |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rename rompe URLs Firestore | Med | Script migración + backup DB |
| Multer misconfig expone server | Low | Validar MIME real + límite 5MB |
| Upload colisión nombres | Low | Prefijo timestamp + uuid |

## Rollback Plan

`git revert` por fase. Si rename Firestore falla: reverse mapping desde backup o snapshot DB. Deploy: build anterior panel hosting.

## Dependencies

`multer` v2.0.2 (ya instalado). Verificar compatibilidad Express 5.

## Success Criteria

- [ ] `npm test` pasa
- [ ] Upload admin guarda archivo + URL Firestore
- [ ] Header logo carga en localhost
- [ ] home.ejs muestra imagen con `imagenUrl`
- [ ] 11 archivos migrados sin links rotos
- [ ] Ninguna imagen >800KB
- [ ] Admin forms usan file input con preview
