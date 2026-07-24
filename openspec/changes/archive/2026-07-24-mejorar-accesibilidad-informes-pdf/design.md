# Design: Mejorar Accesibilidad de Informes en PDF

## Technical Approach

Migrar el pipeline de informes de PDFKit a Puppeteer. El controller renderiza un template EJS semántico a HTML, y una función compartida (`scripts/pdfGenerator.js`) lo convierte a PDF tagged con `page.pdf({ tagged: true })`. Endpoint y contrato de respuesta sin cambios. El pipeline de CV se mantiene con PDFKit (fuera de scope en esta iteración).

## Architecture Decisions

### Decision 1: Puppeteer vs Playwright

| | Puppeteer | Playwright |
|---|---|---|
| PDF tagged | `tagged: true` (Chrome 88+) | Same (Chromium) |
| Cold start | ~300ms | ~500ms |
| Bundle | ~350MB | ~400MB (3 browsers) |

**Choice**: Puppeteer. Solo necesitamos Chromium; Playwright agrega browsers que no usamos. Menor overhead por request.

### Decision 2: Un solo template vs parametrizado

**Choice**: `views/pdf/informe.ejs`. **Rationale**: Solo migramos informes en esta iteración. Template único, dedicado a la tabla 10-columnas con secciones numeradas. Si se migra CV después, tendrá su propio template.

### Decision 3: EJS vs otro engine

**Choice**: EJS. El proyecto ya lo usa (v3.1.10) para todas las vistas. Cero dependencias nuevas.

### Decision 4: Ciclo de vida de Chromium

| Opción | Adecuado? |
|---|---|
| Launch per request | Simple, sin state leak, ~300ms overhead |
| Browser pool | Mayor complejidad, riesgo de memory leaks |
| Instancia externa | Overhead operacional (systemd/container) |

**Choice**: Launch per request con cleanup en `finally`. **Rationale**: PDFs bajo demanda por admins — baja concurrencia. Pool es innecesario. Si escala, se migra sin cambiar la API de `pdfGenerator.js`.

### Decision 5: Ubicación de templates

**Choice**: `views/pdf/`. Sigue el patrón existente (`views/admin/`, `views/partials/`). Aísla PDFs de vistas web.

## Data Flow

```
GET /admin/informes/:id/pdf
        │
        ▼
Controller: Firestore doc(id).get()
        │
        ▼
res.render('pdf/informe', datos, callback)  → HTML string
        │
        ▼
pdfGenerator(html, { format:'A4' })
        │  Puppeteer: page.setContent(html) → page.pdf({ tagged:true })
        ▼
Buffer → res.setHeader('Content-Type','application/pdf') → res.send(buffer)
```

Ya no se usa archivo temporal (`scripts/generar_informe.js` se elimina). Pipeline CV no se modifica.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/pdfGenerator.js` | Create | `generarPdfAccesible(html, opts) → Buffer`. Maneja Puppeteer lifecycle y tagged PDF |
| `views/pdf/informe.ejs` | Create | Template HTML semántico: `<html lang="es-AR">`, headings, `<table>`+`<caption>`+`<th scope>` |
| `controller/informesController.js` | Modify | `generarPDF`: usar render callback + pdfGenerator. Eliminar require a `generar_informe.js` y fs.write |
| `package.json` | Modify | `+ puppeteer ^24.x` (mantener pdfkit para CV existente) |
| `scripts/generar_informe.js` | Delete | Reemplazado por template + pdfGenerator |
| `tests/generar_informe.test.js` | Rewrite | Verificar tagged PDF: buscar `/StructTreeRoot`, `/Lang es-AR`, metadata |

## Interfaces / Contracts

```js
// scripts/pdfGenerator.js — reemplaza a generarPdf() y generarCv()
async function generarPdfAccesible(html, opts = {}) → Promise<Buffer>
// html: string (HTML renderizado desde EJS)
// opts: { format?: 'A4'|'Letter', landscape?: boolean }
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `pdfGenerator.js` produce Buffer tagged | Mock `page.pdf()`, verificar `tagged: true`, verificar Buffer |
| Unit | Templates renderizan HTML válido | `ejs.render()` con datos, verificar tags semánticos |
| Integration | Controller retorna PDF tagged | Supertest + Firestore mock, verificar `/StructTreeRoot` en buffer |
| E2E | Endpoints existentes funcionales | Cypress: download endpoints retornan PDF válido |

## Migration / Rollout

No migration required. Mismos endpoints, mismo contrato. Rollback: `git revert`, `npm install` (pdfkit vuelve), `npm test`.

## Open Questions

None.
