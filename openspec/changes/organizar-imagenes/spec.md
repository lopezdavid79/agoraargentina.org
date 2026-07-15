# Delta Specs: Organizar Imágenes

## Domain: image-management (New)

### Requirement: Subdirectory Storage

The system SHALL store uploaded images in typed subdirectories under `public/images/`: `logos/`, `noticias/`, `cursos/`.

#### Scenario: Upload stores file in correct subdirectory

- GIVEN an admin submits a noticia/curso form with a file upload
- WHEN multer processes the request
- THEN the file SHALL be saved to `public/images/noticias/` or `public/images/cursos/` respectively

### Requirement: Upload Validation

The system SHALL reject uploads larger than 5MB or with a non-image MIME type.

#### Scenario: Valid image accepted

- GIVEN an admin selects a 2MB PNG
- WHEN the form is submitted
- THEN the upload SHALL succeed

#### Scenario: Invalid MIME rejected

- GIVEN an admin selects a PDF
- WHEN the form is submitted
- THEN the response SHALL be 400 with an error message

#### Scenario: Oversized file rejected

- GIVEN an admin selects a 6MB JPG
- WHEN the form is submitted
- THEN the response SHALL be 413 with an error message

### Requirement: Admin File Input

Admin forms for noticias and cursos SHALL use `<input type="file">` with client-side preview.

#### Scenario: Noticia form renders file input

- GIVEN the admin opens the noticia form
- WHEN the page loads
- THEN the imagen field SHALL be a file input with live preview

#### Scenario: Curso form renders file input

- GIVEN the admin opens the curso form
- WHEN the page loads
- THEN the imagen field SHALL be a file input with live preview

### Requirement: Firestore Path Persistence

After upload, the system SHALL store the public image path in Firestore.

#### Scenario: Noticia path saved

- GIVEN a noticia image upload succeeds
- WHEN the document is saved
- THEN `imagenUrl` SHALL contain `/images/noticias/{filename}`

#### Scenario: Curso path saved

- GIVEN a curso image upload succeeds
- WHEN the document is saved
- THEN `imagen` SHALL contain `/images/cursos/{filename}`

### Requirement: Missing File Handling

The system SHALL preserve the existing image URL when no file is selected on edit.

#### Scenario: No file selected on edit

- GIVEN an admin edits a noticia without selecting a new file
- WHEN the form is submitted
- THEN the existing `imagenUrl` SHALL be retained

## Domain: view-fixes (Modified)

### Requirement: Header Logo Local Path

The header logo SHALL reference the local asset `/images/logos/agora20-asaerca.png`.

#### Scenario: Logo loads locally

- GIVEN the site runs on localhost or production
- WHEN the header renders
- THEN the logo SHALL load from the local path without external URL

### Requirement: Home Noticia Image Display

`home.ejs` SHALL display noticia images using `imagenUrl` and render cards without images when the field is absent.

#### Scenario: Noticia image visible on home

- GIVEN a noticia has `imagenUrl`
- WHEN the home page renders
- THEN the card SHALL display the image

#### Scenario: Missing image handled gracefully

- GIVEN a noticia lacks `imagenUrl`
- WHEN the home page renders
- THEN the card SHALL render without a broken image element

## Domain: migration (New)

### Requirement: Existing Image Migration

Existing images in `public/images/` SHALL be moved to subdirectories and Firestore URLs updated without breaking any reference.

#### Scenario: Images moved without breaking URLs

- GIVEN existing images referenced in Firestore
- WHEN the migration script runs
- THEN files SHALL exist in subdirectories
- AND Firestore documents SHALL point to the new paths
- AND no 404s SHALL occur

### Requirement: Orphan Cleanup

After migration, unreferenced image files in `public/images/` SHALL be removed.

#### Scenario: Orphan deleted

- GIVEN an image file is not referenced by any Firestore document
- WHEN migration completes
- THEN the file SHALL be deleted
