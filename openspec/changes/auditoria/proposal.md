# Proposal: Auditoría General de Mejoras

## Intent

Resolver 9 problemas de seguridad, mantenibilidad y calidad identificados en la exploración del código base. El item 1 (AuthMiddleware) ya fue corregido como hotfix fuera de esta propuesta.

## Scope

### In Scope
1. Sanitizar formulario contacto (fix test + controlador)
2. Session secret: eliminar fallback, validar env al startup
3. Crear vistas admin/noticias faltantes
4. Dead code: cursosController.js, modelos JSON, data/*.json, firebase copy.js, cvRouter duplicado
5. Cypress E2E: agregar login antes de rutas admin
6. XSS en 4 vistas EJS: `<%-` → `<%=`
7. Sistema noticias dual: eliminar newsController + multerNews, unificar en adminController (Firestore)
8. CSRF + rate limiting en formularios y login
9. Middleware global de errores con logging

### Out of Scope
- ESLint/Prettier, tests faltantes (diferidos a cambios tooling y testing)

## Capabilities

### New Capabilities
- `contact-sanitization`: Sanitización de entrada HTML en formulario de contacto
- `session-security`: Validación de SESSION_SECRET obligatorio al startup
- `csrf-protection`: Tokens CSRF en formularios POST/PUT/DELETE
- `rate-limiting`: Rate limiting en login y rutas sensibles
- `error-handling`: Middleware global de errores Express con vista personalizada

### Modified Capabilities
None (no existen specs previas en `openspec/specs/`)

## Approach

4 fases por ratio impacto/esfuerzo, cada una reversible independientemente:

1. **Fase 1 — Seguridad** (High/Low): Sanitización + session secret + XSS EJS. Destraba `mainController.test.js`.
2. **Fase 2 — Consolidación** (High/Med): Unificar noticias en Firebase + vistas admin faltantes.
3. **Fase 3 — Hardening** (Med/Med): CSRF + rate limiting + error middleware.
4. **Fase 4 — Housekeeping** (Med/Low): Dead code + Cypress auth + cvRouter duplicado.

## Affected Areas

mainController.js, app.js, newsController.js (removed), cursosController.js (removed), multerNews.js (removed), 4 vistas EJS (XSS fix), admin/noticias/{create,edit}.ejs (new), cypress/E2E (login), config/firebase copy.js, models/User.js, models/News.js, data/*.json (removed).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sanitización rompe email | Low | Tests cubren el caso |
| Dead code eliminado rompe algo | Low | Grep antes de cada eliminación |
| CSRF bloquea formularios | Med | Whitelist + probar cada formulario |

## Rollback Plan

`git revert` por fase. Fase 1: restaurar mainController.js. Fase 2: restaurar newsController.js + multerNews.js. Fase 3: revertir app.js + desinstalar paquetes. Fase 4: `git restore` archivos eliminados.

## Dependencies

`sanitize-html`, `csrf-csrf`, `express-rate-limit` (npm)

## Success Criteria

- [ ] `npm test` pasa completo
- [ ] Cypress E2E corre con autenticación
- [ ] Session secret sin fallback: app falla si no está definido
- [ ] POST sin CSRF token → 403
- [ ] 5+ requests rápidas a /login → 429
- [ ] Error 404/500 muestra vista personalizada
- [ ] Sin archivos JSON data/ — solo Firestore
