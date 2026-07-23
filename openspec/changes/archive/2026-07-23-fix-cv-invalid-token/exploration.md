# Exploration: fix-cv-invalid-token

## Current State

The CSRF middleware (`middleware/csrfMiddleware.js`) runs globally via `app.use()` in `app.js:53` — after session middleware and before all routers. For every state-changing request (POST/PUT/DELETE), it validates the token from `req.body._csrf`, `req.query._csrf`, or the headers `csrf-token`/`xsrf-token`/`x-csrf-token`.

The CV form (`views/cv.ejs`) has two POST submission paths:

1. **Standard form POST** to `/cv/generar` (triggered by the "Descargar CV en PDF" submit button, line 145)
2. **JS `fetch` POST** to `/cv/preview` (triggered by the "Previsualizar" button, line 365)

Both paths are blocked by the CSRF middleware because **neither includes a CSRF token**.

Every other form in the codebase that uses POST includes the standard hidden input pattern:
```ejs
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

This pattern is present in: `contacto.ejs`, `admin/login.ejs`, `admin/dashboard.ejs`, `admin/perfil.ejs`, `admin/cursos/edit.ejs`, `admin/capacitaciones/*.ejs`, `admin/informes/*.ejs`, and `admin/modal_contenedor.ejs`.

No existing JS/fetch-based POST in the codebase sends CSRF tokens — the CV preview fetch is the only client-side JS POST in the app. There is no established pattern to follow for JS-based submissions.

## Affected Areas

| File | Lines | Why |
|------|-------|-----|
| `views/cv.ejs` | 18 | `<form>` tag missing `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` |
| `views/cv.ejs` | 365 | `fetch('/cv/preview', ...)` does not include CSRF token in body or headers |
| `middleware/csrfMiddleware.js` | 26-35 | The middleware that rejects these requests — not a bug, working as designed |
| `controller/cvController.js` | 29-107 | `generar` handler — currently unreachable via form POST due to missing token |
| `controller/cvController.js` | 111-298 | `preview` handler — currently unreachable via fetch due to missing token |

### Not affected

- `tests/generar_cv.test.js` — Tests only the PDF generation function (`scripts/generar_cv.js`), not HTTP endpoints. No changes needed.
- No CSRF-specific tests exist in the codebase. No existing tests will break.
- The `csrfMiddleware.js` logic itself is correct — it properly skips in test mode.

## Approaches

### 1. Minimal fix — single hidden input

Add the standard CSRF hidden input to the form in `cv.ejs`.

Since the JS `fetch` at line 365 already uses `new FormData(form)` to build the request body, adding the hidden input to the HTML form automatically includes the `_csrf` field in the fetch POST body as well — the CSRF middleware checks `req.body._csrf` first.

**Changes needed**: Exactly **one line** added to `views/cv.ejs`:
```ejs
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

- **Pros**: One-line change; follows existing codebase pattern exactly; fixes both submission paths simultaneously; zero refactoring risk.
- **Cons**: None beyond the minimal change.
- **Effort**: Low (minutes).

### 2. Robust fix — hidden input + explicit fetch header

Same as Approach 1, but also extract the CSRF token in the JS and send it explicitly as a `csrf-token` header in the fetch call. This makes the fetch's CSRF handling explicit and could serve as a pattern for future JS-based submissions.

**Changes**: Add hidden input to form + add JS code to read token and set header on fetch.

- **Pros**: More explicit; sets a precedent for JS-based CSRF handling.
- **Cons**: More code; the hidden input alone already works; over-engineering for a single fetch call.
- **Effort**: Low-Medium.

### 3. Skip CSRF for CV routes (not recommended)

Exempt CV routes from CSMF validation by adding route-specific logic in the middleware.

- **Pros**: Fixes the immediate problem.
- **Cons**: Weakens CSRF protection on public-facing routes; inconsistent with the rest of the app; defeats the purpose of global CSRF middleware.
- **Effort**: Low.
- **Verdict**: Rejected — security regression.

## Recommendation

**Approach 1** — add the single hidden input to the form.

Rationale:
- It's the established, battle-tested pattern used by every other view in the codebase.
- One line fixes both the form POST `/cv/generar` and the JS fetch POST `/cv/preview` because `FormData(form)` picks up the hidden field automatically.
- Zero risk: follows exact convention, no new patterns introduced.
- No tests to update — the only existing CV test (`tests/generar_cv.test.js`) tests the pure PDF function, not HTTP endpoints.

## Risks

- **None with Approach 1**. Adding a hidden input to a form that's missing it is purely additive with zero side effects.
- If TDD requires a new test for the fix, a unit test for the form rendering or an integration test for the POST endpoint would be needed. The existing test suite doesn't cover HTTP-level CSRF validation, so this would be new test surface.
- The preview fetch error handler (line 376-379 of `cv.ejs`) catches errors but the UX is a raw `alert()` — this is a pre-existing concern, not a risk of this fix.

## Ready for Proposal

**Yes.** The root cause is confirmed and clear: missing CSRF input in `views/cv.ejs`. The fix is a single-line additive change following the existing codebase pattern. Proceed to proposal with confidence.
