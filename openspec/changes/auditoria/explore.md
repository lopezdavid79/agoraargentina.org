## Exploration: Auditoría General de Mejoras

### Current State

**Stack real**: Node.js / Express 5 / EJS / Firebase Admin (Firestore) / bcryptjs / express-session / nodemailer / pdfkit
**Testing**: Jest 29.6.1 (unit), Cypress 15.8.1 (E2E)
**SDD**: Activo, change `testing-ci` en progreso (tasks 4.1-4.2 pendientes)
**Líneas totales**: ~1,550 JS + ~1,200 EJS + 83 CSS + 126 JS cliente

**Lo que funciona bien**:
- MVC claro (router → controller → helper/model)
- Accesibilidad en frontend: skip-links, aria labels, roles, focus management
- Firebase Admin con variables de entorno (sin serviceAccount.json versionado)
- Uso de bcryptjs para hash de contraseñas
- Validaciones server-side en auth (login, perfil, usuarios)
- Varios helpers reutilizables para PDF (generar_cv.js, generar_informe.js)
- Tests unitarios para authController (4 escenarios), generar_cv, generar_informe

**Lo que no funciona / riesgos graves**:
1. **El test de mainController.test.js FALLA** — espera sanitización HTML que NO existe en el controlador
2. **AuthMiddleware roto** — verifica `req.session.isLoggedIn` pero authController setea `req.session.user` (NUNCA setea `isLoggedIn`)
3. **Vistas faltantes** — adminController.create/edit renderizan `admin/noticias/create` y `admin/noticias/edit`, que NO EXISTEN
4. **CursosController.js** — 97 líneas de código NUNCA importado por ningún router (dead code)
5. **Cypress E2E test** — visita `/admin/cursos/nuevo` sin autenticación, siempre falla
6. **Session secret hardcoded** — `"Adm@gora$"` como fallback en app.js:37
7. **Sin sanitización de entrada** — processContacto mete HTML directo del usuario al email
8. **Sin CSRF** — todos los POST/PUT/DELETE sin tokens
9. **Sin rate limiting** — login expuesto a fuerza bruta

### Affected Areas

- `controller/mainController.js:72-99` — `processContacto` no sanitiza entrada HTML; email vulnerable a XSS
- `controller/newsController.js:1-90` — Controlador legacy basado en JSON. Views referenciadas (`noticias/create`, `noticias/edit`) NO EXISTEN. Duplicación funcional con adminController (Firestore)
- `controller/adminController.js:49,74` — Renderiza `admin/noticias/create` y `admin/noticias/edit`, vistas que NO EXISTEN en el filesystem
- `controller/cursosController.js:1-110` — Controlador completo que NO es requerido por ningún router. Dead code
- `middleware/authMiddleware.js:3` — Verifica `req.session.isLoggedIn` pero authController NUNCA setea esa propiedad. Middleware inefectivo
- `router/mainRouter.js:71` — `newsController.create` renderiza vista inexistente
- `router/cvRouter.js` — Importado 2 VECES en app.js (líneas 71 y 79)
- `app.js:37` — Session secret con fallback hardcodeado `"Adm@gora$"`
- `app.js:41` — `cookie.secure: false` hardcodeado, en producción expone sesión
- `app.js:71,79` — `cvRouter` registrado dos veces
- `config/firebase copy.js` — Archivo muerto con import a serviceAccount.json
- `models/User.js` — 18 líneas, modelo JSON legacy, NUNCA usado por ningún controller actual (todos usan Firebase directo)
- `models/News.js` — 25 líneas, modelo JSON legacy, NUNCA usado por ningún controller actual
- `data/user.json` — Archivo JSON legacy con 1 usuario hardcodeado. NO es usado por authController (usa Firebase)
- `data/noticias.json` — Archivo JSON legacy, usado SOLO por newsController.js (que tiene vistas faltantes)
- `data/cursos.json` — Archivo JSON legacy, usado SOLO por cursosController.js (que es dead code)
- `views/noticias/detail.ejs:25` — Usa `<%- noticia.contenido %>` (sin escapar). XSS si contenido tiene HTML malicioso
- `views/admin/capacitaciones/detail.ejs:25` — Misma vulnerabilidad, `<%- noticia.contenido %>`
- `views/admin/noticias/detail.ejs:25` — Misma vulnerabilidad
- `views/admin/cursos/detail.ejs:25` — Misma vulnerabilidad
- `.js` (raíz) — Archivo cypress config viejo, debería eliminarse
- `.log` (raíz) — Log de firebase init, debería eliminarse
- `cypress/e2e/flujo_completo_curso.cy.js:15` — `cy.visit('http://localhost:3000/admin/cursos/nuevo')` sin login. Hardcoded URL
- `cypress.config.js:6` — `supportFile: false` pero `cypress/support/` tiene archivos
- `.env` — Contiene FIREBASE_PRIVATE_KEY, MONGO_URI (MongoDB no usado en el proyecto)
- `.github/workflows/test.yml` — CI básico, sin Cypress, sin linter, sin type check
- `package.json:29` — Jest 29.6.1 (última es 29.7), Cypress 15.8.1
- `openspec/specs/` — Vacío (ninguna spec escrita aún)
- `openspec/config.yaml:9` — `strict_tdd: true`

