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
  assert(result.files.some((file) => file.endsWith("qa-test-plan.yaml")));
  assert(
    result.files.some((file) => file.endsWith("api-regression-test-plan.yaml")),
  );
  assert(result.files.some((file) => file.endsWith("smoke-test-job.yaml")));
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
