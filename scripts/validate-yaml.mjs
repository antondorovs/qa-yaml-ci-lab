#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createValidationReport,
  validateRepository,
} from "./lib/yaml-quality.mjs";

const usage = [
  "Usage: npm run validate -- [--report <path>] [--help]",
  "",
  "Options:",
  "  --report <path>  Write a JSON validation report.",
  "  --help           Show this help message.",
].join("\n");

function readCliOptions(arguments_) {
  if (arguments_.length === 0) {
    return { reportPath: null, showHelp: false };
  }

  if (arguments_[0] === "--help") {
    const extraArgument = arguments_[1];

    if (extraArgument) {
      throw new Error(`Unexpected argument: ${extraArgument}`);
    }

    return { reportPath: null, showHelp: true };
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

  return { reportPath: path.resolve(reportPath), showHelp: false };
}

let options;

try {
  options = readCliOptions(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage);
  process.exit(1);
}

if (options.showHelp) {
  console.log(usage);
} else {
  const result = await validateRepository();

  if (options.reportPath) {
    await mkdir(path.dirname(options.reportPath), { recursive: true });
    await writeFile(
      options.reportPath,
      `${JSON.stringify(createValidationReport(result), null, 2)}\n`,
    );
    console.log(`Validation report written to ${options.reportPath}.`);
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
}
