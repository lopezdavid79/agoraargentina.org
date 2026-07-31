# Landing CTA Specification

## Purpose

Define requirements for homepage call-to-action content and external-link rendering, ensuring semantic markup, security, and testability.

## Requirements

### Requirement: Interview Scheduling CTA

The system MUST render the exact paragraph below the existing candidate registration button in `views/home.ejs`:

> "Si te interesa conocernos y que te conozcamos mejor, agenda tu entrevista. Es el espacio para que nos cuentes sobre vos y tus proyectos."

The system MUST render a link labeled "Agendar mi entrevista" immediately below the paragraph.

The link MUST reference `https://calendar.app.google/mXSH4cQgvakNUyXd8`.

The link MUST open in a new browser tab via `target="_blank"`.

The link MUST include `rel="noopener"`.

The paragraph MUST use semantic HTML (e.g., `<p>`) without manual numbering or decorative characters that impede screen-reader consumption.

The link's visible text MUST serve as its accessible name.

#### Scenario: Homepage renders interview CTA

- GIVEN a visitor requests `GET /`
- WHEN the homepage renders
- THEN the response body contains the exact paragraph text
- AND it contains a link with `href="https://calendar.app.google/mXSH4cQgvakNUyXd8"`, `target="_blank"`, and `rel="noopener"`
- AND the link text is "Agendar mi entrevista"

#### Scenario: Interview CTA renders when noticias are unavailable

- GIVEN the Firestore `noticias` fetch fails
- WHEN the homepage renders
- THEN the interview CTA paragraph and link are still present in the response
