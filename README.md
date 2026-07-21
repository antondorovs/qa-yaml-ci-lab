# QA YAML CI Lab

[![GitHub Actions](https://github.com/antondorovs/qa-yaml-ci-lab/actions/workflows/quality-gate.yml/badge.svg)](https://github.com/antondorovs/qa-yaml-ci-lab/actions/workflows/quality-gate.yml)
[![GitLab Pipeline](https://gitlab.com/antondorovs/qa-yaml-ci-lab/badges/main/pipeline.svg)](https://gitlab.com/antondorovs/qa-yaml-ci-lab/-/pipelines)

QA YAML CI Lab is a small practice repository for building reliable YAML-based
quality gates. It validates every YAML file in the repository and applies JSON
Schema contracts to QA-specific examples.

## What It Checks

- YAML syntax across the repository
- duplicate mapping keys
- formatting with Prettier
- accessibility audit coverage for critical release checks
- browser coverage across Chromium, Firefox and WebKit
- QA test plan structure and required fields for every named test plan
- defect triage severity, intake and escalation rules
- deployment approval rules for staging and production
- deployment rollback triggers, thresholds and verification
- environment variable matrix structure and required runtime URLs
- flaky-test rerun and quarantine rules
- notification channels for quality, deployment and rollback events
- performance budget thresholds for release regressions
- pipeline stage structure for quality, smoke, regression and reporting
- release quality thresholds for pass rate, failures and flaky tests
- security scan coverage for static analysis, dependencies and secrets
- service level objectives for release readiness
- test data retention and masking rules
- test report formats, paths, retention and publishing rules
- a compact Kubernetes smoke-test Job contract
- a scheduled Kubernetes regression CronJob with overlap protection
- the same quality gate in GitHub Actions and GitLab CI
- a portable JSON validation report stored as a CI artifact
- Docker based execution for the same local quality gate

The Kubernetes contract is intentionally focused on this lab. It complements,
but does not replace, validation against a real Kubernetes API server.

## Requirements

- Node.js 24 LTS
- npm
- Docker, optional for container-based checks

## Run Locally

Install the locked dependencies:

```bash
npm ci
```

Run the complete quality gate:

```bash
npm run check
```

Run the same checks in Docker:

```bash
npm run docker:check
```

Generate the same JSON report used by CI:

```bash
npm run validate -- --report reports/yaml-quality.json
```

Run an individual check:

```bash
npm run format:check
npm run validate
npm test
```

## Project Structure

```text
.
|-- Dockerfile
|-- .github/workflows/quality-gate.yml
|-- .dockerignore
|-- examples/accessibility-audit-policy.yaml
|-- examples/api-regression-test-plan.yaml
|-- examples/browser-coverage-matrix.yaml
|-- examples/defect-triage-policy.yaml
|-- examples/deployment-approval-policy.yaml
|-- examples/deployment-rollback-policy.yaml
|-- examples/environment-matrix.yaml
|-- examples/flaky-test-policy.yaml
|-- examples/notification-policy.yaml
|-- examples/performance-budget-policy.yaml
|-- examples/pipeline-stages.yaml
|-- examples/quality-gate.yaml
|-- examples/qa-test-plan.yaml
|-- examples/security-scan-policy.yaml
|-- examples/service-level-objective-policy.yaml
|-- examples/test-data-retention-policy.yaml
|-- examples/test-report-policy.yaml
|-- k8s/regression-cronjob.yaml
|-- k8s/smoke-test-job.yaml
|-- schemas/
|   |-- accessibility-audit-policy.schema.json
|   |-- browser-coverage-matrix.schema.json
|   |-- defect-triage-policy.schema.json
|   |-- deployment-approval-policy.schema.json
|   |-- deployment-rollback-policy.schema.json
|   |-- environment-matrix.schema.json
|   |-- flaky-test-policy.schema.json
|   |-- kubernetes-regression-cronjob.schema.json
|   |-- kubernetes-smoke-job.schema.json
|   |-- notification-policy.schema.json
|   |-- performance-budget-policy.schema.json
|   |-- pipeline-stages.schema.json
|   |-- quality-gate.schema.json
|   |-- qa-test-plan.schema.json
|   |-- security-scan-policy.schema.json
|   |-- service-level-objective-policy.schema.json
|   |-- test-data-retention-policy.schema.json
|   `-- test-report-policy.schema.json
|-- scripts/
|   |-- lib/yaml-quality.mjs
|   `-- validate-yaml.mjs
|-- test/yaml-quality.test.mjs
`-- .gitlab-ci.yml
```

## Validation Errors

Syntax and duplicate-key errors identify the affected file:

```text
examples/broken.yaml: Map keys must be unique
```

Schema failures include the contract and JSON path:

```text
examples/qa-test-plan.yaml: qa-test-plan contract /tests/0 must have required property 'expected'
```

Accessibility audit policies must keep WCAG 2.2 AA checks for keyboard
navigation, color contrast and ARIA labels in the release gate.
Browser coverage matrices must include Chromium, Firefox and WebKit with smoke
coverage, plus desktop and mobile viewports for release confidence.
Defect triage policies must keep critical response times tight and require
reproduction details before escalation.
Environment matrices must define a `BASE_URL` variable for each supported
environment so CI jobs and Kubernetes examples can share the same target names.
Production deployments require regression checks, two approvals and automatic
freezing when a required check fails.
Rollback starts automatically on health or error-rate failures, targets the
previous stable release and requires health and smoke verification.
Flaky tests can be rerun only for transient failures and must leave quarantine
within 30 days with an assigned owner and issue.
Notification policies must route critical quality failures and rollback starts
to an owned escalation path with acknowledgement retries.
Performance budgets must keep page-load and interaction metrics within release
targets and compare regressions against the previous release.
Pipeline stage examples must include quality, smoke, regression and report
stages so the lab keeps a complete QA release flow.
The release quality gate requires at least a 95 percent pass rate, smoke and
regression suites, and critical-severity blocking.
Security scan policies must require static analysis, dependency auditing and
secret scanning before release artifacts are accepted.
Service level objective policies must keep availability, latency and error-rate
targets inside the release readiness gate.
Test data retention policies must keep masked production samples short-lived
and require encrypted artifact storage.
The test report policy requires JUnit and HTML artifacts, repository-relative
paths and retention between 1 and 30 days.
The regression CronJob uses `concurrencyPolicy: Forbid` so a delayed nightly
run cannot overlap with the next schedule.

GitHub Actions and GitLab CI retain `reports/yaml-quality.json` for 14 days.
The report includes the result status, checked repository paths and validation
errors without machine-specific absolute paths.

The GitHub workflow runs the Docker quality image automatically. The GitLab
pipeline includes the same Docker check as a manual job for runners configured
with Docker-in-Docker.

Add new general YAML files anywhere outside ignored directories. Files matching
`examples/*-test-plan.yaml` automatically use the QA test plan contract. To
apply a different schema contract, register its path matcher in
`scripts/lib/yaml-quality.mjs`.
