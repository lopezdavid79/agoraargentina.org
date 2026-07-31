## Exploration: carta-presentacion

### Current State

Stack per `openspec/config.yaml`: Node.js, Express 5, EJS, Firebase Admin (Firestore), layered MVC (router → controller → model), session-based auth, Bootstrap 5.3.3 (CDN) + custom `public/css/styles.css`. Tests: Jest unit (supertest, firebase mocked) + Cypress 15 E2E. `strict_tdd: true`.

**Homepage** — `views/home.ejs` renders at `GET /` via `mainController.home` (`controller/mainController.js:7-27`), which only fetches the latest 3 noticias from Firestore and renders `home`. The register/sign-up button is in the hero section:

```html
<!-- views/home.ejs:19-24 -->
<h2 class="text-center display-5 fw-bold mb-5"> Forma parte de la base de datos del Programa Ágora</h2>
<p class="lead text-dark mb-5 fs-5">Regístrate ahora y obtén acceso a oportunidades ! </p>
<a href="https://forms.gle/9hnfsY7MG2ddJZ1r9"
   class="btn btn-lg btn-primary-accent fw-bold rounded-pill px-5 py-3"
   target="_blank">Registrarse como candidato
</a>
```

Styling pattern: Bootstrap utility classes (`btn btn-lg btn-primary-accent fw-bold rounded-pill px-5 py-3`) + the custom `.btn-primary-accent` class defined in `public/css/styles.css:37-48` (green accent CTA, WCAG AA). There is no formatter/linter.

**Existing external-link CTA conventions** (all `target="_blank"`):
- `views/home.ejs:63` → Google Form (empresas): `btn btn-lg btn-primary rounded-pill px-4 py-2`
- `views/home.ejs:67` → Google Form (emprendedores): `btn btn-lg btn-outline-secondary rounded-pill px-4 py-2`
- `views/cursos/detail.ejs:80` → same `forms.gle/9hnfsY7MG2ddJZ1r9` registration link
- `views/capacitaciones/detail.ejs:22-26` → `capacitaciones.link_vivo` (Zoom/Meet) rendered as `btn btn-danger btn-lg`

**Interview scheduling** — NONE exists. No route, controller, view, Calendly, or scheduling link anywhere in the repo. The only text mention is `views/quienes-somos.ejs:48` ("Participar en entrevistas preliminares online.") — a bare `<li>`, no link.

**Presentation letter reference** — `docs/carta_presentación.md` is untracked (confirmed via `git status`). It is training/educational content ("Material de orientación y consulta"), not a code doc. No existing route/view/controller references it.

**Tests touching the homepage** — none. `tests/routes.test.js` and `tests/mainController.test.js` cover `/health`, 404, and `/contacto` only. No Cypress spec covers the homepage.

### Affected Areas

- `views/home.ejs` — the register button area (hero section, lines 19-24) where the new CTA text + "Agendar mi entrevista" button must be inserted.
- `docs/carta_presentación.md` — source reference for the presentation-letter deliverable (currently untracked, would need to be committed).
- `public/css/styles.css` — only if new custom styles are needed; existing `.btn-primary-accent` already fits a second CTA.
- `controller/mainController.js` + `router/mainRouter.js` — only if a new internal page/route for the letter (or for scheduling) is created.
- `tests/mainController.test.js` or `tests/routes.test.js` — only if a new route is added (strict_tdd).
- `openspec/specs/` — spec domain choice depends on scope (e.g., new `landing-cta` or reuse of an existing domain).

### Approaches

**Deliverable 1 — Presentation letter ("carta presentación")**

1. **Static page at `/carta-presentacion`** — new route + controller method + `views/carta-presentacion.ejs` rendering the doc's content as an accessible web page.
   - Pros: No auth/admin dependency; content controlled in-repo; can reference the CV feature (`/cv`); accessible with existing header/footer.
   - Cons: New route + view + tests; content duplication if it should live in Firestore; must be re-coded from the markdown (formatting/layout decisions).
   - Effort: Medium

2. **Firestore capacitación module (`linkMaterial`)** — publish the letter as material attached to a module of an existing/existing-to-be capacitación, matching the admin-driven content model (`capacitaciones` → `modulos` with `linkMaterial`, `claseGrabada`, `activo`).
   - Pros: Follows the existing content-management pattern (admin CRUD in `adminController.js:456-543`); zero new routes; content editable without deploys.
   - Cons: Requires seeding data in Firestore (no seed mechanism exists — `data/` is empty); the doc has no owning capacitación yet; homepage CTA ("conocernos") is unrelated to a training module; content not versioned in git.
   - Effort: Low (code) / Medium (data)

