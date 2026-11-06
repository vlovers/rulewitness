#!/usr/bin/env node
// Only a confirmed missing candidate may become JSON null. All other npm failures fail closed.
import { readFileSync } from "node:fs";

const [errorPath, versionsPath] = process.argv.slice(2);
if (!errorPath || !versionsPath)
  throw new Error("Expected npm error output and registry versions JSON paths");

const stderr = readFileSync(errorPath, "utf8");
const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
const errorCodes = [...stderr.matchAll(/^npm (?:error|ERR!) code (E[A-Z0-9]+)\\s*$/gm)].map(
  (match) => match[1],
);
if (
  errorCodes.length !== 1 ||
  errorCodes[0] !== "E404" ||
  !stderr.includes("rulewitness@0.4.0-rc.3") ||
  !Array.isArray(versions) ||
  !versions.every((version) => typeof version === "string") ||
  versions.includes("0.4.0-rc.3")
) {
  throw new Error("npm lookup failure is not a verified absent rc.3 candidate");
}
console.log("Confirmed absent rc.3 candidate; fallback to JSON null is permitted");
