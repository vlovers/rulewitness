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
const previousNext = "0.4.0-rc.3";
const stable = "0.3.0";

if (
  pkg.name !== "rulewitness" ||
  !/^0\.4\.0-rc\.[1-9]\d*$/.test(pkg.version) ||
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
const validSha512 = (value) => {
  const encoded = typeof value === "string" ? value.slice(7) : "";
  const digest = Buffer.from(encoded, "base64");
  return (
    typeof value === "string" &&
    /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(value) &&
    digest.length === 64 &&
    digest.toString("base64") === encoded
  );
};

if (published) {
  if (tags.next !== pkg.version || !validSha512(integrity)) {
    throw new Error(
      "Published candidate requires matching next tag and sha512 integrity",
    );
  }
  console.log(
    "Registry state: published candidate verified, stable latest preserved",
  );
} else {
  if (tags.next !== previousNext || integrity !== null)
    throw new Error(
      "Unpublished candidate must preserve previous next and have no integrity",
    );
  console.log("Registry state: unpublished candidate, stable latest preserved");
}
