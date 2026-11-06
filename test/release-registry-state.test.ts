import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

type RegistryCase = {
  name: string;
  versions: string[];
  tags: Record<string, string>;
  integrity: string | null;
  accepted: boolean;
};
const baseline = ["0.3.0", "0.4.0-rc.1", "0.4.0-rc.2", "0.4.0-rc.3"];
const sha512 = "sha512-" + Buffer.alloc(64, 0).toString("base64");

const cases: RegistryCase[] = [
  {
    name: "unpublished candidate preserves previous next and stable latest",
    versions: baseline,
    tags: { latest: "0.3.0", next: "0.4.0-rc.3" },
    integrity: null,
    accepted: true,
  },
  {
    name: "published candidate requires matching next and integrity",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: sha512,
    accepted: true,
  },
  {
    name: "published without moving next is unsafe",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.3" },
    integrity: sha512,
    accepted: false,
  },
  {
    name: "published with missing integrity is unsafe",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: null,
    accepted: false,
  },
  {
    name: "published with malformed integrity is unsafe",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: "sha1-unsafe",
    accepted: false,
  },
  {
    name: "published with truncated sha512 digest is unsafe",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: "sha512-" + Buffer.alloc(32, 0).toString("base64"),
    accepted: false,
  },
  {
    name: "published with noncanonical sha512 encoding is unsafe",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: sha512 + "=",
    accepted: false,
  },
  {
    name: "unpublished candidate with an integrity digest is inconsistent",
    versions: baseline,
    tags: { latest: "0.3.0", next: "0.4.0-rc.3" },
    integrity: sha512,
    accepted: false,
  },
  {
    name: "unpublished candidate with unrecognized next is unsafe",
    versions: baseline,
    tags: { latest: "0.3.0", next: "0.4.0-rc.1" },
    integrity: null,
    accepted: false,
  },
  {
    name: "stable latest must never move during rc publish",
    versions: [...baseline, "0.4.0-rc.4"],
    tags: { latest: "0.4.0-rc.4", next: "0.4.0-rc.4" },
    integrity: sha512,
    accepted: false,
  },
  {
    name: "registry list must contain previously published stable",
    versions: ["0.4.0-rc.3", "0.4.0-rc.4"],
    tags: { latest: "0.3.0", next: "0.4.0-rc.4" },
    integrity: sha512,
    accepted: false,
  },
];

for (const scenario of cases) {
  test("release registry state: " + scenario.name, () => {
    const dir = mkdtempSync(join(tmpdir(), "rulewitness-release-registry-"));
    try {
      const files = [
        join(dir, "versions.json"),
        join(dir, "tags.json"),
        join(dir, "integrity.json"),
      ];
      for (const [path, data] of [
        [files[0], scenario.versions],
        [files[1], scenario.tags],
        [files[2], scenario.integrity],
      ] as const) {
        writeFileSync(path!, JSON.stringify(data));
      }
      const result = spawnSync(
        process.execPath,
        ["scripts/verify-rc-registry.mjs", ...files],
        { encoding: "utf8", timeout: 10_000 },
      );
      assert.equal(
        result.status === 0,
        scenario.accepted,
        scenario.name + ": " + result.stderr,
      );
      if (scenario.accepted)
        assert.match(result.stdout, /stable latest preserved/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
