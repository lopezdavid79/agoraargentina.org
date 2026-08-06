# Capacitaciones Módulos Specification

## Purpose
Define the behavior of capacitaciones module management, including multiple recordings per module, legacy fallback, and candidate visibility.

## Requirements

### Requirement: Data Model — Multiple Recordings

A modulo document in the `modulos` subcollection MAY contain a `grabaciones` field of type `string[]`. The existing `claseGrabada` string field MUST be retained as a legacy fallback. When reading recording data, the system MUST use `grabaciones` if it is a non-empty array; otherwise it MUST fall back to `claseGrabada`. The field shape MUST remain compatible with a future evolution to an array of `{url, label}` objects.

| Field | Type | Fallback |
|---|---|---|
| `grabaciones` | `string[]` | Primary |
| `claseGrabada` | `string` | Legacy |

#### Scenario: Create module with multiple recordings

- GIVEN an admin submits the new-module form with `grabaciones` = `["https://a.com","https://b.com"]`
- WHEN `storeModulo` processes the request
- THEN the created document MUST include `grabaciones` with both URLs
- AND `claseGrabada` MUST be omitted or empty

#### Scenario: Legacy module renders single recording fallback

- GIVEN an existing module has `claseGrabada: "https://youtube.com/x"` and no `grabaciones`
- WHEN a candidate views the module detail
- THEN the render MUST display the single link from `claseGrabada`

### Requirement: Admin Forms — Repeatable URL Inputs

The admin create and edit forms MUST provide repeatable URL inputs for recordings. The forms MUST use a hidden JSON input synchronized via JavaScript (the hidden-JSON variant, per informes `participantes` precedent). The system MUST parse the hidden JSON server-side into `grabaciones: string[]`. Admins MUST be able to add and remove individual URL inputs before submission. On edit, the form MUST pre-fill existing `grabaciones` values.

#### Scenario: Edit module removing middle recording

- GIVEN a module with `grabaciones` = `["https://a.com","https://b.com","https://c.com"]`
- WHEN the admin removes the middle input and submits
- THEN `updateModulo` MUST write `grabaciones` = `["https://a.com","https://c.com"]`
- AND the hidden JSON MUST correctly reflect the remaining order

### Requirement: Validation — Recording URLs

`storeModulo` and `updateModulo` MUST strip whitespace from each submitted URL, discard empty or whitespace-only strings, and cap the resulting array at 10 elements. The system MUST NOT enforce URL format validation (consistent with existing `linkMaterial` and `claseGrabada` behavior). URLs MUST be stored as plain strings.

#### Scenario: Submit with blank and valid URLs

- GIVEN a form submission with inputs `["  ","https://a.com","","https://b.com  "]`
- WHEN the controller parses the hidden JSON
- THEN `grabaciones` MUST be stored as `["https://a.com","https://b.com"]`

### Requirement: Candidate Render

The candidate detail view (`detail.ejs`) MUST render every URL in `grabaciones` as a distinct "Clase Grabada" link. If `grabaciones` is empty or absent, the view MUST fall back to rendering `claseGrabada` as a single link. Existing modules that only store `claseGrabada` MUST continue to work without modification.

#### Scenario: Module with three recordings

- GIVEN a module with `grabaciones` containing three URLs
- WHEN a candidate opens the detail page
- THEN three separate "Clase Grabada" links MUST be displayed

### Requirement: Active by Default

`storeModulo` MUST set `activo: true` on every newly created module. This requirement closes a pre-existing gap where new modules were invisible to candidates until manually edited.

#### Scenario: New module visible to candidates

- GIVEN an admin creates a new module
- WHEN `storeModulo` saves the document
- THEN the document MUST include `activo: true`
- AND the module MUST appear in candidate views

### Requirement: Test Coverage

The implementation MUST follow strict TDD. New tests MUST cover `updateModulo` save behavior, `editModulo` render with pre-filled recordings, and `detailCapacitaciones` render for modules with multiple recordings, single legacy recording, and no recordings. All existing `storeModulo` and `deleteModulo` tests MUST remain green.

## Out of Scope

- Per-recording labels or titles
- Data migration or backfill of existing `claseGrabada` values
- Cypress E2E tests
