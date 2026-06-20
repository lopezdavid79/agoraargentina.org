# Tasks: Auditoría — Fase 1 (Seguridad)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25-35 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR to main |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fase 1 — Seguridad completa | PR 1 → main | 3 fixes independientes, una sola dependencia npm |

## Phase 1: Dependencias

- [x] 1.1 Run `npm install --save sanitize-html` in project root

## Phase 2: Core — Security Fixes

- [x] 2.1 `controller/mainController.js` — import `sanitize-html`, sanitize `nombre`, `email`, `telefono`, `asunto`, `mensaje` before email template interpolation. Config: `{ allowedTags: [], allowedAttributes: {} }`
- [x] 2.2 `app.js` — remove `|| "Adm@gora$"` fallback on line 37; add validation block before `app.listen()` that exits with code 1 if `SESSION_SECRET` is missing, empty, or shorter than 32 chars
- [x] 2.3 `views/noticias/detail.ejs` — change `<%- noticia.contenido %>` → `<%= noticia.contenido %>` on line 25
- [x] 2.4 `views/admin/noticias/detail.ejs` — change `<%- noticia.contenido %>` → `<%= noticia.contenido %>` on line 25
- [x] 2.5 `views/admin/capacitaciones/detail.ejs` — change `<%- noticia.contenido %>` → `<%= noticia.contenido %>` on line 25
- [x] 2.6 `views/admin/cursos/detail.ejs` — change `<%- noticia.contenido %>` → `<%= noticia.contenido %>` on line 25

## Phase 3: Verificación

- [x] 3.1 Run `npm test` — verify all mainController tests pass, including "sanitizes HTML tags"
- [ ] 3.2 Manual: start app without `SESSION_SECRET` → verify exit with error message
- [ ] 3.3 Manual: start app with valid `SESSION_SECRET` → verify boots normally
- [ ] 3.4 Manual: visit each of the 4 detail views → verify `contenido` renders as escaped text (no HTML execution)
