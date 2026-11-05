import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { devNull, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { readPolicy } from "../src/git.ts";
import { readTrackedCodexPosture } from "../src/codex-git.ts";
import { readTrackedProviderSnapshot } from "../src/provider-snapshot.ts";

const cli = resolve("src/cli.ts");
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !/^GIT_/i.test(name)),
);
const env = {
  ...cleanEnv,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: devNull,
  GIT_TERMINAL_PROMPT: "0",
  GIT_ALLOW_PROTOCOL: "",
};

type Fixture = {
  root: string;
  git: (...args: string[]) => string;
  commit: (path: string, text: string) => string;
  removeBlob: (revision: string, path: string) => string;
  close: () => void;
};

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rulewitness-missing-object-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    }).trim();
  git("init", "-q", "--initial-branch=main", "--object-format=sha1");
  git("config", "core.autocrlf", "false");
  const commit = (path: string, content: string) => {
    const destination = join(root, path);
    mkdirSync(join(root, path.split("/").slice(0, -1).join("/")), {
      recursive: true,
    });
    writeFileSync(destination, content);
    git("add", "--", path);
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      `core.hooksPath=${devNull}`,
      "commit",
      "-q",
      "-m",
      "Security fixture",
    );
    return git("rev-parse", "HEAD");
  };
  const removeBlob = (revision: string, path: string) => {
    const object = git("rev-parse", `${revision}:${path}`);
    assert.match(object, /^[0-9a-f]{40}$/);
    assert.equal(git("cat-file", "-t", object), "blob");
    const objectPath = join(
      root,
      ".git",
      "objects",
      object.slice(0, 2),
      object.slice(2),
    );
    assert.ok(existsSync(objectPath), "Fixture requires a loose blob");
    rmSync(objectPath);
    assert.equal(existsSync(objectPath), false);
    // This creates an actual commit/tree that references a missing blob.
    // No remote, network, promisor object, mock command or fake SHA is involved.
    return object;
  };
  return {
    root,
    git,
    commit,
    removeBlob,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}

function cliResult(root: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", cli, ...args],
    { cwd: root, env, encoding: "utf8", timeout: 20_000 },
  );
}

for (const provider of ["claude-code", "codex"] as const) {
  test(`missing real tracked ${provider} Git blob fails closed instead of becoming an absent file`, () => {
    const f = fixture();
    try {
      const path =
        provider === "claude-code"
          ? ".claude/settings.json"
          : ".codex/config.toml";
      const base = f.commit("README.md", "Security fixture");
      const head = f.commit(
        path,
        provider === "claude-code"
          ? JSON.stringify({ permissions: { allow: ["Bash(npm test)"] } })
          : 'sandbox_mode = "read-only"\napproval_policy = "on-request"\n',
      );
      const status = f.git("status", "--porcelain=v1");
      const index = readFileSync(join(f.root, ".git/index"));
      const currentHead = f.git("rev-parse", "HEAD");
      f.removeBlob(head, path);

      assert.throws(
        () =>
          provider === "claude-code"
            ? readPolicy(f.root, head)
            : readTrackedCodexPosture(f.root, head),
        /Read-only Git operation failed/,
      );
      if (provider === "claude-code") {
        // Claude snapshot loads its tracked policy and therefore must fail.
        assert.throws(
          () => readTrackedProviderSnapshot(f.root, head),
          /Read-only Git operation failed/,
        );
      } else {
        // Provider discovery intentionally inspects tree entries only. It
        // can detect the Codex marker but does not claim its blob is readable.
        const inventory = readTrackedProviderSnapshot(f.root, head);
        assert.equal(inventory.revision, head);
        assert.equal(inventory.selection.kind, "unsupported");
        assert.equal(inventory.claudePolicy, null);
        // The actual Codex reader must fail rather than interpret it as absent.
        assert.throws(
          () => readTrackedCodexPosture(f.root, head),
          /Read-only Git operation failed/,
        );
      }
      const result =
        provider === "claude-code"
          ? cliResult(f.root, "compare", base, head, "--json")
          : cliResult(f.root, "codex-posture", base, head, "--json");
      assert.equal(result.status, 2, result.stderr);
      assert.equal(
        result.stdout,
        "",
        "No incomplete or false pass JSON report",
      );
      assert.ok(!result.stderr.includes("Security fixture"));
      assert.ok(!result.stderr.includes("on-request"));
      assert.equal(f.git("rev-parse", "HEAD"), currentHead);
      assert.equal(f.git("status", "--porcelain=v1"), status);
      assert.deepEqual(readFileSync(join(f.root, ".git/index")), index);
    } finally {
      f.close();
    }
  });
}

