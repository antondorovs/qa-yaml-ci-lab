import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createValidationReport,
  validateRepository,
} from "../scripts/lib/yaml-quality.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, "..");

async function createFixtureRepository() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "qa-yaml-ci-lab-"));

  await cp(
    path.join(projectRoot, "examples"),
    path.join(fixtureRoot, "examples"),
    {
      recursive: true,
    },
  );
  await cp(path.join(projectRoot, "k8s"), path.join(fixtureRoot, "k8s"), {
    recursive: true,
  });
  await cp(
    path.join(projectRoot, "schemas"),
    path.join(fixtureRoot, "schemas"),
    {
      recursive: true,
    },
  );

  return fixtureRoot;
}

async function withFixture(run) {
  const fixtureRoot = await createFixtureRepository();

  try {
    await run(fixtureRoot);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

test("validates every repository YAML file and registered contracts", async () => {
  const result = await validateRepository(projectRoot);

  assert.equal(result.errors.length, 0);
  assert(
    result.files.some((file) =>
      file.endsWith("accessibility-audit-policy.yaml"),
    ),
  );
  assert(result.files.some((file) => file.endsWith("qa-test-plan.yaml")));
  assert(
    result.files.some((file) => file.endsWith("api-regression-test-plan.yaml")),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("deployment-approval-policy.yaml"),
    ),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("deployment-rollback-policy.yaml"),
    ),
  );
  assert(
    result.files.some((file) => file.endsWith("browser-coverage-matrix.yaml")),
  );
  assert(
    result.files.some((file) => file.endsWith("defect-triage-policy.yaml")),
  );
  assert(result.files.some((file) => file.endsWith("environment-matrix.yaml")));
  assert(result.files.some((file) => file.endsWith("flaky-test-policy.yaml")));
  assert(
    result.files.some((file) => file.endsWith("notification-policy.yaml")),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("observability-alert-policy.yaml"),
    ),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("performance-budget-policy.yaml"),
    ),
  );
  assert(result.files.some((file) => file.endsWith("pipeline-stages.yaml")));
  assert(result.files.some((file) => file.endsWith("quality-gate.yaml")));
  assert(
    result.files.some((file) => file.endsWith("security-scan-policy.yaml")),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("service-level-objective-policy.yaml"),
    ),
  );
  assert(
    result.files.some((file) =>
      file.endsWith("test-data-retention-policy.yaml"),
    ),
  );
  assert(result.files.some((file) => file.endsWith("test-report-policy.yaml")));
  assert(result.files.some((file) => file.endsWith("smoke-test-job.yaml")));
  assert(result.files.some((file) => file.endsWith("regression-cronjob.yaml")));
});

test("creates a portable validation report", async () => {
  const result = await validateRepository(projectRoot);
  const report = createValidationReport(result, projectRoot);

  assert.equal(report.version, 1);
  assert.equal(report.status, "passed");
  assert.deepEqual(report.summary, {
    filesChecked: result.files.length,
    errors: 0,
  });
  assert(report.files.includes("examples/api-regression-test-plan.yaml"));
  assert(report.files.every((file) => !path.isAbsolute(file)));
  assert.deepEqual(report.errors, []);
});

test("reports YAML syntax errors with the repository path", async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      path.join(fixtureRoot, "broken.yaml"),
      "suite: smoke\n  invalid: indentation\n",
    );

    const result = await validateRepository(fixtureRoot);

    assert(result.errors.some((error) => error.startsWith("broken.yaml:")));
  });
});

test("rejects duplicate mapping keys", async () => {
  await withFixture(async (fixtureRoot) => {
    await writeFile(
      path.join(fixtureRoot, "duplicate.yaml"),
      "suite: smoke\nsuite: regression\n",
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("duplicate.yaml") &&
          error.includes("Map keys must be unique"),
      ),
    );
  });
});

test("rejects a QA test plan that violates its contract", async () => {
  await withFixture(async (fixtureRoot) => {
    const testPlanPath = path.join(
      fixtureRoot,
      "examples",
      "qa-test-plan.yaml",
    );
    const source = await readFile(testPlanPath, "utf8");
    await writeFile(testPlanPath, source.replace(/^    expected:.*$/m, ""));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("qa-test-plan contract") &&
          error.includes("required property 'expected'"),
      ),
    );
  });
});

test("applies the QA contract to every named test plan", async () => {
  await withFixture(async (fixtureRoot) => {
    const testPlanPath = path.join(
      fixtureRoot,
      "examples",
      "api-regression-test-plan.yaml",
    );
    const source = await readFile(testPlanPath, "utf8");
    await writeFile(testPlanPath, source.replace("priority: critical", ""));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("api-regression-test-plan.yaml") &&
          error.includes("required property 'priority'"),
      ),
    );
  });
});

