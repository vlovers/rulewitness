import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkGovernance, required } from "../scripts/check-governance.mjs";

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "agent-policy-"));
  const outside = mkdtempSync(join(tmpdir(), "agent-policy-outside-"));
  try {
    for (const name of required) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(
        join(root, name),
        "# Policy\n\nRelevant checks and reviews are mandatory.\n",
      );
    }
    writeFileSync(
      join(root, "AGENTS.md"),
      "# Agents\n\nUse a worktree and review [workflow](docs/engineering/MULTI_AGENT_WORKFLOW.md)\n",
    );
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\nFollow [AGENTS.md](AGENTS.md) for review.\n",
    );
    writeFileSync(
      join(root, ".github/PULL_REQUEST_TEMPLATE.md"),
      "# PR\n\nRecord head SHA for review [workflow](../docs/engineering/MULTI_AGENT_WORKFLOW.md)\n",
    );
    writeFileSync(
      join(root, "docs/engineering/MULTI_AGENT_WORKFLOW.md"),
      "# Protocol\n\nIssue worktree review and validation.\n",
    );
    mkdirSync(join(root, ".github/ISSUE_TEMPLATE"), { recursive: true });
    writeFileSync(join(root, ".github/ISSUE_TEMPLATE/engineering.yml"), "name: Engineering work package\\n");
    run(root, outside);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
}

test("complete baseline passes", () =>
  fixture((root) => assert.deepEqual(checkGovernance(root), [])));
test("absent review policy blocks", () =>
  fixture((root) => {
    rmSync(join(root, "docs/engineering/REVIEW_POLICY.md"));
    assert.match(checkGovernance(root).join("\n"), /REVIEW_POLICY.md/);
  }));
test("missing reference blocks", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [missing](nowhere.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /nowhere.md/);
  }));
test("deleted required marker blocks", () =>
  fixture((root) => {
    writeFileSync(
      join(root, ".github/PULL_REQUEST_TEMPLATE.md"),
      "# PR\n\nReview [workflow](../docs/engineering/MULTI_AGENT_WORKFLOW.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /head SHA/);
  }));
test("traversal links block", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [unsafe](../../outside.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /escapes repository/);
  }));
test("symlink into outside repository blocks", () =>
  fixture((root, outside) => {
    writeFileSync(join(outside, "outside.md"), "external content");
    symlinkSync(join(outside, "outside.md"), join(root, "external.md"));
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [unsafe](external.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /escapes repository/);
  }));

test("symlinked required contract outside repository blocks", () =>
  fixture((root, outside) => {
    const target = join(root, "docs/engineering/REVIEW_POLICY.md");
    rmSync(target);
    const external = join(outside, "REVIEW_POLICY.md");
    writeFileSync(
      external,
      "# External review policy\n\nThis must not be trusted.\n",
    );
    symlinkSync(external, target);
    assert.match(
      checkGovernance(root).join("\n"),
      /REVIEW_POLICY.md: missing, unreadable or escapes repository/,
    );
  }));

test("encoded traversal in local link blocks", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [unsafe](%2e%2e/%2e%2e/outside.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /escapes repository/);
  }));

test("malformed percent escape in link fails closed", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [invalid](%ZZ.md)\n",
    );
    assert.match(
      checkGovernance(root).join("\n"),
      /broken or unsafe local link/,
    );
  }));

test("angle-bracket local traversal blocks", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [unsafe](<../../outside file.md>)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /escapes repository/);
  }));

test("missing local link containing spaces blocks", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [missing](missing file.md)\n",
    );
    assert.match(checkGovernance(root).join("\n"), /missing file.md/);
  }));

test("escaped parentheses in local link are checked", () =>
  fixture((root) => {
    writeFileSync(
      join(root, "CLAUDE.md"),
      "# Claude\n\n[AGENTS.md](AGENTS.md) [missing](missing\\(file\\).md)\n",
    );
    assert.match(
      checkGovernance(root).join("\n"),
      /broken or unsafe local link/,
    );
  }));


test("duplicate engineering intake templates fail closed", () =>
  fixture((root) => {
    writeFileSync(
      join(root, ".github/ISSUE_TEMPLATE/engineering_task.md"),
      "---\\nname: Engineering task\\n---\\n",
    );
    assert.match(
      checkGovernance(root).join("\\n"),
      /expected exactly one engineering intake template, found 2/,
    );
  }));

test("missing engineering intake fails closed", () =>
  fixture((root) => {
    rmSync(join(root, ".github/ISSUE_TEMPLATE/engineering.yml"));
    assert.match(
      checkGovernance(root).join("\\n"),
      /expected exactly one engineering intake template, found 0/,
    );
  }));

test("single Markdown engineering intake is accepted", () =>
  fixture((root) => {
    rmSync(join(root, ".github/ISSUE_TEMPLATE/engineering.yml"));
    writeFileSync(
      join(root, ".github/ISSUE_TEMPLATE/engineering_task.md"),
      "---\\nname: Engineering task\\n---\\n",
    );
    assert.deepEqual(checkGovernance(root), []);
  }));
