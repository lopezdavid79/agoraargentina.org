# Tasks: Fix invalid CSRF token on CV form submissions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Implementation

- [x] 1.1 Insert `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` in `views/cv.ejs` after the `<form>` opening tag (line 18)

## Phase 2: Verification

- [ ] 2.1 Run `npm test` to confirm all existing tests still pass
- [ ] 2.2 Open the CV form in-browser and submit to `/cv/generar` — confirm 200 instead of 403
- [ ] 2.3 Click the preview button — confirm `/cv/preview` returns 200 instead of 403
