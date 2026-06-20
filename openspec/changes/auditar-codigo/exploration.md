## Exploration: Auditoría de Código — `auditar-codigo`

### Current State

**Stack**: Node.js / Express 5.2.1 / EJS / Firebase Admin (Firestore) / bcryptjs / express-session / nodemailer / pdfkit
**Testing**: Jest 29.7 (local, NUNCA corre via `npm test` — ver `package.json:8`)
**Cypress**: Config file existe (`cypress.config.js`), pero NO hay directorio `cypress/` — E2E tests no existen
**SDD**: 2 changes activos previamente: `auditoria` (tasks al 90% checked pero código NUNCA modificado) y `testing-ci` (design hecho, sin implementación)

**Estado de los fixes del change `auditoria` (Phase 1)**:

| Fix (de tasks.md) | Estado | Evidencia |
|---|---|---|
| 1.1 Install sanitize-html | ❌ NO instalado | No está en `package.json:dependencies` |
| 2.1 Sanitizar processContacto | ❌ NO implementado | `mainController.js:72-99` sin sanitización |
| 2.2 Session secret sin fallback | ❌ NO implementado | `app.js:37` aún tiene `\|\| "Adm@gora$"` |
| 2.3-2.6 XSS en 4 vistas EJS | ❌ NO implementado | Las 4 vistas aún usan `<%- noticia.contenido %>` |
| 3.1 npm test passes | ❌ FALLA | 1 test falla, y además `npm test` ni siquiera corre Jest |

**Conclusión**: El change `auditoria` se marcó como completado en las tasks pero NUNCA se aplicó ningún cambio al código. Es un falso positivo. TODO lo reportado en la exploración original sigue vigente.

---

### Test Suite Status

```
npx jest --runInBand --verbose

PASS  tests/authController.test.js (5 tests) ✓
FAIL  tests/mainController.test.js (4 tests → 1 fails, 3 pass)
  ✗ sanitizes HTML tags from nombre, email, telefono, and mensaje
    → Email body RAW contiene <script>alert("xss")</script>Juan (sin sanitizar)
    → Test espera que los tags estén removidos

Total: 9 tests, 1 suite fails
```

**Problema adicional**: `package.json:8` tiene `"test": "echo \"No tests specified\""` — el comando `npm test` NO ejecuta Jest. El CI en `.github/workflows/test.yml` corre `npm test` que solo imprime un mensaje. Los tests NUNCA corren en CI.

---

### Issues Found (Priorizados)

#### 🔴 CRÍTICO — AuthMiddleware inefectivo
- **File**: `middleware/authMiddleware.js:3`
- **Problema**: Verifica `req.session.isLoggedIn` pero `authController.login` NUNCA setea esa propiedad (setea `req.session.user`).
- **Impacto**: El middleware SIEMPRE redirige a login aunque el usuario esté autenticado. Las rutas protegidas por `authMiddleware` en `mainRouter.js` (noticias CRUD: POST `/noticias/create`, PUT `/noticias/edit/:id`, DELETE `/noticias/delete/:id`) quedan SIN protección efectiva.
- **Nota**: Los routers `adminRouter.js`, `authRouter.js`, `informesRouter.js` tienen su PROPIA función `isAdmin` inline que SÍ verifica `req.session.user` — esas rutas están correctamente protegidas. Solo `authMiddleware` está roto.

#### 🔴 CRÍTICO — Session secret hardcodeado
- **File**: `app.js:37`
- **Problema**: `process.env.SESSION_SECRET || "Adm@gora$"` — fallback hardcodeado conocido.
- **Impacto**: Si `SESSION_SECRET` no está definido en producción, las sesiones se firman con un secreto público en el código fuente.

#### 🔴 CRÍTICO — Sin sanitización en formulario de contacto
- **File**: `controller/mainController.js:72-99`
- **Problema**: `processContacto` interpola directamente `req.body.nombre`, `req.body.email`, `req.body.telefono`, `req.body.mensaje` en el HTML del email sin sanitizar. XSS en email.
- **Test que falla**: `tests/mainController.test.js:34-60` — el test existe y espera sanitización, pero el código no la implementa.

#### 🔴 ALTO — Vista error.ejs no existe (3 referencias)
- **Files**: 
  - `controller/mainController.js:145,153` — `res.status(404).render('error', ...)` y `res.status(403).render('error', ...)`
  - `controller/adminController.js:458` — `res.status(500).render('error', ...)`
- **Problema**: `views/error.ejs` NO existe en el filesystem. Si se ejecuta cualquiera de estas rutas, Express lanza un error 500 (template missing) en lugar de mostrar la página de error.