### Improvement Opportunities (priorizadas)

1. **Fix: Sanitización de entrada en formulario de contacto** — Impacto: **Alto** | Esfuerzo: **Bajo**
   - Problema: `mainController.processContacto` (línea 72-99) construye HTML de email interpolando directamente `req.body.nombre`, `req.body.email`, `req.body.mensaje`, etc. sin sanitizar. El test `mainController.test.js:34` espera que los valores estén sanitizados pero el código no lo hace — por eso el test FALLA.
   - Ubicación: `controller/mainController.js:72-99`, `tests/mainController.test.js:34-60`
   - Solución: Instalar `sanitize-html` o similar y sanitizar cada campo antes de insertarlo en la plantilla HTML del email. Alternativa más simple: escapar HTML con una función helper (`escapeHtml`). Luego ajustar las aserciones del test.

2. **Fix: AuthMiddleware roto (session.isLoggedIn vs session.user)** — Impacto: **Alto** | Esfuerzo: **Bajo**
   - Problema: `middleware/authMiddleware.js:3` verifica `if (req.session && req.session.isLoggedIn)` pero `authController.login` (línea 32) setea `req.session.user` sin setear `req.session.isLoggedIn`. Por lo tanto `authMiddleware` NUNCA redirige a login cuando corresponde — deja pasar a cualquiera que tenga sesión (aunque no tenga user), y bloquea a los que sí están logueados.
   - Ubicación: `middleware/authMiddleware.js:3`, `controller/authController.js:32`
   - Solución: Cambiar `authMiddleware.js` a `if (req.session && req.session.user)` o agregar `isLoggedIn: true` en authController.login. Esto es un bug CRÍTICO de seguridad.

3. **Fix: Vistas faltantes admin/noticias** — Impacto: **Alto** | Esfuerzo: **Medio**
   - Problema: `adminController.create` (línea 49) renderiza `admin/noticias/create` y `adminController.edit` (línea 74) renderiza `admin/noticias/edit`. Esos views NO existen en `views/admin/noticias/`. Las rutas `GET /admin/noticias/nuevo` y `GET /admin/noticias/editar/:id` lanzarían un error 500 al intentar renderizar.
   - Ubicación: `controller/adminController.js:49-51`, `controller/adminController.js:74-87`
   - Solución: Crear las vistas faltantes o redirigir a las rutas de mainRouter (`/noticias/create` y `/noticias/edit/:id`) que a su vez también necesitan vistas.

