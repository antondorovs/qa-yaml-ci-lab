#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createValidationReport,
  validateRepository,
} from "./lib/yaml-quality.mjs";

function readReportPath(arguments_) {
  if (arguments_.length === 0) {
    return null;
  }

  if (arguments_[0] !== "--report") {
    throw new Error(`Unknown option: ${arguments_[0]}`);
  }

  const reportPath = arguments_[1];

  if (!reportPath || reportPath.startsWith("--")) {
    throw new Error("--report requires a file path");
  }

  const extraArgument = arguments_[2];

  if (extraArgument) {
    throw new Error(`Unexpected argument: ${extraArgument}`);
  }

  return path.resolve(reportPath);
}

const reportPath = readReportPath(process.argv.slice(2));
const result = await validateRepository();

if (reportPath) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(createValidationReport(result), null, 2)}\n`,
  );
  console.log(`Validation report written to ${reportPath}.`);
}

if (result.errors.length > 0) {
  console.error("YAML quality gate failed:\n");

  for (const error of result.errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `YAML quality gate passed for ${result.files.length} files; ${result.contractFiles.length} contract-covered files checked.`,
  );
}