#### 🔴 ALTO — 4 vistas detail con XSS (contenido sin escapar)
- **Files**:
  - `views/noticias/detail.ejs:25` — `<%- noticia.contenido %>`
  - `views/admin/noticias/detail.ejs:25` — `<%- noticia.contenido %>`
  - `views/admin/capacitaciones/detail.ejs:25` — `<%- noticia.contenido %>`
  - `views/admin/cursos/detail.ejs:25` — `<%- noticia.contenido %>`
- **Problema**: Usan `<%-` (output sin escapar) para `contenido`. Si un admin almacena HTML malicioso en una noticia, se ejecuta en el navegador del visitante.

#### 🔴 ALTO — Rutas admin GET sin vistas (crash si se navega directamente)
- **Files**:
  - `controller/adminController.js:49` — `res.render('admin/noticias/create')` — vista NO existe
  - `controller/adminController.js:74` — `res.render('admin/noticias/edit')` — vista NO existe
  - `controller/adminController.js:129` — `res.render('admin/cursos/index')` — vista NO existe
  - `controller/adminController.js:136` — `res.render('admin/cursos/create')` — vista NO existe
  - `controller/adminController.js:269` — `res.render('admin/capacitaciones/create')` — vista NO existe
  - `controller/adminController.js:338` — `res.render('admin/capacitaciones/edit')` — vista NO existe
- **Contexto**: El dashboard usa MODALES para crear/editar contenido (funciona correctamente). Las rutas GET separadas son legacy y crashean. Si alguien navega directamente a `/admin/noticias/nuevo`, recibe error 500 por template missing.

#### 🔴 ALTO — editModulo y updateModulo sin protección isAdmin
- **File**: `router/adminRouter.js:40-41`
- **Problema**: Las rutas `GET /admin/capacitaciones/:idCap/modulos/editar/:idModulo` y `POST /admin/capacitaciones/:idCap/modulos/editar/:idModulo` NO tienen middleware `isAdmin`.
- **Impacto**: Cualquier visitante puede editar módulos de capacitaciones si conoce los IDs.
- **Rutas protegidas correctamente**: Las demás rutas en adminRouter (crear, eliminar módulos) SÍ tienen `isAdmin`.

#### 🟡 MEDIO — npm test no corre Jest
- **File**: `package.json:8`
- **Problema**: `"test": "echo \"No tests specified\""` — no ejecuta Jest. El CI en `test.yml` corre `npm test` que no prueba nada. `openspec/config.yaml` declara `strict_tdd: true` pero los tests nunca se ejecutan automáticamente.

#### 🟡 MEDIO — Dead code: cursosController.js
- **File**: `controller/cursosController.js` (110 líneas)
- **Problema**: No es importado por NINGÚN router. Controlador legacy basado en JSON. Archivo completo eliminable.

#### 🟡 MEDIO — Dead code: newsController.js + multerNews.js
- **Files**: `controller/newsController.js` (90 líneas), `middleware/multerNews.js` (19 líneas)
- **Problema**: Controlador legacy para noticias en JSON + multer para imágenes. Las vistas que referencia (`noticias/adminList`, `noticias/create`, `noticias/edit`) NO existen. Las rutas están en `mainRouter.js` pero authMiddleware las protege incorrectamente.

#### 🟡 MEDIO — Dead code: modelos y datos JSON legacy
- **Files**: `models/User.js`, `models/News.js`, `data/user.json`, `data/noticias.json`, `data/cursos.json`, `config/firebase copy.js`
- **Problema**: Arquitectura anterior basada en JSON. Ningún controller activo (que use Firebase) los importa.

#### 🟡 MEDIO — Sin CSRF, Sin rate limiting
- **Problema**: Ningún formulario tiene protección CSRF. El login no tiene rate limiting. Express 5 no incluye csurf (deprecado).

#### 🟡 MEDIO — Sin linter, formatter, type checker
- **Files**: No hay `.eslintrc.*`, `.prettierrc.*`, `tsconfig.json`
- **Problema**: Inconsistencias de estilo (comillas mezcladas, punto y coma inconsistente, espaciado irregular). Documentado en `openspec/config.yaml:21-23`.

#### 🟡 MEDIO — Cypress config huérfana
- **Files**: `cypress.config.js` existe, directorio `cypress/` NO existe
- **Problema**: Config de Cypress sin tests E2E. `supportFile: false` pero no hay soporte que cargar.

#### 🟢 BAJO — Archivos basura en raíz
- **Files**: `.js` (old cypress config), `.log` (firebase init log), `test-output/` (PDFs de prueba)
- **Problema**: Archivos que no deberían estar versionados. `.log` debería estar en `.gitignore`.

#### 🟢 BAJO — MONGO_URI en .env es basura
- **File**: `.env:11`
- **Problema**: MongoDB no se usa en el proyecto. Variable confusa.

