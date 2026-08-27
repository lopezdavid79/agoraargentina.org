# Auto-Deploy Specification

## Purpose

Zero-touch cPanel deploy on every verified push to `main`: test gate, UAPI pull, restart, health check, AI report.

## Requirements

### Requirement: Deploy Concurrency

The workflow MUST define a deploy concurrency group with `cancel-in-progress: false`.

#### Scenario: Queue serial deploys

- GIVEN a deploy is running
- WHEN another push to `main` occurs
- THEN the second deploy waits

### Requirement: Version Sanity Check

Before destructive UAPI calls, the deploy MUST call `VersionControl::retrieve` to confirm `repository_root` exists.

#### Scenario: 136 drift detected

- GIVEN `repository_root` is absent or the API returns an unexpected error
- WHEN the sanity check runs
- THEN the job fails with a clear version-drift error

### Requirement: UAPI Deploy Sequence

The deploy MUST call `VersionControl::update` (branch=main), then `VersionControlDeployment::create`, then restart via `PassengerApps` toggle or fallback, then verify `/health`.

#### Scenario: Happy path

- GIVEN the sanity check passes
- WHEN the sequence completes
- THEN `GET /health` returns 200 with body containing `status: ok`

#### Scenario: UAPI failure

- GIVEN a UAPI step returns an error
- WHEN it executes
- THEN the job fails
- AND the site remains in the previous state

### Requirement: AI Deploy Analysis

A deterministic risk scan MUST always run, flagging `package.json`, `package-lock.json`, `.env.example`, `app.js`, `.cpanel.yml` changes and listing commits. An LLM summary SHOULD run when `LLM_API_KEY` exists. The analysis MUST NOT block deploy on LLM failure or absence.

#### Scenario: Dependency change flagged

- GIVEN `package.json` changed in the push
- WHEN the scan runs
- THEN the report flags dependency risk

#### Scenario: LLM key absent

- GIVEN `LLM_API_KEY` is missing
- WHEN the deploy runs
- THEN deployment proceeds with deterministic report only

### Requirement: Secrets

The workflow MUST expose `CPANEL_TOKEN`, `CPANEL_HOST`, and `CPANEL_USER`. `LLM_API_KEY` MAY be present.

#### Scenario: Missing token

- GIVEN `CPANEL_TOKEN` is absent
- WHEN the deploy job starts
- THEN it fails with a clear auth error

### Requirement: Deploy Report

The deploy MUST write a summary to `GITHUB_STEP_SUMMARY` with UAPI results, risk flags, and rollback instructions.

#### Scenario: Summary produced

- GIVEN any deploy outcome
- WHEN the job ends
- THEN the summary contains the result and a rollback command

### Requirement: Failure Handling

A failed deploy MUST NOT retry automatically. Rollback MUST be documented as `git revert <sha>` plus manual or scripted re-pull.

#### Scenario: Dirty checkout

- GIVEN the server checkout is dirty
- WHEN `VersionControlDeployment::create` runs
- THEN the job fails with a clear dirty-checkout error

#### Scenario: Rollback documented

- GIVEN a failed deploy
- WHEN the job ends
- THEN the report includes the revert command
