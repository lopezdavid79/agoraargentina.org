# Proposal: Fix invalid CSRF token on CV form submissions

## Intent

Users get "Token de seguridad inválido" when submitting the CV generator form (`/cv/generar`) or using the preview button (`/cv/preview`). Root cause: the `<form>` in `views/cv.ejs` is missing the CSRF hidden input that every other form in the project includes. This is a pure implementation fix — no behavior change.

## Scope

### In Scope
- Add CSRF hidden input to `views/cv.ejs` `<form>` block (one line)
- Confirm both POST paths (form submit to `/cv/generar`, JS fetch to `/cv/preview`) pass CSRF validation

### Out of Scope
- No new CSRF-specific tests (no existing CSRF test pattern to follow)
- No changes to CSRF middleware, CV controller, or any other file
- No refactoring of the preview fetch's error UX (pre-existing concern)

## Capabilities

### New Capabilities
None — pure implementation fix, no new capability introduced.

### Modified Capabilities
None — no spec-level behavior changes. The CV form already existed; it was simply missing a required HTML field.

## Approach

Add one line inside the `<form>` block of `views/cv.ejs`, following the exact pattern used by every other form in the codebase (`contacto.ejs`, `admin/login.ejs`, etc.):

```ejs
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

The JS fetch for preview uses `new FormData(form)` to build its POST body, so the hidden input is automatically included — both submission paths are fixed by this single line.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `views/cv.ejs` | Modified | Add CSRF hidden input; position right after `<form ...>` opening tag (~line 18) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| None with this change | — | Additive one-liner following exact codebase pattern; zero side effects on existing behavior |

## Rollback Plan

**Revert the single added line** from `views/cv.ejs`. The change is purely additive — no data migration, no config changes, no test updates. Full rollback in under 30 seconds.

## Dependencies

None.

## Success Criteria

- [ ] `POST /cv/generar` returns 200 instead of 403 for a valid form submission
- [ ] `POST /cv/preview` returns 200 instead of 403 when the preview button is clicked
- [ ] All existing tests pass (`npm test`)
