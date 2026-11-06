#!/usr/bin/env node
// Only a confirmed missing candidate may become JSON null. All other npm failures fail closed.
import { readFileSync } from "node:fs";

const [errorPath, versionsPath] = process.argv.slice(2);
if (!errorPath || !versionsPath)
  throw new Error("Expected npm error output and registry versions JSON paths");

const stderr = readFileSync(errorPath, "utf8");
const candidate = JSON.parse(readFileSync("package.json", "utf8")).version;
const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
const codePattern = /^npm (?:error|ERR!) code (E[A-Z0-9]+)\s*$/gm;
const errorCodes = [...stderr.matchAll(codePattern)].map((match) => match[1]);
if (
  errorCodes.length !== 1 ||
  errorCodes[0] !== "E404" ||
  !stderr.includes(`rulewitness@${candidate}`) ||
  !Array.isArray(versions) ||
  !versions.every((version) => typeof version === "string") ||
  versions.includes(candidate)
) {
  throw new Error("npm lookup failure is not a verified absent release candidate");
}
console.log(
  "Confirmed absent release candidate; fallback to JSON null is permitted",
);
