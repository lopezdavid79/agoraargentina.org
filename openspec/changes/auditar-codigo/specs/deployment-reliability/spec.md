# Deployment Reliability Specification

## Purpose

Ensure the application can be diagnosed at startup and runtime through health checks, environment validation, and graceful error handling.

## Requirements

### Requirement: Health Endpoint

The system MUST expose `GET /health` without authentication. It MUST return HTTP 200 and a JSON body containing `status`, `uptime`, and `env`.

#### Scenario: Health check succeeds

- GIVEN the application is running
- WHEN an unauthenticated client requests `GET /health`
- THEN the response status is 200
- AND the body contains `{ status: "ok", uptime: <seconds>, env: <NODE_ENV> }`

### Requirement: Startup Environment Validation

The system MUST verify that `SESSION_SECRET`, `FIREBASE_*`, and `EMAIL_PASS` are present and non-empty before `app.listen()`. If any are missing, the system MUST log the missing variable name and exit with code 1.

#### Scenario: All environment variables present

- GIVEN all required variables are set
- WHEN the application starts
- THEN the server begins listening

#### Scenario: Missing required variable

- GIVEN `SESSION_SECRET` is undefined
- WHEN the application starts
- THEN the process logs an error naming the missing variable
- AND exits with code 1

### Requirement: Startup Logging

The system MUST log the configured port, `NODE_ENV`, and the presence (without values) of critical environment variables on boot.

#### Scenario: Production startup

- GIVEN `NODE_ENV=production` and `PORT=8080`
- WHEN the server starts listening
- THEN the log shows port, environment, and confirmation that each critical variable is present

### Requirement: Error View

The system MUST render a user-friendly `views/error.ejs` when an unhandled exception occurs, instead of exposing a stack trace.

#### Scenario: Unhandled error in production

- GIVEN the application is running
- WHEN an unhandled error occurs during a request
- THEN the response status is 500
- AND the response body is the rendered error view