test("rejects accessibility audits without keyboard coverage", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "accessibility-audit-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("name: keyboard-navigation", "name: color-contrast"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("accessibility-audit-policy contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects an environment matrix without a base URL", async () => {
  await withFixture(async (fixtureRoot) => {
    const matrixPath = path.join(
      fixtureRoot,
      "examples",
      "environment-matrix.yaml",
    );
    const source = await readFile(matrixPath, "utf8");
    await writeFile(matrixPath, source.replace("name: BASE_URL", "name: URL"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("environment-matrix contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects browser coverage without WebKit", async () => {
  await withFixture(async (fixtureRoot) => {
    const matrixPath = path.join(
      fixtureRoot,
      "examples",
      "browser-coverage-matrix.yaml",
    );
    const source = await readFile(matrixPath, "utf8");
    await writeFile(
      matrixPath,
      source.replace("name: webkit", "name: firefox"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("browser-coverage-matrix contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects critical defect triage with slow response", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "defect-triage-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("responseHours: 2", "responseHours: 8"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("defect-triage-policy contract") &&
          error.includes("must be <= 4"),
      ),
    );
  });
});

test("rejects production deployment without enough approvals", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "deployment-approval-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("minimumApprovals: 2", "minimumApprovals: 1"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("deployment-approval-policy contract") &&
          error.includes("must be >= 2"),
      ),
    );
  });
});

test("rejects deployment rollback without automatic recovery", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "deployment-rollback-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("automatic: true", "automatic: false"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("deployment-rollback-policy contract") &&
          error.includes("must be equal to constant"),
      ),
    );
  });
});

test("rejects expired flaky-test quarantine windows", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "flaky-test-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(policyPath, source.replace("maxDays: 14", "maxDays: 45"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("flaky-test-policy contract") &&
          error.includes("must be <= 30"),
      ),
    );
  });
});

test("rejects notification policies without rollback alerts", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "notification-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replaceAll("rollback-started", "deployment-blocked"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("notification-policy contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects observability policies without traces", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "observability-alert-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(policyPath, source.replace("type: traces", "type: logs"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("observability-alert-policy contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects performance budgets above release targets", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "performance-budget-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(policyPath, source.replace("target: 2500", "target: 3000"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("performance-budget-policy contract") &&
          error.includes("must be <= 2500"),
      ),
    );
  });
});

test("rejects pipeline stages without a report stage", async () => {
  await withFixture(async (fixtureRoot) => {
    const stagesPath = path.join(
      fixtureRoot,
      "examples",
      "pipeline-stages.yaml",
    );
    const source = await readFile(stagesPath, "utf8");
    await writeFile(stagesPath, source.replace("name: report", "name: smoke"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("pipeline-stages contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects a release gate with a low pass rate", async () => {
  await withFixture(async (fixtureRoot) => {
    const gatePath = path.join(fixtureRoot, "examples", "quality-gate.yaml");
    const source = await readFile(gatePath, "utf8");
    await writeFile(
      gatePath,
      source.replace("minimumPassRate: 98", "minimumPassRate: 90"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("quality-gate contract") &&
          error.includes("must be >= 95"),
      ),
    );
  });
});

test("rejects security scans without secret scanning", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "security-scan-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(policyPath, source.replace("type: secret", "type: sast"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("security-scan-policy contract") &&
          error.includes("must contain at least 1 valid item"),
      ),
    );
  });
});

test("rejects service levels with slow p95 latency", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "service-level-objective-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(policyPath, source.replace("target: 500", "target: 750"));

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("service-level-objective-policy contract") &&
          error.includes("must be <= 500"),
      ),
    );
  });
});

test("rejects test data retention without masking", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "test-data-retention-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("maskingRequired: true", "maskingRequired: false"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("test-data-retention-policy contract") &&
          error.includes("must be equal to constant"),
      ),
    );
  });
});

test("rejects test reports retained for too long", async () => {
  await withFixture(async (fixtureRoot) => {
    const policyPath = path.join(
      fixtureRoot,
      "examples",
      "test-report-policy.yaml",
    );
    const source = await readFile(policyPath, "utf8");
    await writeFile(
      policyPath,
      source.replace("retentionDays: 14", "retentionDays: 45"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("test-report-policy contract") &&
          error.includes("must be <= 30"),
      ),
    );
  });
});

test("rejects a Kubernetes Job that violates its contract", async () => {
  await withFixture(async (fixtureRoot) => {
    const jobPath = path.join(fixtureRoot, "k8s", "smoke-test-job.yaml");
    const source = await readFile(jobPath, "utf8");
    await writeFile(
      jobPath,
      source.replace("restartPolicy: Never", "restartPolicy: Always"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("kubernetes-smoke-job contract") &&
          error.includes("must be equal to constant"),
      ),
    );
  });
});

test("rejects overlapping Kubernetes regression schedules", async () => {
  await withFixture(async (fixtureRoot) => {
    const cronJobPath = path.join(
      fixtureRoot,
      "k8s",
      "regression-cronjob.yaml",
    );
    const source = await readFile(cronJobPath, "utf8");
    await writeFile(
      cronJobPath,
      source.replace("concurrencyPolicy: Forbid", "concurrencyPolicy: Allow"),
    );

    const result = await validateRepository(fixtureRoot);

    assert(
      result.errors.some(
        (error) =>
          error.includes("kubernetes-regression-cronjob contract") &&
          error.includes("must be equal to constant"),
      ),
    );
  });
});
