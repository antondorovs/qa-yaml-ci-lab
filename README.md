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
- QA test plan structure and required fields for every named test plan
- deployment approval rules for staging and production
- environment variable matrix structure and required runtime URLs
- flaky-test rerun and quarantine rules
- pipeline stage structure for quality, smoke, regression and reporting
- release quality thresholds for pass rate, failures and flaky tests
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
|-- examples/api-regression-test-plan.yaml
|-- examples/deployment-approval-policy.yaml
|-- examples/environment-matrix.yaml
|-- examples/flaky-test-policy.yaml
|-- examples/pipeline-stages.yaml
|-- examples/quality-gate.yaml
|-- examples/qa-test-plan.yaml
|-- examples/test-report-policy.yaml
|-- k8s/regression-cronjob.yaml
|-- k8s/smoke-test-job.yaml
|-- schemas/
|   |-- deployment-approval-policy.schema.json
|   |-- environment-matrix.schema.json
|   |-- flaky-test-policy.schema.json
|   |-- kubernetes-regression-cronjob.schema.json
|   |-- kubernetes-smoke-job.schema.json
|   |-- pipeline-stages.schema.json
|   |-- quality-gate.schema.json
|   |-- qa-test-plan.schema.json
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

Environment matrices must define a `BASE_URL` variable for each supported
environment so CI jobs and Kubernetes examples can share the same target names.
Production deployments require regression checks, two approvals and automatic
freezing when a required check fails.
Flaky tests can be rerun only for transient failures and must leave quarantine
within 30 days with an assigned owner and issue.
Pipeline stage examples must include quality, smoke, regression and report
stages so the lab keeps a complete QA release flow.
The release quality gate requires at least a 95 percent pass rate, smoke and
regression suites, and critical-severity blocking.
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
