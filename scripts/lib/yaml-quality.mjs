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
    matches: (repositoryPath) => repositoryPath === "k8s/smoke-test-job.yaml",
    name: "kubernetes-smoke-job",
    schema: "schemas/kubernetes-smoke-job.schema.json",
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
