# pdf-accessibility Specification

## Purpose

Defines accessible PDF generation for training reports. PDFs MUST comply with PDF/UA by providing semantic structure, metadata, and tagged content so screen readers can navigate headings, tables, and reading order. CV pipeline is out of scope for this change.

## Requirements

### Requirement: Tagged PDF Semantic Structure

The system MUST produce tagged PDFs where headings, tables, and reading order reflect the document's semantic HTML structure.

#### Scenario: Training report with headings and tables

- GIVEN a training report with sections and data tables
- WHEN the PDF is generated
- THEN the PDF structure tree contains `<H1>` through `<H6>` tags corresponding to section headings
- AND tables appear as `<Table>` with `<TH>` header cells and `<Caption>`

### Requirement: PDF Metadata

The system MUST embed language, title, and author metadata in every generated PDF.

#### Scenario: Spanish report metadata

- GIVEN a PDF generation request for an Argentine training report
- WHEN the PDF is produced
- THEN the PDF catalog contains `/Lang` set to `es-AR`
- AND the document title and author are present in the metadata dictionary

### Requirement: Training Report Pipeline

The system SHALL generate an accessible PDF through the existing training report endpoint without changing its URL or response contract.

#### Scenario: Successful training report generation

- GIVEN a valid training report ID and existing endpoint `/informes/:id/pdf`
- WHEN a request is made
- THEN the response returns a PDF with `Content-Type: application/pdf`
- AND the PDF is tagged and contains the report data

#### Scenario: Firestore unavailable during report generation

- GIVEN the training report endpoint receives a request
- AND Firestore is unreachable
- WHEN the system attempts to fetch report data
- THEN the endpoint returns a 500 error
- AND no partial PDF is sent to the client

### Requirement: Error Handling for Invalid Templates

The system MUST handle template rendering failures gracefully.

#### Scenario: Invalid template syntax

- GIVEN a PDF template contains malformed markup
- WHEN the system attempts to render the PDF
- THEN the endpoint returns a 500 error
- AND the error is logged without exposing template internals
