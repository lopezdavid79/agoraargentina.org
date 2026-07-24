# Tasks: Mejorar accesibilidad de informes en la conversión a PDF

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Migrar pipeline informe a Puppeteer + tagged PDF | PR 1 | Single PR, fases secuenciales |

## Phase 1: Fundación — pdfGenerator.js

- [x] 1.1 Crear `scripts/pdfGenerator.js`: `generarPdfAccesible(html, opts)` con Puppeteer launch-per-request, `page.setContent()`, `page.pdf({ tagged: true })`, cleanup en `finally`, export.
- [x] 1.2 Verificar que acepta `{ format, landscape }` en opts y retorna `Promise<Buffer>`.

## Phase 2: Template + Controller — reemplazar pipeline

- [x] 2.1 Agregar `"puppeteer": "^24.x"` a `dependencies` en `package.json`.
- [x] 2.2 Crear `views/pdf/informe.ejs`: HTML semántico con `<html lang="es-AR">`, `<h1>`-`<h6>`, `<table>`+`<caption>`+`<th scope>`, metadatos (`<title>`, `<meta author>`), CSS `@page`.
- [x] 2.3 Modificar `controller/informesController.js` — `generarPDF`: usar `res.render('pdf/informe', ...)` + `pdfGenerator()` en vez de `require(generar_informe.js)`. Eliminar archivo temporal, `fs`/`os` imports.
- [x] 2.4 Eliminar `scripts/generar_informe.js`.

## Phase 3: Tests — TDD verificación tagged PDF

- [x] 3.1 Reescribir `tests/generar_informe.test.js`: mockear Puppeteer `page.pdf()`, verificar `{ tagged: true }`, verificar `/StructTreeRoot`, `/Lang es-AR`, metadatos en buffer.
- [x] 3.2 Ejecutar test suite — confirmar todos pasan (TDD: test con assertions de tagged PDF → implementación existente → test verde).
