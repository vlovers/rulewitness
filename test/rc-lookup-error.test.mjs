import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const missing = "npm error code E404\nnpm error 404 rulewitness@0.4.0-rc.3 is not in this registry.\n";
const cases = [
  {
    name: "confirmed E404 permits an absent candidate",
    error: missing,
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: true,
  },
  {
    name: "legacy npm ERR! E404 format is accepted",
    error: "npm ERR! code E404\nnpm ERR! 404 rulewitness@0.4.0-rc.3 not found\n",
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: true,
  },
  {
    name: "transient registry errors are rejected",
    error: "npm error code E503\nnpm error rulewitness@0.4.0-rc.3\n",
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: false,
  },
  {
    name: "unrelated E404 is rejected",
    error: "npm error code E404\nnpm error unrelated-package@1.0.0 not found\n",
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: false,
  },
  {
    name: "mixed E404 and transient error is rejected",
    error: missing + "npm error code E503\n",
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: false,
  },
  {
    name: "candidate already in versions cannot be treated as absent",
    error: missing,
    versions: ["0.3.0", "0.4.0-rc.2", "0.4.0-rc.3"],
    accepted: false,
  },
  {
    name: "malformed versions metadata is rejected",
    error: missing,
    versions: { versions: ["0.3.0"] },
    accepted: false,
  },
  {
    name: "missing npm error code is rejected",
    error: "npm error 404 rulewitness@0.4.0-rc.3 not found\n",
    versions: ["0.3.0", "0.4.0-rc.2"],
    accepted: false,
  },
];

for (const scenario of cases) {
  test("rc lookup: " + scenario.name, () => {
    const dir = mkdtempSync(join(tmpdir(), "rulewitness-rc-lookup-"));
    try {
      const errorPath = join(dir, "npm-error.txt");
      const versionsPath = join(dir, "versions.json");
      writeFileSync(errorPath, scenario.error);
      writeFileSync(versionsPath, JSON.stringify(scenario.versions));
      const result = spawnSync(
        process.execPath,
        ["scripts/verify-rc-lookup-error.mjs", errorPath, versionsPath],
        { encoding: "utf8", timeout: 10_000 },
      );
      assert.equal(
        result.status === 0,
        scenario.accepted,
        scenario.name + ": " + result.stderr,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
