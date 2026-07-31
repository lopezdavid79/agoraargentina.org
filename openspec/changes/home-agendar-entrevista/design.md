# Design: Agendar entrevista en la página de inicio

## Technical Approach

Static EJS-only change in `views/home.ejs` — insert a semantic `<p>` + `<a>` (external Google Calendar link) below the register button in the hero section. No backend changes. Test via supertest `GET /` with the existing mocked firebase seam. Zero new files except the test assertion block.

## Architecture Decisions

| Decision | Choice | Tradeoffs | Rationale |
|----------|--------|-----------|-----------|
| Button variant | `btn-outline-secondary` (Bootstrap), matching `home.ejs:67` | `btn-primary-accent` (green) would compete visually with the register button; a custom variant adds CSS debt. | Proposal and spec explicitly require the new CTA to be visually subordinate. `btn-outline-secondary` is the site's established subordinate pattern (emprendedores CTA, line 67) and requires zero new CSS. |
| Paragraph spacing | `mt-5` (3rem top margin) + `mb-3` | `mb-5` (3rem) would make the gap to the button too large; no top margin would crowd the register button. | Creates clear visual separation from the register button above while keeping the new CTA's internal paragraph-to-button spacing tight. |
| Button padding | `px-4 py-2` (smaller), matching subordinate CTA | `px-5 py-3` (larger, matching register button) would visually equalize both CTAs, defeating subordination. | Reinforces visual hierarchy: register button is larger/prominent, interview CTA is smaller/subordinate. Consistent with `home.ejs:67`. |
| Test location | New `describe('GET /')` block in `tests/routes.test.js` | A separate test file adds fragmentation without benefit. A new `describe` in the controller test file requires unit-test infrastructure not needed here. | The existing `tests/routes.test.js` already has the firebase mock, supertest setup, and route-rendered test precedent (404). One coherent file for all route assertions. |
| Test assertions | `expect(res.text).toContain(...)` string assertions on the HTML body | Regex assertions are brittle; CSS selector assertions require cheerio dependency. | `toContain` is simple, readable, and fast. The spec's required assertions (exact text, URL, attributes, link label) are all straightforward substring checks. |

## Data Flow

No data flow — pure static content. The EJS template renders unconditionally; the controller's `res.render('home', ...)` already includes this section.

```
Browser GET / ──→ Express ──→ mainController.home
                                    │
                               res.render('home')  ← always renders the new CTA
                                    │
                               views/home.ejs
                                    │
                               HTML response
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `views/home.ejs` | Modify | Insert paragraph + button after line 24 (register `</a>`) inside hero `<div class="col-lg-10">` |
| `tests/routes.test.js` | Modify | Add `describe('GET /')` block with assertions for copy, URL, link text, and security attributes |

## Interfaces / Contracts

```html
<!-- Inserted after views/home.ejs line 24 (closing </a> of register button) -->
<p class="lead text-dark mt-5 mb-3 fs-5">
  Si te interesa conocernos y que te conozcamos mejor, agenda tu entrevista. Es el espacio para que nos cuentes sobre vos y tus proyectos.
</p>
<a href="https://calendar.app.google/mXSH4cQgvakNUyXd8"
   class="btn btn-lg btn-outline-secondary rounded-pill px-4 py-2"
   target="_blank" rel="noopener">Agendar mi entrevista</a>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Homepage renders interview CTA | `supertest(app).get('/')` → assert `res.text` contains paragraph text, calendar URL, `target="_blank"`, `rel="noopener"`, "Agendar mi entrevista". Reuses `jest.mock('../config/firebase')` — mock failure triggers `noticias: []` fallback (controller line 25), proving CTA renders even when Firestore is unavailable (spec scenario 2). |

## Migration / Rollout

No migration required. Single-commit change to two files. Rollback: `git revert <sha>`.

## Open Questions

None — all decisions resolved in design.
