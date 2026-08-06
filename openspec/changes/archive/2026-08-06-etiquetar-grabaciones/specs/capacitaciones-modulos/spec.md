# Delta for capacitaciones-modulos

## MODIFIED Requirements

### Requirement: Data Model — Multiple Recordings

A modulo MAY contain `grabaciones: [{url, label}]`. The `claseGrabada` string field MUST be retained as a legacy fallback. `grabaciones` wins when non-empty; otherwise `claseGrabada` is used. Each element MUST contain a `url` string; `label` MAY be empty.
(Previously: `grabaciones: string[]` with a future-evolution compatibility note.)

| Field | Type | Fallback |
|---|---|---|
| `grabaciones` | `[{url, label}]` | Primary |
| `claseGrabada` | `string` | Legacy |

#### Scenario: Create with custom labels

- GIVEN an admin submits `grabaciones = [{url:"https://a.com",label:"Intro"},{url:"https://b.com",label:"Práctica"}]`
- WHEN `storeModulo` processes the request
- THEN the created document MUST contain both objects
- AND `claseGrabada` MUST be empty

#### Scenario: Legacy module fallback

- GIVEN a module has `claseGrabada:"https://x.com"` and no `grabaciones`
- WHEN a candidate views the module detail
- THEN the render MUST show one link with text "Clase Grabada 1"

#### Scenario: String elements normalize

- GIVEN a module has `grabaciones = ["https://a.com","https://b.com"]`
- WHEN the system reads or renders the recordings
- THEN each string element MUST normalize to `{url: string, label: ""}`
- AND no error or data loss MUST occur

### Requirement: Admin Forms — Repeatable Recording Inputs

The create and edit forms MUST provide per-recording rows containing a label input and a URL input. The forms MUST use a hidden JSON input (`grabaciones_json`) synchronized via JavaScript, per the `participantes` precedent. The server MUST parse the hidden JSON into `grabaciones: [{url, label}]`. Admins MAY add and remove individual rows before submission. On edit, existing values MUST pre-fill. When editing a legacy-only or string-array module, the form MUST seed each recording with its URL and a default label "Clase Grabada N" where N is the 1-based position in the recordings list.
(Previously: single URL input per row, no labels, no default-label seeding.)

#### Scenario: Remove middle recording

- GIVEN a module has `grabaciones = [{url:"https://a.com",label:"A"},{url:"https://b.com",label:"B"},{url:"https://c.com",label:"C"}]`
- WHEN the admin removes the middle row and submits
- THEN `updateModulo` MUST write `[{url:"https://a.com",label:"A"},{url:"https://c.com",label:"C"}]`

#### Scenario: Edit legacy seeds default label

- GIVEN a module has `claseGrabada:"https://legacy.com/x"` and no `grabaciones`
- WHEN an admin opens the edit form
- THEN the form MUST pre-fill one row with URL "https://legacy.com/x" and label "Clase Grabada 1"
- AND on save `grabaciones[0]` MUST preserve that URL

#### Scenario: Edit string-array seeds defaults

- GIVEN a module has `grabaciones = ["https://a.com","https://b.com"]`
- WHEN an admin opens the edit form
- THEN the form MUST pre-fill two rows with labels "Clase Grabada 1" and "Clase Grabada 2"
- AND the admin MAY edit any label before saving

### Requirement: Validation — Recording Objects

`storeModulo` and `updateModulo` MUST normalize each submitted element to `{url, label}`. The `url` MUST be trimmed; elements with an empty `url` after trimming MUST be discarded. The `label` MAY be any free text, MAY be empty, and MUST be trimmed when present; the system MUST NOT enforce a maximum label length. The resulting array MUST be capped at 10 elements. The system MUST NOT enforce URL format validation. The parser MUST accept both object arrays and legacy string arrays in the hidden JSON, normalizing strings to `{url: trimmedString, label: ""}`.
(Previously: validated plain strings only, no object shape, no labels.)

#### Scenario: Blank and valid mixed

- GIVEN a submission with `[{url:"  ",label:"X"},{url:"https://a.com",label:""},{url:"",label:"Y"},{url:"https://b.com  ",label:"Z"}]`
- WHEN the controller parses the hidden JSON
- THEN stored `grabaciones` MUST be `[{url:"https://a.com",label:""},{url:"https://b.com",label:"Z"}]`

#### Scenario: Legacy string array parses

- GIVEN `grabaciones_json = '["https://a.com","https://b.com"]'`
- WHEN the controller parses the hidden JSON
- THEN stored `grabaciones` MUST be `[{url:"https://a.com",label:""},{url:"https://b.com",label:""}]`

### Requirement: Candidate Render

The candidate detail view MUST render every recording in `grabaciones` as a distinct link. The link text MUST be the trimmed `label` when non-empty; otherwise it MUST fall back to `"Clase Grabada N"` where N is the 1-based position in the rendered recordings list. The link `href` MUST be the `url` value. If `grabaciones` is empty or absent, the view MUST fall back to rendering `claseGrabada` as a single link with label "Clase Grabada 1". Existing modules that store plain strings in `grabaciones` or only store `claseGrabada` MUST continue to work without modification.
(Previously: every link rendered the static text "Clase Grabada".)

#### Scenario: Three recordings with mixed labels

- GIVEN `grabaciones = [{url:"https://a.com",label:"Intro"},{url:"https://b.com",label:""},{url:"https://c.com",label:"Avanzado"}]`
- WHEN a candidate opens the detail page
- THEN the link texts MUST be "Intro", "Clase Grabada 2", and "Avanzado"

#### Scenario: Plain string array renders fallback labels

- GIVEN `grabaciones = ["https://a.com","https://b.com"]`
- WHEN a candidate opens the detail page
- THEN two links MUST show "Clase Grabada 1" and "Clase Grabada 2"

#### Scenario: Remove middle recording renumbers fallback labels

- GIVEN `grabaciones = [{url:"https://a.com",label:""},{url:"https://b.com",label:""},{url:"https://c.com",label:""}]`
- WHEN an admin removes the middle recording and a candidate views the detail
- THEN the rendered link texts MUST be "Clase Grabada 1" and "Clase Grabada 2"

### Requirement: Test Coverage

The implementation MUST follow strict TDD. New and updated tests MUST cover `storeModulo` and `updateModulo` save behavior with labeled objects, `editModulo` render with pre-filled recordings including default labels, and `detailCapacitaciones` render for modules with labeled objects, empty-label fallback, legacy string arrays, and no recordings. All existing `storeModulo` and `deleteModulo` tests MUST remain green. Tests that assert string-only `grabaciones` shapes MUST be rewritten to assert object shapes, going RED first.
(Previously: covered string arrays without labels.)

#### Scenario: String-shape tests go RED first

- GIVEN existing tests assert `grabaciones` as string arrays and static "Clase Grabada" counts
- WHEN the data shape changes to objects
- THEN those tests MUST fail (RED)
- AND after rewriting for object shapes and dynamic labels, all tests MUST pass (GREEN)

## Out of Scope

The following items remain out of scope for this change:

- Data migration or backfill of existing `claseGrabada` values
- Cypress E2E tests

The following item was previously out of scope and is now **IN scope**:

- Per-recording labels or titles