#### 🟢 BAJO — URL de compartir con dominio incorrecto
- **Files**:
  - `views/admin/noticias/detail.ejs:34,41` — `https://Ágoraargentina.com` (dominio con acento, .com en vez de .ar)
  - `views/admin/capacitaciones/detail.ejs:34,41` — mismo error
  - `views/admin/cursos/detail.ejs:34,41` — mismo error
- **Problema**: Los botones de compartir en redes sociales apuntan a un dominio incorrecto (`Ágoraargentina.com` en vez de `agoraargentina.ar`). Además la URL contiene caracteres acentuados que pueden no codificarse correctamente.

#### 🟢 BAJO — Ctrlador de perfil duplicado
- **Files**: `controller/authController.js:87-132` (updatePerfil), `controller/usuariosController.js:83-141` (updatePerfil)
- **Problema**: `authController.updatePerfil` y `usuariosController.updatePerfil` tienen lógica DUPLICADA para actualizar perfil. authController se monta en `authRouter.js` (ruta PUT inexistente), usuariosController se monta en `adminRouter.js:58-59` (ruta PUT/POST /admin/perfil). authController.updatePerfil es dead code.

#### 🟢 BAJO — adminController.indexCursos y createCurso nunca se llaman desde UI
- **Files**: `controller/adminController.js:125-137`
- **Problema**: Los métodos `indexCursos` y `createCurso` tienen sus propias rutas GET, pero el dashboard usa modales. Las rutas GET son dead code/legacy.

---

### Diferencias con la auditoría anterior (`auditoria`)

| Issue | `auditoria` (reportado) | `auditar-codigo` (hoy) | Cambio |
|---|---|---|---|
| AuthMiddleware `isLoggedIn` | ❌ Roto | ❌ Sigue roto | Sin cambios |
| Session secret hardcodeado | ❌ `"Adm@gora$"` | ❌ Sigue igual | Sin cambios |
| Sanitización contacto | ❌ No implementada | ❌ Sigue sin implementar | Sin cambios |
| XSS 4 vistas detail | ❌ `<%-` | ❌ `<%-` | Sin cambios |
| Vistas admin/noticias create/edit | ❌ Faltan | ❌ Siguen faltando | Sin cambios |
| cursosController.js | ❌ Dead code | ❌ Sigue presente | Sin cambios |
| newsController.js | ❌ Legacy | ❌ Sigue presente | Sin cambios |
| `models/`, `data/`, `firebase copy.js` | ❌ Legacy | ❌ Siguen presentes | Sin cambios |
| Cypress E2E tests | ❌ No existen | ❌ No existen + cypress dir eliminado | **Empeoró** (tampoco hay dir) |
| test: npm test | ❌ Falla 1 test | ❌ Sigue fallando + npm test no corre Jest | **Empeoró** |
| Express version | 5 (mencionado) | 5.2.1 | Sin cambios relevantes |
| **NUEVO: error.ejs no existe** | No reportado | ❌ 3 referencias | **Nuevo** |
| **NUEVO: editModulo sin isAdmin** | No reportado | ❌ Ruta sin protección | **Nuevo** |
| **NUEVO: URLs compartir incorrectas** | No reportado | ❌ Ágoraargentina.com | **Nuevo** |
| **NUEVO: authController.updatePerfil duplicado** | No reportado | ❌ Código muerto | **Nuevo** |
| **NUEVO: adminController.indexCursos dead** | No reportado | ❌ Legacy | **Nuevo** |
| **NUEVO: npm test no corre Jest** | No reportado | ❌ package.json:8 roto | **Nuevo** |
| **NUEVO: Vista error.ejs faltante** | Mencionado como mejora | ❌ Sigue sin existir + 3 referencias | **Nuevo** |

---

### Approaches

#### A. Fixes de seguridad críticos (authMiddleware + session secret + sanitización)
| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| A1: Fix individual por issue | Bajo riesgo de regresión, reversible | Múltiples PRs | Bajo |
| A2: Paquete de seguridad (sanitize-html + helmet + csrf + rate-limit) | Visión holística | Cambio grande, potencial de romper formularios | Medio |

**Recomendación**: A1 para los críticos (authMiddleware + session secret + sanitización) como fixes inmediatos. A2 como cambio de hardening posterior.

#### B. Dead code + limpieza
| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| B1: Eliminar todo lo no referenciado | Código más limpio, menos confusión | Riesgo de borrar algo usado indirectamente | Bajo |
| B2: Marcar deprecated, eliminar después | Más seguro | Más trabajo, alarga proceso | Bajo |

**Recomendación**: B1, verificando con grep antes de cada eliminación.