4. **Fix: Session secret hardcodeado** — Impacto: **Alto** | Esfuerzo: **Bajo**
   - Problema: `app.js:37` tiene `process.env.SESSION_SECRET || "Adm@gora$"`. Si `SESSION_SECRET` no está seteado en el entorno de producción, las sesiones se firman con un secreto conocido públicamente en el código fuente.
   - Ubicación: `app.js:37`
   - Solución: Eliminar el fallback hardcodeado. Lanzar error si `process.env.SESSION_SECRET` no está definido. Agregar verificación al startup.

5. **Dead code: cursosController.js nunca se usa** — Impacto: **Medio** | Esfuerzo: **Bajo**
   - Problema: `controller/cursosController.js` (110 líneas) no es requerido por NINGÚN router. Es un controlador legacy duplicado del `mainController.js`.
   - Ubicación: `controller/cursosController.js` (archivo completo)
   - Solución: Eliminar el archivo y verificar que nada dependa de él.

6. **Dead code: modelos JSON legacy (User.js, News.js) + data/** — Impacto: **Medio** | Esfuerzo: **Bajo**
   - Problema: `models/User.js`, `models/News.js`, `data/user.json`, `data/noticias.json`, `data/cursos.json` son de la arquitectura anterior basada en JSON. Ningún controller actual (todos usan Firebase) los importa excepto `newsController.js` y `cursosController.js` que también están rotos o son dead code.
   - Ubicación: `models/User.js`, `models/News.js`, `data/user.json`, `data/noticias.json`, `data/cursos.json`
   - Solución: Eliminar modelos y datos JSON legacy después de verificar que ningún otro código los require.

7. **Dead code: config/firebase copy.js** — Impacto: **Bajo** | Esfuerzo: **Bajo**
   - Problema: Archivo `config/firebase copy.js` es una copia de backup del viejo método de autenticación Firebase con serviceAccount.json. Nunca se usa.
   - Ubicación: `config/firebase copy.js`
   - Solución: Eliminar el archivo.

8. **Problema crítico: Cypress E2E sin autenticación** — Impacto: **Alto** | Esfuerzo: **Medio**
   - Problema: `cypress/e2e/flujo_completo_curso.cy.js:15` visita `/admin/cursos/nuevo` sin hacer login primero. Va a fallar porque Express redirige al login (o peor: si authMiddleware está roto, pasaría sin autenticar y el test daría falso positivo).
   - Ubicación: `cypress/e2e/flujo_completo_curso.cy.js:15`, `cypress.config.js:6` (supportFile: false)
   - Solución: Agregar paso de login con `cy.session()` o `cy.request('POST', '/login', ...)`. Habilitar supportFile para comandos personalizados.

9. **XSS en vistas EJS (contenido sin escapar)** — Impacto: **Medio** | Esfuerzo: **Bajo**
   - Problema: 4 vistas EJS usan `<%- noticia.contenido %>` (output sin escapar). Si un atacante puede crear/modificar noticias, puede inyectar HTML/JS arbitrario. Actualmente solo admin puede crear noticias, pero es una mala práctica.
   - Ubicación: `views/noticias/detail.ejs:25`, `views/admin/noticias/detail.ejs:25`, `views/admin/capacitaciones/detail.ejs:25`, `views/admin/cursos/detail.ejs:25`
   - Solución: Evaluar si realmente se necesita HTML enriquecido en contenido. Si no, cambiar a `<%= %>` (escapado). Si sí, sanitizar con DOMPurify server-side.

10. **Consolidación del sistema de noticias dual** — Impacto: **Alto** | Esfuerzo: **Alto**
    - Problema: `newsController.js` maneja noticias vía JSON + multer para imágenes, mientras `adminController.js` y `mainController.js` manejan noticias vía Firestore. Hay DUAS implementaciones paralelas que no se sincronizan. Las vistas del sistema legacy no existen.
    - Ubicación: `controller/newsController.js`, `controller/adminController.js`, `router/mainRouter.js:32,44,47,51`, `middleware/multerNews.js`
    - Solución: Auditar qué rutas se usan realmente y eliminar el sistema legacy (newsController + multerNews + vistas de noticias faltantes). Refactorizar mainRouter para que use solo adminController para noticias.

11. **Duplicación de cvRouter en app.js** — Impacto: **Bajo** | Esfuerzo: **Bajo**
    - Problema: `app.js:71 y 79` — `app.use('/', cvRouter)` aparece DOS VECES. La segunda es redundante pero confusa.
    - Ubicación: `app.js:71`, `app.js:79`
    - Solución: Eliminar la línea duplicada.

12. **Falta de manejo de errores global** — Impacto: **Medio** | Esfuerzo: **Medio**
    - Problema: No hay middleware global de errores Express (4 parámetros). El 404 handler redirige a home sin mantener la ruta original. Los errores 500 son `res.status(500).send("Error")` inconsistente entre controladores. Sin log estructurado.
    - Ubicación: `app.js:83-85` (404 handler), múltiples controllers (error handling inconsistente)
    - Solución: Agregar middleware global de errores con logging, vista de error personalizada. Mejorar manejo 404 con página real. Centralizar logging con Winston o similar.

13. **Sin CSRF ni rate limiting** — Impacto: **Medio** | Esfuerzo: **Medio**
    - Problema: No hay protección CSRF en ningún formulario POST. El login no tiene rate limiting. Express 5 no incluye csurf (deprecado), toca usar middleware propio o `lusca`.
    - Ubicación: Todos los formularios POST/PUT/DELETE
    - Solución: Implementar CSRF token con `csrf-csrf` o similar. Agregar rate limiting con `express-rate-limit` en rutas de login.

14. **Monorequirement: MONGO_URI en .env es basura** — Impacto: **Bajo** | Esfuerzo: **Bajo**
    - Problema: `.env:11` tiene `MONGO_URI` de MongoDB Atlas, pero el proyecto NO usa MongoDB. Mezcla conceptos y puede confundir.
    - Ubicación: `.env:11`
    - Solución: Eliminar la línea.

15. **Sin verificación de entorno al startup** — Impacto: **Medio** | Esfuerzo: **Bajo**
    - Problema: app.js no verifica que las variables de entorno críticas estén definidas antes de arrancar (FIREBASE_*, SESSION_SECRET, EMAIL_PASS). Firebase fallará silenciosamente o con error poco claro.
    - Ubicación: `app.js:1-94`, `config/firebase.js`
    - Solución: Agregar verificación al startup con `process.env` checks y errores claros.

16. **Sin linter ni formateador** — Impacto: **Bajo** | Esfuerzo: **Bajo**
    - Problema: `openspec/config.yaml:21-23` documenta que no hay linter, formatter ni type checker. El código tiene inconsistencias de estilo (espacios, punto y coma, comillas mezcladas).
    - Ubicación: Proyecto general
    - Solución: Agregar ESLint + Prettier + husky/lint-staged.

17. **Tests insuficientes** — Impacto: **Medio** | Esfuerzo: **Alto**
    - Problema: Solo 11 tests (10 pasan, 1 falla). adminController, usuariosController, informesController, cvController, newsController NO tienen tests. Cobertura general es < 20%.
    - Ubicación: `tests/` (4 archivos), todos los controllers sin test
    - Solución: Agregar tests unitarios para adminController (mocks Firebase), usuariosController, informesController. Tests de integración para rutas.

### Approaches for Each Major Area

**A. SISTEMA DE NOTICIAS DUAL (problema #10)**

| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| A1: Eliminar newsController + JSON y usar solo adminController + Firebase | Unifica la lógica, elimina dead code, datos centralizados | Requiere crear vistas faltantes admin/noticias/create y edit | Medio |
| A2: Dejar ambos pero sincronizarlos | Doble mantenimiento, propenso a errores | Complejidad innecesaria | Alto |
| A3: Migrar Firebase → JSON (volver a JSON) | Simple, sin dependencia externa | Pierde escalabilidad, seguridad y backup automático de Firebase | Medio |

**Recomendación**: A1. Eliminar el sistema JSON legacy. Unificar todo en Firebase.

**B. SEGURIDAD PERIMETRAL (problemas #1, #2, #4, #9)**

| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| B1: Fix específicos uno por uno | Bajo riesgo de regresión, enfoque quirúrgico | Se necesitan varios cambios atómicos | Bajo |
| B2: Paquete de seguridad (sanitize + CSRF + rate-limit + helmet) | Visión holística, capas múltiples | Cambio grande, potencial de romper formularios | Medio |

**Recomendación**: B1 para los críticos (authMiddleware + sanitización + session secret) como fixes inmediatos, después B2 como cambio de hardening.

**C. DEAD CODE + LIMPIEZA (problemas #5, #6, #7, #11)**

| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| C1: Eliminar todo lo no referenciado | Códigobase más limpio, menos confusión | Riesgo de borrar algo que se usa indirectamente | Bajo |
| C2: Marcar como deprecated primero, eliminar después | Más seguro, período de observación | Más trabajo, alarga el proceso | Bajo |

**Recomendación**: C1, pero verificando dependencias con grep antes de borrar.

### Recommendation

Las 5 mejoras más importantes para arrancar, ordenadas por impacto:

1. **CRÍTICO - Fix authMiddleware** (Impacto Alto, Esfuerzo Bajo) — Cambiar `isLoggedIn` → `user`. Bug de seguridad que puede permitir acceso no autenticado a rutas admin. **This should be fixed immediately.**

2. **CRÍTICO - Sanitización en formulario de contacto + fix test** (Impacto Alto, Esfuerzo Bajo) — Arreglar `processContacto` para sanitizar entrada. Esto también destraba el test que falla (cambio `testing-ci`, task pendiente).

3. **CRÍTICO - Session secret sin fallback hardcodeado** (Impacto Alto, Esfuerzo Bajo) — Eliminar `"Adm@gora$"` y validar env var al startup.

4. **ALTO - Vistas admin/noticias faltantes** (Impacto Alto, Esfuerzo Medio) — Crear vistas create/edit para adminController o refactorizar rutas. Sin esto, la gestión de noticias desde el admin está rota.

5. **ALTO - Dead code: cursosController.js + modelos JSON** (Impacto Medio, Esfuerzo Bajo) — Eliminar ~200 líneas de código muerto que generan confusión.

### Risks

- **authMiddleware roto**: Es el riesgo MÁS CRÍTICO. Si `authMiddleware.js` NUNCA funciona, las rutas admin están efectivamente abiertas (dependiendo de las funciones `isAdmin` inline en los routers). Sin embargo: `adminRouter.js:6` tiene su propia `isAdmin` que sí verifica `req.session.user`. Pero `authMiddleware.js` es el que protege rutas en `mainRouter.js`. Esto significa que las rutas de noticias en mainRouter (`POST /noticias/create`, `PUT /noticias/edit/:id`, `DELETE /noticias/delete/:id`) NO tienen protección efectiva.
- **Eliminar dead code puede romper algo si no se verifica exhaustivamente** — Usar grep antes de cada eliminación.
- **FIX authMiddleware puede romper sesiones existentes** — Al cambiar de `isLoggedIn` a `user`, las sesiones existentes que tengan `isLoggedIn: true` (si es que alguna vez se setea) dejarían de funcionar. Revisar si algún otro código setea `isLoggedIn`.
- **Change `testing-ci` tiene tasks pendientes** (4.1-4.2) — Cualquier cambio que toque tests o mainController.js va a solaparse con ese cambio. Coordinar.
- **No hay entorno de staging para probar los cambios de seguridad** — Los tests unitarios mockean Firebase, pero no hay integración real.

### Ready for Proposal
Yes
