# Session Security Specification

## Purpose

Define the requirements for secure session management, ensuring the application cannot start with a weak or hard-coded session secret and that session cookies are configured safely.

## Requirements

### Requirement: Mandatory Session Secret

The system MUST verify that the `SESSION_SECRET` environment variable is present and non-empty during application startup.

If `SESSION_SECRET` is missing or empty, the application MUST throw an error and terminate immediately. The system MUST NOT fall back to a hard-coded default secret under any circumstance.

#### Scenario: Application starts with valid secret

- GIVEN the environment variable `SESSION_SECRET` is set to a non-empty string of at least 32 characters
- WHEN the application starts
- THEN the Express session middleware is initialized with that secret
- AND the server begins listening for requests

#### Scenario: Application starts without secret

- GIVEN the environment variable `SESSION_SECRET` is undefined
- WHEN the application starts
- THEN the process MUST exit with a non-zero code
- AND an error message indicating the missing secret MUST be logged

#### Scenario: Application starts with empty secret

- GIVEN the environment variable `SESSION_SECRET` is set to an empty string
- WHEN the application starts
- THEN the process MUST exit with a non-zero code
- AND an error message indicating the missing secret MUST be logged

#### Scenario: Application starts with short secret

- GIVEN the environment variable `SESSION_SECRET` is set to a string shorter than 32 characters
- WHEN the application starts
- THEN the process MUST exit with a non-zero code
- AND an error message indicating the secret is too short MUST be logged

### Requirement: Secure Session Cookie Configuration

The session cookie SHOULD be configured with the `secure` flag set to `true` when the application is running in a production environment over HTTPS.

The `httpOnly` flag MUST be set to `true` to prevent client-side scripts from accessing the session cookie.

#### Scenario: Secure cookie in production

- GIVEN the application is running with `NODE_ENV=production`
- WHEN a session is created
- THEN the session cookie MUST have `httpOnly: true`
- AND the session cookie SHOULD have `secure: true`

#### Scenario: Non-secure cookie acceptable in development

- GIVEN the application is running with `NODE_ENV=development`
- WHEN a session is created
- THEN the session cookie MAY have `secure: false` to allow HTTP local development
- AND `httpOnly` MUST still be `true`
