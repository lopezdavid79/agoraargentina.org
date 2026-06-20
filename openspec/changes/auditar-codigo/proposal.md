# Proposal: Auditoría de Código y Despliegue Seguro

## Intent

10+ vulnerabilidades activas (auth roto, XSS, session hardcodeado, sin sanitización), CI muerto (`npm test` nunca corre), y error 503 en deploy que impide que fixes lleguen a producción. Priorizamos diagnóstico del 503 antes de tocar seguridad — sin deploy estable, ningún fix vale.

## Scope

### In Scope
- Fixes priorizados: authMiddleware, session secret, sanitización, XSS 4 vistas, editModulo isAdmin
- Crear views/error.ejs, redirects para vistas admin faltantes
- Fix npm test + CI pipeline (package.json)
- Dead code: cursosController, newsController, modelos JSON, firebase copy.js
- **Diagnóstico 503 deploy**: health endpoint, env validation startup, start script audit, logs review

### Out of Scope
- ESLint/Prettier, CSRF + rate limiting, Cypress E2E, refactor mayor de rutas

## Capabilities

### New
- `deployment-reliability`: Health endpoint, env validation pre-listen, start script audit, log inspection
- `auth-middleware-fix`: isLoggedIn → session.user + isAdmin en rutas módulo edit
- `ci-pipeline`: Fix npm test script, Jest runs in CI workflow

### Modified
- `session-security` (spec exists): Implementar validación SESSION_SECRET obligatorio
- `contact-sanitization` (spec exists): Implementar sanitize-html + XSS escaping vistas

## Approach

4 fases secuenciales, cada una con PR reversible independiente. Fase 0 diagnóstica el 503 antes de tocar seguridad.

## Phases

### Phase 0: Diagnóstico 503 deploy
**Goal**: Identificar por qué el servidor da 503 tras deploy. Estabilizar pipeline.
**AC**: `curl <host>/health` responde 200. Logs startup sin errores. Env vars verificadas.
- Crear `GET /health` → `{ status: "ok" }`
- Startup validation: verificar SESSION_SECRET, FIREBASE_*, EMAIL_PASS antes de `app.listen()`
- Revisar start script: `"start": "node app.js"` — verificar que NODE_ENV se setee en producción
- Verificar `.env` producción tiene SESSION_SECRET (el fallback hardcodeado causa crash si se removió)
- Agregar log startup con env vars presentes (sin valores sensibles)
- **Verificación**: `curl <host>/health`, `npm test`, revisar logs plataforma (journalctl / panel hosting)

### Phase 1: Seguridad crítica
**Goal**: Cerrar 4 vulnerabilidades más graves, mínimo riesgo regresión.
**AC**: `npm test` pasa. AuthMiddleware protege rutas. App falla sin SESSION_SECRET. XSS eliminado.
- 1.1 `npm install sanitize-html`
- 1.2 authMiddleware.js: `req.session.isLoggedIn` → `req.session.user`
- 1.3 mainController.js: sanitizar nombre/email/telefono/mensaje con sanitize-html
- 1.4 app.js: remover `|| "Adm@gora$"`, validar SESSION_SECRET pre-listen
- 1.5 4 vistas detail: `<%-` → `<%=` en contenido
- 1.6 adminRouter.js: agregar `isAdmin` a editModulo y updateModulo (líneas 40-41)
- 1.7 Test: `npm test` pasa. Manual: app fails sin SESSION_SECRET

### Phase 2: Estabilización
**Goal**: Eliminar crashes por vistas faltantes. Arreglar CI.
**AC**: npm test corre en CI. Sin vistas faltantes que causen 500.
- 2.1 Crear `views/error.ejs` (mensaje + link home)
- 2.2 package.json: `"test": "jest --runInBand"` (reemplazar echo)
- 2.3 adminController rutas GET sin vista → redirect a dashboard
- 2.4 Verificación: `npm test` pasa, `GET /admin/noticias/nuevo` redirige

### Phase 3: Housekeeping
**Goal**: Reducir superficie de ataque eliminando código legacy.
**AC**: grep confirma nada importa archivos eliminados. Tests pasan.
- 3.1 Eliminar newsController, multerNews, cursosController
- 3.2 Eliminar models/User.js, models/News.js, data/*.json, config/firebase copy.js
- 3.3 Eliminar authController.updatePerfil duplicado
- 3.4 mainRouter: eliminar rutas que referencian newsController
- 3.5 Limpiar basura raíz (`.js`, `.log`) + agregar a .gitignore si no está

## npm Packages

| Paquete | Fase | Razón |
|---------|------|-------|
| `sanitize-html` | 1 | Stripear HTML de inputs. Test lo exige. Config: `{ allowedTags: [], allowedAttributes: {} }` |

## Rollback Plan

| Nivel | Acción |
|-------|--------|
| Por fase | `git revert <commit-hash>` del PR de esa fase. Resolver conflictos. |
| Kill-switch deploy | En panel hosting: seleccionar build anterior (1 clic). |
| Hotfix producción | Si Phase 1 rompe: `git revert broken-commit && git push deploy-branch` |

## Review Plan

| Aspecto | Detalle |
|---------|---------|
| PR splitting | 4 PRs (1/fase). Cada PR < 200 líneas. Budget 400 Low risk. |
| Chained PRs | No. Cada PR → main independiente. |
| Reviewers | Backend dev (Ph0-2), Security (Ph1,3), DevOps (Ph0) |
| Prerrequisito | `npm test` pasa en cada PR. Health check en Ph0. |
| Checklist | [ ] Tests pasan [ ] Sin secrets en código [ ] Health endpoint OK [ ] Rollback documentado |

## Review Workload

| Fase | Líneas | PR |
|------|--------|----|
| 0 — Diagnóstico 503 | ~30 | PR#0 |
| 1 — Seguridad | ~60 | PR#1 |
| 2 — Estabilización | ~50 | PR#2 |
| 3 — Housekeeping | ~90 (mostly deletions) | PR#3 |
| **Total** | **~230** | **4 PRs** |

**Decision needed before apply**: Yes
**Chained PRs recommended**: No
**400-line budget risk**: Low
