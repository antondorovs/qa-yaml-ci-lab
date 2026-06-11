#!/usr/bin/env node

import { validateRepository } from "./lib/yaml-quality.mjs";

const result = await validateRepository();

if (result.errors.length > 0) {
  console.error("YAML quality gate failed:\n");

  for (const error of result.errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log(`YAML quality gate passed for ${result.files.length} files.`);
}
