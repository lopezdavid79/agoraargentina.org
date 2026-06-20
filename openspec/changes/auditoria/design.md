# Design: Auditoría — Fase 1 (Seguridad)

## Technical Approach

Three independent security fixes, each reversible: strip HTML from contact-form user input via `sanitize-html`, fail-fast on missing `SESSION_SECRET` at startup, and escape Firestore `contenido` in 4 detail views by switching `<%-` to `<%=`. Zero new project files; one new npm dependency.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Sanitization method | A: `sanitize-html` (dep)<br>B: Custom regex `/<[^>]*>/g`<br>C: Custom `escapeHtml()` entity encoder | **A — `sanitize-html`** | Regex handles basic cases but fails on obfuscated XSS (nested, malformed). Entity encoding produces visible `&lt;script&gt;` — not what the test expects (test asserts tags are REMOVED, text preserved). `sanitize-html` with `allowedTags: []` strips all HTML correctly, handles edge cases, and is already listed in the proposal dependencies. |
| D2 | Session secret validation | A: Remove fallback only<br>B: Remove fallback + startup validation + `process.exit(1)` | **B — fail-fast** | Option A leaves sessions silently unsigned if env is missing. Option B prevents the app from starting insecurely — immediate, visible, unambiguous. |
| D3 | XSS fix in detail views | A: `<%=` (EJS escape, no rich text)<br>B: `<%-` + server-side sanitize | **A — `<%=`** | The proposal explicitly requests `<%-` → `<%=`. Server-side sanitization (B) preserves rich text but adds complexity not justified in Phase 1. If rich formatting is needed later, it can be reintroduced with sanitize-html server-side in a follow-up. |

## Data Flow: Contact Form Sanitization

```
Browser (POST /contacto)
  │
  ▼
mainRouter.post('/contacto', ...)
  │
  ▼
mainController.processContacto(req, res)
  │
  ├─ sanitize(nombre)  ─┐
  ├─ sanitize(email)    │
  ├─ sanitize(telefono) │ sanitize-html(stripTags: true)
  ├─ sanitize(asunto)   │ → removes ALL HTML tags, keeps text
  └─ sanitize(mensaje) ─┘
  │
  ▼
nodemailer.sendMail({ html: `...${sanitized}...` })
  │
  ▼
SMTP → info@agoraargentina.ar
```

`sanitize-html` config: `{ allowedTags: [], allowedAttributes: {} }` — strips everything, output is plain text safe for HTML email body.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `controller/mainController.js` | Modify | Import `sanitize-html`, call `sanitizeHtml()` on `nombre`, `email`, `telefono`, `asunto`, `mensaje` before interpolating into email HTML template (line 86-92). |
| `app.js` | Modify | Line 37: remove `\|\| "Adm@gora$"` fallback. Add validation block before `app.listen()`: `if (!process.env.SESSION_SECRET) { console.error(...); process.exit(1); }`. |
| `views/noticias/detail.ejs` | Modify | Line 25: `<%- noticia.contenido %>` → `<%= noticia.contenido %>` |
| `views/admin/noticias/detail.ejs` | Modify | Line 25: `<%- noticia.contenido %>` → `<%= noticia.contenido %>` |
| `views/admin/capacitaciones/detail.ejs` | Modify | Line 25: `<%- noticia.contenido %>` → `<%= noticia.contenido %>` |
| `views/admin/cursos/detail.ejs` | Modify | Line 25: `<%- noticia.contenido %>` → `<%= noticia.contenido %>` |
| `package.json` | Modify | Add `sanitize-html` to dependencies (via `npm install --save sanitize-html`) |

**Note**: `<%- include(...) %>` lines in EJS files are NOT affected — these include template files, not user data, and are safe.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `mainController.processContacto` HTML sanitization | Existing test `tests/mainController.test.js` ("sanitizes HTML tags") currently FAILS — after fix, all 4 tests in the suite must pass. No new tests needed; existing assertions cover tag stripping, empty fields, and error handling. |
| Unit | Session secret validation | No automated test at this layer — `app.js` startup is not Jest-tested. Manual verification: start app without `SESSION_SECRET` → exits with error; start with it → boots normally. |
| Integration | XSS-escaped detail views | Manual browser test: visit each of the 4 detail views, verify `contenido` renders as escaped text (raw HTML tags visible as text, not executed). |
| E2E | Contact form end-to-end | Cypress (Phase 4): verify form submission sends sanitized email. Not covered in Phase 1. |

## Migration / Rollout

No migration required. Rollback: `git revert` the commit. Each fix is independent — reverting one does not affect the others.

## Open Questions

- None for Phase 1. All decisions are clear from the proposal and exploration.
