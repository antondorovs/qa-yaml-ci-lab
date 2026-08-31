import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDirectory, "../..");

const ignoredDirectories = new Set([
  ".git",
  "coverage",
  "node_modules",
  "test-results",
]);

const contractDefinitions = [
  {
    matches: (repositoryPath) =>
      repositoryPath.startsWith("examples/") &&
      repositoryPath.endsWith("-test-plan.yaml"),
    name: "qa-test-plan",
    schema: "schemas/qa-test-plan.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/accessibility-audit-policy.yaml",
    name: "accessibility-audit-policy",
    schema: "schemas/accessibility-audit-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/api-deprecation-policy.yaml",
    name: "api-deprecation-policy",
    schema: "schemas/api-deprecation-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/backup-recovery-policy.yaml",
    name: "backup-recovery-policy",
    schema: "schemas/backup-recovery-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/environment-matrix.yaml",
    name: "environment-matrix",
    schema: "schemas/environment-matrix.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/browser-coverage-matrix.yaml",
    name: "browser-coverage-matrix",
    schema: "schemas/browser-coverage-matrix.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/capacity-validation-policy.yaml",
    name: "capacity-validation-policy",
    schema: "schemas/capacity-validation-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/canary-release-policy.yaml",
    name: "canary-release-policy",
    schema: "schemas/canary-release-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/change-failure-rate-policy.yaml",
    name: "change-failure-rate-policy",
    schema: "schemas/change-failure-rate-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/configuration-change-policy.yaml",
    name: "configuration-change-policy",
    schema: "schemas/configuration-change-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/contract-test-policy.yaml",
    name: "contract-test-policy",
    schema: "schemas/contract-test-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/defect-triage-policy.yaml",
    name: "defect-triage-policy",
    schema: "schemas/defect-triage-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/data-migration-policy.yaml",
    name: "data-migration-policy",
    schema: "schemas/data-migration-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/database-failover-policy.yaml",
    name: "database-failover-policy",
    schema: "schemas/database-failover-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/deployment-approval-policy.yaml",
    name: "deployment-approval-policy",
    schema: "schemas/deployment-approval-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/deployment-rollback-policy.yaml",
    name: "deployment-rollback-policy",
    schema: "schemas/deployment-rollback-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/deployment-verification-policy.yaml",
    name: "deployment-verification-policy",
    schema: "schemas/deployment-verification-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/dependency-update-policy.yaml",
    name: "dependency-update-policy",
    schema: "schemas/dependency-update-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/flaky-test-policy.yaml",
    name: "flaky-test-policy",
    schema: "schemas/flaky-test-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/feature-flag-policy.yaml",
    name: "feature-flag-policy",
    schema: "schemas/feature-flag-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/hotfix-validation-policy.yaml",
    name: "hotfix-validation-policy",
    schema: "schemas/hotfix-validation-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/incident-review-policy.yaml",
    name: "incident-review-policy",
    schema: "schemas/incident-review-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/load-shedding-policy.yaml",
    name: "load-shedding-policy",
    schema: "schemas/load-shedding-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/maintenance-window-policy.yaml",
    name: "maintenance-window-policy",
    schema: "schemas/maintenance-window-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/notification-policy.yaml",
    name: "notification-policy",
    schema: "schemas/notification-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/observability-alert-policy.yaml",
    name: "observability-alert-policy",
    schema: "schemas/observability-alert-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/pipeline-stages.yaml",
    name: "pipeline-stages",
    schema: "schemas/pipeline-stages.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/post-release-monitoring-policy.yaml",
    name: "post-release-monitoring-policy",
    schema: "schemas/post-release-monitoring-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/performance-budget-policy.yaml",
    name: "performance-budget-policy",
    schema: "schemas/performance-budget-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/quality-gate.yaml",
    name: "quality-gate",
    schema: "schemas/quality-gate.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/release-freeze-policy.yaml",
    name: "release-freeze-policy",
    schema: "schemas/release-freeze-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/release-communication-policy.yaml",
    name: "release-communication-policy",
    schema: "schemas/release-communication-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/release-risk-assessment-policy.yaml",
    name: "release-risk-assessment-policy",
    schema: "schemas/release-risk-assessment-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/rollback-readiness-policy.yaml",
    name: "rollback-readiness-policy",
    schema: "schemas/rollback-readiness-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/security-scan-policy.yaml",
    name: "security-scan-policy",
    schema: "schemas/security-scan-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/service-level-objective-policy.yaml",
    name: "service-level-objective-policy",
    schema: "schemas/service-level-objective-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/test-data-retention-policy.yaml",
    name: "test-data-retention-policy",
    schema: "schemas/test-data-retention-policy.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "examples/test-report-policy.yaml",
    name: "test-report-policy",
    schema: "schemas/test-report-policy.schema.json",
  },
  {
    matches: (repositoryPath) => repositoryPath === "k8s/smoke-test-job.yaml",
    name: "kubernetes-smoke-job",
    schema: "schemas/kubernetes-smoke-job.schema.json",
  },
  {
    matches: (repositoryPath) =>
      repositoryPath === "k8s/regression-cronjob.yaml",
    name: "kubernetes-regression-cronjob",
    schema: "schemas/kubernetes-regression-cronjob.schema.json",
  },
];

function toRepositoryPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

async function collectYamlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectYamlFiles(entryPath)));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

async function loadContracts(root) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const contracts = new Map();

  for (const definition of contractDefinitions) {
    const schemaPath = path.join(root, definition.schema);
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    contracts.set(definition.matches, {
      name: definition.name,
      validate: ajv.compile(schema),
    });
  }

  return contracts;
}

function formatYamlError(file, error) {
  const location = error.linePos?.[0];
  const suffix = location ? `:${location.line}:${location.col}` : "";
  return `${file}${suffix}: ${error.message}`;
}

function formatSchemaError(file, contractName, error) {
  const instancePath = error.instancePath || "/";
  return `${file}: ${contractName} contract ${instancePath} ${error.message}`;
}

export function createValidationReport(result, root = projectRoot) {
  return {
    version: 1,
    status: result.errors.length === 0 ? "passed" : "failed",
    summary: {
      filesChecked: result.files.length,
      errors: result.errors.length,
    },
    files: result.files.map((file) => toRepositoryPath(root, file)),
    errors: result.errors,
  };
}

export async function validateRepository(root = projectRoot) {
  const files = await collectYamlFiles(root);
  const contracts = await loadContracts(root);
  const errors = [];

  for (const filePath of files) {
    const repositoryPath = toRepositoryPath(root, filePath);
    const source = await readFile(filePath, "utf8");
    const document = parseDocument(source, {
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
    });

    if (document.errors.length > 0) {
      errors.push(
        ...document.errors.map((error) =>
          formatYamlError(repositoryPath, error),
        ),
      );
      continue;
    }

    const contract = [...contracts.entries()].find(([matches]) =>
      matches(repositoryPath),
    )?.[1];

    if (contract && !contract.validate(document.toJS())) {
      errors.push(
        ...contract.validate.errors.map((error) =>
          formatSchemaError(repositoryPath, contract.name, error),
        ),
      );
    }
  }

  return { errors, files };
}
