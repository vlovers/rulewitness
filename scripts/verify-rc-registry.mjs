#!/usr/bin/env node
// Read-only registry state validation. Never publishes or changes npm tags.
import { readFileSync } from "node:fs";

const [versionsPath, tagsPath, integrityPath] = process.argv.slice(2);
if (!versionsPath || !tagsPath || !integrityPath)
  throw new Error("Expected versions, tags and candidate integrity JSON paths");

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const pkg = read("package.json");
const lock = read("package-lock.json");
const versions = read(versionsPath);
const tags = read(tagsPath);
const integrity = read(integrityPath);
const previousNext = "0.4.0-rc.2";
const stable = "0.3.0";

if (
  pkg.name !== "rulewitness" ||
  pkg.version !== "0.4.0-rc.3" ||
  lock.name !== pkg.name ||
  lock.version !== pkg.version ||
  lock.packages?.[""]?.name !== pkg.name ||
  lock.packages?.[""]?.version !== pkg.version
) {
  throw new Error("Package name/version and lockfile metadata disagree");
}
if (
  !Array.isArray(versions) ||
  !versions.every((version) => typeof version === "string") ||
  !versions.includes(previousNext) ||
  !versions.includes(stable) ||
  !tags ||
  typeof tags !== "object" ||
  Array.isArray(tags) ||
  tags.latest !== stable
) {
  throw new Error("Unexpected npm registry metadata or stable latest changed");
}

const published = versions.includes(pkg.version);
if (published) {
  if (
    tags.next !== pkg.version ||
    typeof integrity !== "string" ||
    !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(integrity)
  ) {
    throw new Error(
      "Published rc.3 requires matching next tag and sha512 integrity",
    );
  }
  console.log(
    "Registry state: published rc.3 verified, stable latest preserved",
  );
} else {
  if (tags.next !== previousNext || integrity !== null)
    throw new Error(
      "Unpublished rc.3 must preserve previous next and have no integrity",
    );
  console.log("Registry state: unpublished rc.3, stable latest preserved");
}
