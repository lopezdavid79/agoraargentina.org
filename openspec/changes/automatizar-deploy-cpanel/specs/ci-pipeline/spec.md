# Delta for CI Pipeline

## ADDED Requirements

### Requirement: Deploy Job Orchestration

The `.github/workflows/test.yml` workflow MUST include a `deploy` job that `needs: test`. The `deploy` job MUST run only on `push` events to `main`.

#### Scenario: Green push deploys

- GIVEN a push to `main`
- WHEN tests pass
- THEN the `deploy` job runs

#### Scenario: Red tests block deploy

- GIVEN a push to `main`
- WHEN tests fail
- THEN the `deploy` job is skipped

#### Scenario: PR never deploys

- GIVEN a pull request targets `main`
- WHEN the workflow runs
- THEN the `deploy` job is skipped
