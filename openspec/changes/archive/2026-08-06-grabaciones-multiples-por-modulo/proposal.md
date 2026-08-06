# Proposal: Grabaciones múltiples por módulo

## Intent

Capacitaciones modules store a single recording URL (`claseGrabada`). Admins need multiple recordings per module. v1: plain URLs, no labels — but the field shape must keep the labeled-recording path (`[{url,label}]`) open.

## Scope

### In Scope
- Data: add `grabaciones: string[]`; keep `claseGrabada` as legacy fallback (no migration).
- Admin forms: repeatable URL inputs in `createModulos.ejs`/`editModulo.ejs`.
- Controllers: `storeModulo`/`updateModulo` parse array; `createModulos`/`editModulo` pass it through.
- Candidate render: `detail.ejs` shows `grabaciones` (wins when non-empty), else `claseGrabada`.
- Tests (strict TDD): new `updateModulo`/`editModulo`/`detailCapacitaciones` tests; keep `storeModulo`/`deleteModulo` green.
- Optional task (user decides): `activo`-on-create gap (see Decisions).

### Out of Scope
- Labels per recording — future `{url,label}` shape, not implemented.
- Data migration/backfill.
- Cypress E2E (unless cheap).

## Capabilities

### New Capabilities
- `capacitaciones-modulos`: multiple URL recordings per module, legacy fallback, candidate display.

### Modified Capabilities
None — no existing spec covers capacitaciones.

## Approach

1. Controllers write `grabaciones` (trimmed non-empty strings, cap 10).
2. Forms: hidden-JSON `grabaciones` input (informes `participantes` precedent, `form_fields.ejs:298-369`); JS re-serializes on input; add/remove buttons. Chosen over numbered fields: survives mid-list removal on edit without renumbering.
3. Render: `grabaciones.length ? grabaciones : [claseGrabada]`.
4. TDD: tests before form changes.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `controller/adminController.js` | Modified | Parse/write `grabaciones`; pass array to edit form |
| `views/admin/capacitaciones/createModulos.ejs`, `editModulo.ejs` | Modified | Repeatable URL inputs, pre-filled on edit |
| `views/capacitaciones/detail.ejs` | Modified | Render array, fallback `claseGrabada` |
| `tests/adminController.test.js`, `tests/mainController.test.js` | Modified | New tests for touched paths |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Dual source of truth | Med | Non-empty `grabaciones` wins (pinned) |
| Untested paths | Med | New tests (strict TDD) |
| Inline-JS style drift | Low | Follow vanilla-JS + ARIA conventions |

## Rollback Plan

Additive field — existing modules unaffected. Revert: stop rendering `grabaciones` in `detail.ejs`, revert form/controller edits. No data cleanup.

## Dependencies

None external; reuses informes hidden-JSON convention.

## Success Criteria

- [ ] `npm test` green incl. new tests
- [ ] Module with 3 recordings renders all for candidates
- [ ] Legacy `claseGrabada`-only module still renders

## Decisions / Unknowns

- **`activo` gap — recommend fixing (default `activo: true` on create), separate optional task.** New modules are invisible until edited; low risk since visibility is double-gated (capacitación `'Activo'` AND module `activo`).
- Max recordings: 10; blank/whitespace URLs stripped.
- Labels deferred: future `{url,label}` objects fit the same hidden-JSON input.
