# Delta for Contact Sanitization

## ADDED Requirements

### Requirement: Script-Context JSON Escaping Exception

When user-controlled values are rendered inside inline `<script>` blocks as JSON data, the system MUST use the `jsonScript` helper via `<%- jsonScript(...) %>`. This exception applies to script data context only; the HTML text context mandate (`<%= %>`) remains unchanged.

#### Scenario: Script JSON breakout prevented

- GIVEN an admin-entered label containing `</script><script>window.__x=1</script>`
- WHEN the value is rendered inside an inline `<script>` block as JSON
- THEN the template MUST use `<%- jsonScript(...) %>`
- AND the browser MUST NOT execute the injected script
