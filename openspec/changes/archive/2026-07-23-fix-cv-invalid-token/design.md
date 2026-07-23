# Design: Fix invalid CSRF token on CV form submissions

## Technical Approach

Add the missing `_csrf` hidden input to `views/cv.ejs` so the CSRF middleware can validate both POST paths (`/cv/generar` and `/cv/preview`). This is a single-line additive fix aligned with the exact pattern used by every other form in the codebase.

## Architecture Decisions

### Decision: Place hidden input immediately after `<form>` opening tag

| Option | Tradeoff | Decision |
|--------|----------|----------|
| After `<form ...>` (line 18) | Follows codebase pattern; visually clear for maintainers | **Chosen** |
| Before `</form>` (line 148) | Works the same but inconsistent with other forms (`contacto.ejs`, `admin/login.ejs`) | Rejected |

**Rationale**: Every other form in the project places the CSRF hidden input right after the `<form>` opening tag (e.g., `views/contacto.ejs`). Consistency wins.

### Decision: No new tests

**Rationale**: The test file `tests/generar_cv.test.js` tests only pure PDF generation logic (unit tests on `generateCvPdf`), not HTTP request handling. No existing CSRF integration test pattern exists in the project. The change is a single additive HTML line — zero risk to existing behavior.

## Data Flow

The CSRF token flows through two paths, both fixed by the same hidden input:

```
                    ┌──────────────────────────────────────────┐
                    │         res.locals.csrfToken              │
                    │    (set by csrfMiddleware middleware)      │
                    └───────────┬──────────────────────────────┘
                                │
                                ▼
              <%= csrfToken %> in views/cv.ejs
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                      ▼
    <input type="hidden"                      new FormData(form)
    name="_csrf" ...>                         (JS serialization)
             │                                      │
             ▼                                      ▼
    POST /cv/generar                         fetch POST /cv/preview
    (standard form submit)                   (application/x-www-form-urlencoded)
             │                                      │
             └──────────────┬───────────────────────┘
                            ▼
              csrfMiddleware reads req.body._csrf
                            │
                      verify(token, secret)
                            │
                     ┌──────┴──────┐
                     ▼              ▼
                  200 OK        403 "Token inválido"
```

The preview button at line 362 already serializes the form via `new FormData(form)`, converting all inputs (including hidden ones) to a `URLSearchParams` body. Both paths reach `csrfMiddleware` line 27 (`req.body._csrf`) — the hidden input is the single source of truth for both.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `views/cv.ejs` | Modify | Add `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` immediately after the `<form>` opening tag (line 18) |

## Interfaces / Contracts

No new interfaces, types, or contracts. The CSRF validation contract is already defined in `middleware/csrfMiddleware.js` — this change simply supplies the expected token field.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual verification | POST /cv/generar returns 200 (not 403) | Manual submit via browser |
| Manual verification | POST /cv/preview returns 200 (not 403) | Click preview button |
| Automated | All existing tests pass | `npm test` |

No new automated tests — the change is a one-line HTML addition with no new logic, and the project has no existing CSRF integration test pattern.

## Migration / Rollout

No migration required. Rollback: delete the single added line from `views/cv.ejs`.

## Open Questions

None.
