## Exploration: mejorar accesibilidad de informes en la conversión a PDF

### Current State

La aplicación genera PDFs en dos flujos independientes, ambos usando **PDFKit v0.13.0**:

**1. Informes de Formación** (`/admin/informes/:id/pdf`)
- Controller: `controller/informesController.js` → método `generarPDF`
- Script: `scripts/generar_informe.js` → función `generarPdf(datos, salida)`
- Templates: ninguna (el PDF se construye 100% desde JS con PDFKit)
- Flujo: lee un documento de Firestore (colección `informes`), genera el PDF en un archivo temporal, lo envía como `res.download()`.
- Datos: nombre, duración, modalidad, fechas, instructor, objetivo general/específicos, temario, metodología, dosificación por clase, evaluación, tabla de participantes (10 columnas), observaciones, recomendaciones, firma.

**2. CV / Currículum** (público, `POST /cv/generar`)
- Controller: `controller/cvController.js` → método `generar`
- Script: `scripts/generar_cv.js` → función `generarCv(datos, salida)`
- Templates: ninguna (PDF construido 100% desde JS con PDFKit)
- Flujo: recibe datos del formulario público, genera PDF en archivo temporal, envía como descarga.

**Estado actual de accesibilidad en PDF — crítico:**

| Aspecto | Estado actual |
|---|---|
| Tagged PDF (PDF/UA) | ❌ No existe. El PDF no tiene estructura lógica (árbol de marcado). |
| Idioma del documento (`/Lang`) | ❌ No se especifica. |
| Metadatos (Title, Author, Subject) | ❌ No se asignan. Solo el nombre de archivo es descriptivo. |
| Encabezados semánticos (`<H1>..<H6>` en el árbol) | ❌ Los títulos son solo texto con font-weight bold. |
| Estructura de tabla | ❌ Las tablas de participantes y clases son texto posicionado (`doc.text()` con coordenadas X/Y). |
| Texto alternativo para gráficos/elementos decorativos | ❌ Líneas horizontales (`hr`), círculos, rectángulos de color no tienen alt text. |
| Orden de lectura (ReadingOrder) | ❌ No definido. |
| Contraste de color | ⚠️ Aceptable visualmente, pero no verificado contra WCAG. |
| Source document (ej. HTML que se convierte a PDF) | ❌ No existe — todo se dibuja directamente con PDFKit. |

**PDFKit v0.13.0** es una librería de dibujo vectorial de bajo nivel. NO soporta:
- Tagged PDF / estructura lógica
- PDF/UA compliance
- XMP metadata streams
- Árbol de contenido estructurado
- Marcado semántico de tablas, listas, encabezados

Todo el contenido se escribe como operadores de texto y path, sin jerarquía semántica.

### Affected Areas

- `scripts/generar_informe.js` — script central de generación de PDF de informes. Todo el contenido se dibuja con PDFKit sin marcado semántico.
- `scripts/generar_cv.js` — script de generación de PDF de CV. Mismo problema que el anterior.
- `controller/informesController.js` — método `generarPDF` que orquesta la lectura de datos y el envío del archivo.
- `controller/cvController.js` — métodos `generar` y `preview` que orquestan la generación de PDFs de CV.
- `router/informesRouter.js` — ruta `GET /admin/informes/:id/pdf` que expone el endpoint.
- `router/cvRouter.js` — rutas `POST /cv/generar` y `POST /cv/preview`.
- `views/admin/informes/index.ejs` — listado con enlace "PDF" para descargar informe.
- `views/admin/informes/edit.ejs` — botón "Descargar PDF" en formulario de edición.
- `tests/generar_informe.test.js` — test unitario existente (solo verifica que el archivo comienza con `%PDF`).
- `tests/generar_cv.test.js` — test unitario existente (solo verifica que el archivo comienza con `%PDF`).
- `package.json` — requiere actualización de dependencias según el enfoque elegido.

### Approaches

1. **Migrar a Puppeteer/Playwright (headless browser → PDF)** — Reemplazar PDFKit con un pipeline que renderiza un template EJS o HTML con datos, y luego usa Puppeteer (Chromium headless) para convertirlo a PDF con `page.pdf()`.
   - Pros:
     - Chrome genera PDFs etiquetados (**tagged PDF**) automáticamente desde HTML semántico.
     - Soporta PDF/UA out of the box con el HTML adecuado.
     - Hereda la estructura semántica del HTML: `<h1>..<h6>`, `<table>`, `<th>`, `<caption>`, `<figure>`, `<figcaption>`, `<img alt>`.
     - Metadatos (title, language) se toman del `<html lang="...">` y `<title>`.
     - Permite mantener los templates EJS existentes y reutilizarlos para el PDF.
     - Lectores de pantalla (JAWS, NVDA) pueden navegar el PDF correctamente.
   - Cons:
     - **Dependencia pesada**: Chromium ~150-300 MB adicionales en producción.
     - **Rendimiento**: cada PDF requiere lanzar un browser headless (~300-500ms overhead).
     - **Mantener dos versiones visuales**: puede haber diferencias sutiles entre el PDF actual (PDFKit) y el nuevo (Chrome).
     - **Cambio significativo**: requiere reescribir `generar_informe.js` y `generar_cv.js` para que generen HTML en vez de dibujar con PDFKit.
   - Effort: **High**

