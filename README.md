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
- QA test plan structure and required fields
- a compact Kubernetes smoke-test Job contract
- the same quality gate in GitHub Actions and GitLab CI

The Kubernetes contract is intentionally focused on this lab. It complements,
but does not replace, validation against a real Kubernetes API server.

## Requirements

- Node.js 24 LTS
- npm

## Run Locally

Install the locked dependencies:

```bash
npm ci
```

Run the complete quality gate:

```bash
npm run check
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
|-- .github/workflows/quality-gate.yml
|-- examples/qa-test-plan.yaml
|-- k8s/smoke-test-job.yaml
|-- schemas/
|   |-- kubernetes-smoke-job.schema.json
|   `-- qa-test-plan.schema.json
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

Add new general YAML files anywhere outside ignored directories. To apply a
schema contract to another example type, register its repository-relative path
in `scripts/lib/yaml-quality.mjs`.