#### C. Vistas admin faltantes (noticias/cursos/capacitaciones)
| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| C1: Crear vistas create/edit como páginas separadas | UX completa | Las vistas no se usan (todo es modal) | Medio |
| C2: Eliminar rutas GET que renderizan vistas inexistentes | Simple, elimina dead code | Puede romper bookmarks si alguien usa las rutas | Bajo |

**Recomendación**: C2 — eliminar las rutas GET legacy y redirigir al dashboard. Nadie las usa.

#### D. Sistema de noticias dual (newsController vs adminController)
| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| D1: Eliminar newsController + multerNews | Unifica, elimina dead code | Las rutas GET de noticias en mainRouter dejan de funcionar | Medio |
| D2: Dejar ambos pero no tocarlos | No rompe nada | Mantiene confusión | Ninguno |

**Recomendación**: D1. Eliminar el sistema JSON legacy.

---

### Recommendation

Orden de intervención sugerido, priorizando impacto/esfuerzo:

1. **Fix `npm test` en package.json** (Impacto Alto, Esfuerzo Bajo) — Cambiar script test a `jest --runInBand`. Urgente porque `strict_tdd: true` es mentira si los tests nunca corren. **PRERREQUISITO** para cualquier otro cambio.

2. **Fix AuthMiddleware** (Impacto Alto, Esfuerzo Bajo) — Cambiar `req.session.isLoggedIn` → `req.session.user` en `middleware/authMiddleware.js:3`. Bug de seguridad que deja rutas admin sin protección efectiva.

3. **Fix sanitización contacto** (Impacto Alto, Esfuerzo Bajo) — Instalar `sanitize-html` y aplicarlo en `mainController.processContacto`. Destraba el test que falla.

4. **Fix session secret** (Impacto Alto, Esfuerzo Bajo) — Eliminar fallback `"Adm@gora$"`. Validar env var al startup.

5. **Fix XSS vistas** (Impacto Medio, Esfuerzo Bajo) — Cambiar `<%-` → `<%=` en 4 vistas detail. Fácil, seguro, impacto directo.

6. **Fix editModulo sin isAdmin** (Impacto Alto, Esfuerzo Bajo) — Agregar middleware `isAdmin` a rutas 40-41 de `adminRouter.js`.

7. **Crear views/error.ejs** (Impacto Alto, Esfuerzo Bajo) — Vista simple que muestre el mensaje de error. Resuelve 3 crashes potenciales.

---

### Risks

- **Fix authMiddleware puede romper sesiones existentes**: Si bien `isLoggedIn` nunca se setea, verificar doblemente que ningún otro código lo haga.
- **Eliminar dead code**: Verificar con `grep` que ningún archivo importe lo que se va a eliminar.
- **authController.updatePerfil vs usuariosController.updatePerfil**: Tienen lógica similar pero NO idéntica. Antes de eliminar authController.updatePerfil, verificar que no tenga validaciones extra que falten en usuariosController.
- **Sin entorno de staging**: Los tests unitarios mockean Firebase, pero no hay integración real para probar los cambios de seguridad.
- **Express 5**: La app usa Express 5.2.1 pero el código fue escrito para Express 4. Express 5 cambia el comportamiento de error handling y route params. Probar manualmente después de cambios.

### Ready for Proposal

Yes. Hay issues críticos claros con soluciones de bajo esfuerzo. El equipo debería priorizar los fixes de seguridad (items 1-7 de la recomendación) como un solo change o como un change por fase.

---

### Files Changed From Previous Audit

| File | Estado anterior | Estado actual |
|------|----------------|---------------|
| `cypress/e2e/` | Tests E2E existían pero rotos | Directorio eliminado |
| `test-output/` | No mencionado | PDFs de prueba sin trackear |
| `router/adminRouter.js:40-41` | No reportado | **NUEVA VULNERABILIDAD**: falta isAdmin |
| `views/admin/noticias/detail.ejs:34,41` | No reportado | **NUEVO**: dominio incorrecto en URLs |
| `views/admin/capacitaciones/detail.ejs:34,41` | No reportado | **NUEVO**: dominio incorrecto |
| `views/admin/cursos/detail.ejs:34,41` | No reportado | **NUEVO**: dominio incorrecto |
| `controller/mainController.js:145,153` | Mencionado como mejora | **NUEVO**: renderiza error.ejs inexistente |
| `controller/adminController.js:458` | No reportado | **NUEVO**: renderiza error.ejs inexistente |
| `package.json:8` | `echo "No tests"` | **Sigue igual**, sigue sin ejecutar Jest |
| `controller/authController.js:87-132` | No reportado | **NUEVO**: updatePerfil duplicado (dead code) |
| `controller/adminController.js:125-137` | No reportado | **NUEVO**: indexCursos/createCurso dead code |
