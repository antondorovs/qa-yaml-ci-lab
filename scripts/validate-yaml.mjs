#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createValidationReport,
  validateRepository,
} from "./lib/yaml-quality.mjs";

function readReportPath(arguments_) {
  const reportOption = arguments_.indexOf("--report");

  if (reportOption === -1) {
    return null;
  }

  const reportPath = arguments_[reportOption + 1];

  if (!reportPath || reportPath.startsWith("--")) {
    throw new Error("--report requires a file path");
  }

  return path.resolve(reportPath);
}

const result = await validateRepository();
const reportPath = readReportPath(process.argv.slice(2));

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
  console.log(`YAML quality gate passed for ${result.files.length} files.`);
}
