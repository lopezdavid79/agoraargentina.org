# Proposal: Agendar entrevista en la página de inicio

## Intent

Candidates who visit the homepage currently have a single action (register via Google Form). Add a second CTA below the register button so interested candidates can book a 1:1 interview through an external Google Calendar link — matching the site's established external-link CTA pattern with zero backend changes.

## Scope

### In Scope
- Edit `views/home.ejs` hero (after register button, line 24): add the user-specified paragraph + "Agendar mi entrevista" button.
- External link to `https://calendar.app.google/mXSH4cQgvakNUyXd8` with `target="_blank"` and `rel="noopener"`.
- Reuse existing classes (Bootstrap utilities + `.btn-primary-accent` or a consistent variant); no new CSS unless design proves it necessary.
- Route-rendered Jest test (supertest `GET /` with mocked firebase) asserting the copy and link render.

### Out of Scope
- Carta presentación (`docs/carta_presentación.md`) — not used or built upon.
- Internal `/entrevista` form, new routes, controllers, or views.
- Data-model / Firestore changes.
- Rewording the user-specified Spanish copy.

## Capabilities

### New Capabilities
- `landing-cta`: homepage call-to-action content and external-link rendering rules (styling, `target`/`rel`, accessibility of copy).

### Modified Capabilities
- None.

## Approach

- Pure EJS change in the hero section of `views/home.ejs`: below the register `<a>` (line 24) add a semantic `<p class="lead ...">` with the exact user-specified copy (no manual numbering), then:
  `<a href="https://calendar.app.google/mXSH4cQgvakNUyXd8" class="btn btn-lg ... rounded-pill px-5 py-3" target="_blank" rel="noopener">Agendar mi entrevista</a>`.
- Reuse existing CTA classes; prefer a visually subordinate variant (e.g. `btn-outline-secondary`, mirroring `home.ejs:67`) so the green `.btn-primary-accent` register CTA stays dominant — exact class list finalized in design.
- Test seam: extend `tests/routes.test.js` (existing `jest.mock('../config/firebase')` + supertest). `mainController.home` catches the mock failure and renders `home` with `noticias: []`, so `GET /` works without mock changes; assert `res.text` contains the copy, the calendar URL, `target="_blank"`, and `rel="noopener"`.
- Accessibility: site is WCAG AA; the new content is a real `<p>` + `<a>` (no `\*`/manual numbering), inheriting existing contrast/focus styles.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `views/home.ejs` | Modified | Paragraph + external CTA below register button (hero, line 24) |
| `tests/routes.test.js` | Modified | New `GET /` assertions for copy + calendar link + rel |
| `public/css/styles.css` | Unchanged | Only if design requires a new style |
| `openspec/specs/landing-cta/spec.md` | New | New capability spec |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Calendar URL changes/expires | Med | Stakeholder-provided; verify live during verify phase; single source in one line |
| Two green CTAs competing visually | Low | Use secondary/outline variant |
| `target="_blank"` tab-nabbing | Low | `rel="noopener"` on the new link |

## Rollback Plan

Single-commit, EJS + test only — revert via `git revert <sha>` or restore `views/home.ejs` and `tests/routes.test.js`. No data migration or route removal needed.

## Dependencies

- Google Calendar URL is live and accessible (stakeholder-provided).

## Success Criteria

- [ ] Homepage renders the exact Spanish paragraph and "Agendar mi entrevista" link below the register button.
- [ ] Link points to `https://calendar.app.google/mXSH4cQgvakNUyXd8` with `target="_blank" rel="noopener"`.
- [ ] New Jest test passes (`npm test`).
- [ ] No new route, controller, or data-model change.