3. **PDF/static asset served from `public/`** — render the letter as a PDF/HTML file.
   - Pros: Simplest; no code changes beyond a link.
   - Cons: Not accessible (violates the site's WCAG AA / "Contenido optimizado para lectores de pantalla" stance); PDF maintenance; doesn't match "carta presentación" as a *feature*.
   - Effort: Low

4. **Hybrid** — commit the markdown doc (it's untracked, reference material for the site's training content) AND expose it as a module `linkMaterial`. Requires a capacitación to attach it to.
   - Pros: Preserves the source doc; uses existing content pipeline.
   - Cons: Depends on Firestore data seeding; homepage deliverable still unaddressed.
   - Effort: Low-Medium

**Deliverable 2 — Homepage CTA ("Agendar mi entrevista")**

1. **External scheduling link (Calendly / Google Form / WhatsApp)** — plain `<a target="_blank">` styled like existing CTAs.
   - Pros: Zero backend; matches the site's established external-link CTA pattern (register/empresas/emprendedores all go to Google Forms); fastest.
   - Cons: The target URL does NOT exist yet — a decision/asset is required from the stakeholder (no Calendly account or form found). If none is provided, the button cannot point anywhere real.
   - Effort: Low

2. **Internal scheduling page + form** — new route `/entrevista` with a form (name, email, availability) that emails `info@agoraargentina.ar` via the existing nodemailer pattern (`mainController.processContacto`, `mainRouter.js:31` with rate limiter + csrf middleware already global).
   - Pros: Full control; accessible; no third-party dependency; can reuse the `/contacto` send pattern and its tests as a template.
   - Cons: New route, view, controller method, validation, rate limiting, and tests (strict_tdd); mailbox is `info@agoraargentina.ar` per SMTP config — interview requests would land there; scope grows.
   - Effort: Medium-High

3. **mailto: link** — `<a href="mailto:programaagora.arg@gmail.com">`.
   - Pros: Trivial.
   - Cons: Poor UX, not "agendar"; footer already exposes this email.
   - Effort: Low

### Recommendation

Split the two deliverables:

- **CTA (homepage)**: external-link approach (Option 1) if the stakeholder provides a scheduling URL (Calendly/Google Form/WhatsApp) — it matches every existing CTA on the page. Otherwise fall back to an internal `/entrevista` form (Option 2) modeled on `/contacto`.
- **Presentation letter**: Approach 1 (static `/carta-presentacion` page) is the most self-contained and testable, and it gives the "conocernos" CTA a real destination. Approach 2 (Firestore module) is the better long-term fit IF the letter belongs to a capacitación — but there is no owning capacitación and no seed pipeline, so it stalls on data setup.

This is a genuine fork that the proposal must resolve with the user: it depends on (a) whether a scheduling tool already exists in the organization, and (b) whether the letter is training content (→ capacitación module) or site content (→ standalone page).

### Risks

- **No scheduling destination exists** — the "Agendar mi entrevista" button cannot be implemented meaningfully until the target (Calendly URL, form, or internal route) is decided. Blocking unknown for proposal.
- **Content of the letter is stakeholder content** — the doc is an orientation/consultation module for visually impaired users (WCAG AA site). Any rendering must preserve screen-reader accessibility (e.g., avoid the doc's `\*`/manual numbering formatting; use real headings/lists).
- **Accented filename** — `docs/carta_presentación.md` has a non-ASCII name; if it becomes a committed artifact, keep the accent (git handles it) or rename to `carta-presentacion.md` to avoid cross-platform/tooling friction — decide in proposal.
- **Untracked working tree** — many untracked files exist (images, coverage/); the change must commit only its own files.
- **No test precedent for homepage content** — if only the EJS changes (no route), strict_tdd has no obvious unit seam; a route-rendered assertion (supertest) on `GET /` with mocked firebase is the natural test.

### Ready for Proposal

Yes — exploration complete. The orchestrator should tell the user the two decisions required before proposal:

1. Where should "Agendar mi entrevista" point? (Existing scheduling link/URL to be provided, OR build an internal `/entrevista` form.)
2. Is the carta presentación a standalone page on the site, or material for a capacitación module?