2. **PDFKit mejorado con metadatos + post-procesamiento con pdf-lib** — Mantener PDFKit para el dibujo visual, pero agregar:
     - Metadatos básicos (`doc.info.Title`, `doc.info.Author`, `doc.info.Subject`) — PDFKit lo soporta parcialmente.
     - Inyectar `/Lang` en el catálogo del PDF mediante manipulación directa del buffer (o usar `pdf-lib` post-procesamiento).
     - Con `pdf-lib`, agregar una estructura lógica básica (marcado de encabezados, párrafos) modificando el PDF generado.
     - Agregar XMP metadata stream con `dc:title`, `dc:language`, etc.
   - Pros:
     - **Sin nueva dependencia pesada**: pdf-lib es ~150KB.
     - **Cambio incremental**: se puede mejorar metadata primero, estructura después.
     - **No cambia el output visual**: el PDF se ve igual.
   - Cons:
     - **pdf-lib NO tiene soporte completo para tagged PDF/PDF/UA**. No puede crear un árbol de estructura lógica completo desde cero.
     - La estructura lógica que se pueda agregar será limitada y frágil.
     - **No resuelve el problema de fondo**: las tablas siguen siendo texto posicionado, los encabezados siguen siendo solo texto en negrita.
     - El resultado no será conforme a PDF/UA.
   - Effort: **Medium**

3. **Pipeline híbrido: metadata en PDFKit + conversión HTML→PDF para accesibilidad** — Mantener PDFKit para descargas directas (backward compatibility), y agregar un nuevo endpoint que genere un PDF accesible vía Puppeteer desde un template EJS diseñado específicamente para accesibilidad.
   - Pros:
     - No rompe el flujo existente.
     - Permite migración gradual.
     - El PDF accesible puede tener mejor estructura que cualquiera de los otros enfoques.
   - Cons:
     - **Mantenimiento de dos pipelines**: duplicación de lógica de generación.
     - **Dos dependencias**: PDFKit + Puppeteer.
     - **Complejidad operativa**: dos formas de generar el mismo documento.
   - Effort: **High**

### Recommendation

**Enfoque 1 — Puppeteer/Playwright (migración completa).**

Razones:

1. **La accesibilidad real de PDFs requiere tagged PDF**. Sin un árbol de estructura lógica, los lectores de pantalla ven el PDF como una sopa de caracteres sin sentido. PDFKit no puede generar tagged PDF, y pdf-lib no puede agregarlo retroactivamente de forma confiable para documentos complejos con tablas y layouts multi-columna como estos informes.

2. **El proyecto ya usa un stack web (Node + EJS)**. Migrar a HTML + Puppeteer es un cambio de paradigma (de "dibujar coordenadas" a "maquetar HTML"), pero conceptualmente más cercano a lo que el equipo ya conoce.

3. **Rendimiento aceptable para el caso de uso**: los informes los genera un admin bajo demanda (no hay alta concurrencia). Un overhead de ~500ms por PDF es perfectamente aceptable.

4. **Mantenibilidad**: modificar un template EJS es más fácil y seguro que ajustar coordenadas X/Y en código PDFKit.

5. **Cumplimiento normativo**: si el proyecto requiere accesibilidad (ej. Ley de accesibilidad web en Argentina, o estándares internacionales), tagged PDF es un requisito. Ningún otro enfoque lo cumple realmente.

**Recomendación técnica específica:**
- Usar **Puppeteer** (más maduro que Playwright para generación server-side de PDFs).
- Crear templates EJS separados para cada tipo de PDF (`views/pdf/informe.ejs`, `views/pdf/cv.ejs`).
- El template HTML debe usar `<html lang="es">`, `<title>`, encabezados `<h1>` a `<h6>` semánticos, `<table>` con `<caption>` y `<th scope="col">`, `<figure>` y `<figcaption>`, y atributos `lang` donde corresponda.
- Configurar `page.pdf()` con `tagged: true` (por defecto en Chrome reciente).
- Agregar metadatos vía etiquetas `<meta>` en el HTML.

### Risks

- **Regresión visual**: el PDF generado por Chrome no se verá idéntico al actual de PDFKit. Requiere ajuste fino de CSS (`@page`, `margin`, `size`, `page-break-*`, tipografía).
- **Dependencia Chromium**: aumenta el tamaño del deploy y puede requerir ajustes en el hosting (espacio en disco, memoria, timeouts).
- **Complejidad de imágenes**: si los informes manejan imágenes (logos, gráficos), Puppeteer debe esperar a que carguen.
- **Múltiples páginas**: el manejo de saltos de página en HTML→PDF es menos predecible que dibujando coordenadas.
- **Pruebas existentes**: los tests actuales solo verifican `%PDF` header. Habrá que reescribirlos completamente para verificar estructura tagged (ej. `pdf-parse` o verificar metadatos en el buffer).
- **Encoding de fuentes**: Chrome usa sus propias fuentes; si los informes usan fuentes específicas, habrá que incluirlas o aceptar las defaults.

### Ready for Proposal

Yes — hay suficiente información para pasar a la fase de propuesta. El cambio está bien delimitado: migrar de PDFKit a Puppeteer para los dos pipelines de generación, manteniendo la misma estructura de datos Firestore y los mismos endpoints.
