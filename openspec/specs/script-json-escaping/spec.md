# Script JSON Escaping Specification

## Purpose

Prevent `</script>` breakout stored XSS in inline `<script>` blocks by escaping JSON data before EJS unescaped output.

## Requirements

### Requirement: JSON Script Helper

The system MUST provide a `jsonScript(value)` helper that serializes `value` to JSON and escapes `<`, `>`, `&`, U+2028, and U+2029 to `\u003c`, `\u003e`, `\u0026`, `\u2028`, and `\u2029` respectively.

#### Scenario: Breakout payload escaped

- GIVEN a value containing `</script><script>alert(1)</script>`
- WHEN `jsonScript(value)` is called
- THEN the result MUST NOT contain literal `</script>`
- AND it MUST contain `\u003c/script\u003e`

#### Scenario: Unicode line separators escaped

- GIVEN a value containing U+2028 and U+2029
- WHEN `jsonScript(value)` is called
- THEN the result MUST use `\u2028` and `\u2029` escapes

### Requirement: Inline Script JSON Injection

All EJS templates that inject server-side JSON into inline `<script>` blocks MUST use `<%- jsonScript(...) %>`; bare `<%- JSON.stringify(...) %>` MUST NOT remain.

#### Scenario: editModulo breakout prevented

- GIVEN a modulo with `grabaciones[].label` containing `</script>`
- WHEN the admin edit page renders
- THEN the response text MUST NOT contain literal `</script>`
- AND it MUST contain `\u003c/script\u003e`

#### Scenario: informes edit breakout prevented

- GIVEN an informe with `clases` or `participantes` containing `</script>`
- WHEN the admin edit page renders
- THEN the response text MUST NOT contain literal `</script>`
- AND it MUST contain `\u003c/script\u003e`

#### Scenario: informes controller contract

- GIVEN an informe with `participantes` containing `</script>`
- WHEN the edit controller prepares view data
- THEN it MUST pass the parsed array to the template
- AND the template MUST use `<%- jsonScript(...) %>` to inject it

### Requirement: Round-Trip Integrity

The escaping performed by `jsonScript` MUST NOT alter the value parsed by the client; escaped sequences MUST decode back to the original characters.

#### Scenario: Escaped data parses correctly

- GIVEN a value with `<`, `>`, `&`, U+2028, and U+2029
- WHEN the client parses the JSON from the escaped inline script
- THEN the resulting object MUST equal the original value
