import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string): string => readFileSync(resolve(path), "utf8");
const packageJson = JSON.parse(read("package.json")) as {
  version: string;
  dependencies: Record<string, string>;
};
const sources = [
  ["README.md", read("README.md")],
  ["docs/roadmap-v0.4.md", read("docs/roadmap-v0.4.md")],
  ["docs/release-readiness-v0.4.md", read("docs/release-readiness-v0.4.md")],
  ["CHANGELOG.md", read("CHANGELOG.md")],
] as const;

test("release docs reflect exact source candidate without inventing npm publication", () => {
  assert.equal(packageJson.version, "0.4.0-rc.3");
  for (const [path, content] of sources) {
    assert.ok(
      content.includes(packageJson.version),
      `${path} must name the current source candidate`,
    );
  }
  const readme = read("README.md");
  const roadmap = read("docs/roadmap-v0.4.md");
  const readiness = read("docs/release-readiness-v0.4.md");
  const changelog = read("CHANGELOG.md");
  for (const [path, content] of [
    ["README.md", readme],
    ["docs/roadmap-v0.4.md", roadmap],
    ["docs/release-readiness-v0.4.md", readiness],
    ["CHANGELOG.md", changelog],
  ] as const) {
    assert.match(content, /GitHub prerelease/i, `${path}: GitHub release`);
    assert.match(content, /npm.{0,100}(unverified|not been independently verified|has not been independently verified|availability unverified)/i, `${path}: npm claim must remain evidence-scoped`);
  }
  assert.doesNotMatch(
    readiness,
    /rc\.3.{0,40}\(not published; no tag\)/i,
    "A known GitHub tag must not be described as absent",
  );
});

test("readme does not claim zero runtime dependencies while package has them", () => {
  const dependencies = Object.keys(packageJson.dependencies);
  assert.ok(dependencies.includes("smol-toml"));
  assert.ok(read("README.md").includes("smol-toml@1.9.1"));
  assert.doesNotMatch(read("README.md"), /no runtime npm dependencies/i);
});

test("documented stable install remains pinned, not accidentally switched to unverified rc", () => {
  const readme = read("README.md");
  assert.match(readme, /npm install --save-dev rulewitness@0\.3\.0/);
  assert.match(readme, /npm install --global rulewitness@0\.3\.0/);
  assert.doesNotMatch(readme, /npm install (?:--global|--save-dev) rulewitness@0\.4\.0-rc\.3/);
});
