# Proposal: mejorar accesibilidad de informes en la conversión a PDF

## Intent

PDFs de informes y CVs no tienen estructura accesible: sin tagged PDF, sin idioma, sin metadatos, tablas como texto posicionado. Ilegibles para lectores de pantalla, incumplen PDF/UA. Migrar de PDFKit a Puppeteer + HTML semántico.

## Scope

### In Scope
- Migrar pipeline de informes (`scripts/generar_informe.js`) a Puppeteer con template EJS semántico
- Crear template accesible: `views/pdf/informe.ejs`
- Agregar metadatos (title, language, author) vía HTML
- Configurar `page.pdf({ tagged: true })` para tagged PDF
- Actualizar controller de informes (sin cambiar endpoint ni firma)
- Actualizar tests unitarios de informe para verificar estructura tagged
- Agregar dependencia `puppeteer` en `package.json`

### Out of Scope
- Pipeline de CV (se mantiene con PDFKit, posible migración futura)
- Otros formatos (Word, Excel)
- Rediseñar contenido visual de informes
- Nuevos endpoints, autenticación, o fuente de datos (Firestore)

## Capabilities

### New Capabilities
- `pdf-accessibility`: generación de PDFs accesibles (tagged PDF/PDF/UA, metadatos, estructura semántica HTML→PDF) para informes de formación y CVs

### Modified Capabilities
- None (no existing PDF capability in specs)

## Approach

Cada pipeline renderiza HTML semántico desde EJS (`views/pdf/*.ejs`), Puppeteer produce el PDF con `page.pdf({ tagged: true })`. Controllers sin cambios de interfaz. Templates con `<html lang="es">`, `<h1>`-`<h6>`, `<table>`/`<caption>`/`<th scope>`, metadatos en `<head>`.

## Affected Areas

| Area | Impact |
|------|--------|
| `scripts/generar_informe.js` | Replaced |
| `controller/informesController.js` | Modified |
| `views/pdf/informe.ejs` | New |
| `scripts/pdfGenerator.js` | New |
| `tests/generar_informe.test.js` | Rewritten |
| `package.json` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regresión visual | High | Comparar visualmente; ajustar CSS `@page` |
| Chromium en producción | Medium | `@puppeteer/browsers` o chromium del SO |
| Saltos de página | Medium | CSS `page-break-*` |

## Rollback Plan

1. `git revert` del commit de migración
2. Eliminar `views/pdf/`
3. `npm install` para remover puppeteer
4. `npm test` para verificar pipelines originales
5. Redeploy del commit anterior si está en producción

## Dependencies

- Puppeteer (Chromium) — nueva dependencia de producción
- Chrome 88+ (para `page.pdf({ tagged: true })`)

## Success Criteria

- [ ] Tagged PDF: árbol de marcado presente (verificable con `pdf-parse`)
- [ ] `/Lang` = `es-AR`, `Title` y `Author` en catálogo PDF
- [ ] Tablas como `<Table>` en árbol lógico, no texto posicionado
- [ ] Encabezados `<H1>`..`<H6>` en estructura lógica
- [ ] Lector de pantalla navega encabezados, tablas y orden de lectura
- [ ] Tests unitarios verifican tagged PDF (no solo `%PDF`)
- [ ] Endpoints existentes retornan PDF funcional sin errores