test("a missing historical Claude blob cannot silently reuse the present HEAD policy", () => {
  const f = fixture();
  try {
    const old = f.commit(
      ".claude/settings.json",
      '{"permissions":{"ask":["Bash(npm test)"]}}',
    );
    const next = f.commit(
      ".claude/settings.json",
      '{"permissions":{"allow":["Bash(npm test)"]}}',
    );
    assert.notEqual(old, next);
    const expectedHead = f.git("rev-parse", "HEAD");
    const currentPolicy = readPolicy(f.root, next);
    assert.equal(currentPolicy.revision, next);
    f.removeBlob(old, ".claude/settings.json");
    assert.equal(readPolicy(f.root, next).revision, next);
    assert.throws(
      () => readPolicy(f.root, old),
      /Read-only Git operation failed/,
    );
    const result = cliResult(
      f.root,
      "compare",
      old,
      next,
      "--json",
      "--fail-on",
      "high",
    );
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(f.git("rev-parse", "HEAD"), expectedHead);
  } finally {
    f.close();
  }
});

test("a truly absent tracked policy is distinct from a missing referenced Git object", () => {
  const f = fixture();
  try {
    const withoutPolicy = f.commit("README.md", "No agent config here");
    const policy = readPolicy(f.root, withoutPolicy);
    assert.deepEqual(policy.files, []);
    assert.deepEqual(policy.issues, []);
    const codex = readTrackedCodexPosture(f.root, withoutPolicy);
    assert.equal(codex.present, false);
    assert.ok(codex.posture.issues.length > 0);

    const withPolicy = f.commit(
      ".claude/settings.json",
      '{"permissions":{"deny":["Bash(git push *)"]}}',
    );
    f.removeBlob(withPolicy, ".claude/settings.json");
    assert.throws(
      () => readPolicy(f.root, withPolicy),
      /Read-only Git operation failed/,
    );
    assert.deepEqual(readPolicy(f.root, withoutPolicy).files, []);
  } finally {
    f.close();
  }
});

test("a missing real Git tree fails closed before provider discovery", () => {
  const f = fixture();
  try {
    const head = f.commit(
      ".claude/settings.json",
      '{"permissions":{"allow":["Bash(npm test)"]}}',
    );
    const tree = f.git("rev-parse", `${head}^{tree}`);
    assert.match(tree, /^[0-9a-f]{40}$/);
    const treePath = join(
      f.root,
      ".git",
      "objects",
      tree.slice(0, 2),
      tree.slice(2),
    );
    assert.ok(existsSync(treePath));
    rmSync(treePath);
    assert.throws(
      () => readPolicy(f.root, head),
      /Read-only Git operation failed/,
    );
    assert.throws(
      () => readTrackedProviderSnapshot(f.root, head),
      /Read-only Git operation failed/,
    );
    const result = cliResult(f.root, "compare", head, head, "--json");
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(f.git("rev-parse", "HEAD"), head);
  } finally {
    f.close();
  }
});

test("a corrupt tracked Git blob fails closed without leaking its contents", () => {
  const f = fixture();
  try {
    const base = f.commit("README.md", "Security fixture");
    const head = f.commit(
      ".claude/settings.json",
      '{"permissions":{"allow":["Bash(secret-fixture-command)"]}}',
    );
    const blob = f.git("rev-parse", `${head}:.claude/settings.json`);
    const blobPath = join(
      f.root,
      ".git",
      "objects",
      blob.slice(0, 2),
      blob.slice(2),
    );
    assert.ok(existsSync(blobPath));
    // Git writes loose objects read-only; allow deliberate corruption in this fixture.
    chmodSync(blobPath, 0o600);
    writeFileSync(blobPath, "corrupt-object-bytes");
    assert.throws(
      () => readPolicy(f.root, head),
      /Read-only Git operation failed/,
    );
    const result = cliResult(f.root, "compare", base, head, "--json");
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, "");
    assert.ok(!result.stderr.includes("secret-fixture-command"));
    assert.equal(f.git("rev-parse", "HEAD"), head);
  } finally {
    f.close();
  }
});
