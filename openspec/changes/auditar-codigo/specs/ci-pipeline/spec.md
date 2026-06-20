# CI Pipeline Specification

## Purpose

Ensure the automated test suite runs in continuous integration on every code change.

## Requirements

### Requirement: Test Script

The `package.json` `test` script MUST run `jest --runInBand` instead of a placeholder echo.

#### Scenario: Local test execution

- GIVEN the developer runs `npm test`
- WHEN the script executes
- THEN Jest runs with `--runInBand`

### Requirement: CI Workflow Execution

The `.github/workflows/test.yml` workflow MUST execute `npm test` after `npm ci` on every push and pull request to `main`.

#### Scenario: Push triggers CI

- GIVEN a commit is pushed to `main`
- WHEN the workflow runs
- THEN `npm ci` completes
- AND `npm test` executes the Jest suite

#### Scenario: Pull request triggers CI

- GIVEN a pull request targets `main`
- WHEN the workflow runs
- THEN `npm ci` completes
- AND `npm test` executes the Jest suite
