# No-op Spec Note

## Change: fix-cv-invalid-token

This change is a **pure implementation bugfix**. No specification changes are required.

### Rationale

The existing specifications already correctly describe the intended behavior:

- CSRF protection MUST validate tokens on POST requests.
- Forms that submit via POST MUST include the CSRF hidden input.

The bug was an implementation omission: the `<form>` in `views/cv.ejs` was missing the standard `_csrf` hidden input that every other form in the codebase includes. Adding it aligns the implementation with the existing spec — no delta to the spec itself is needed.

### What Changed

- `views/cv.ejs`: Added `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` inside the form block.

### Verification

- `POST /cv/generar` returns 200 for valid submissions.
- `POST /cv/preview` returns 200 for preview requests.
