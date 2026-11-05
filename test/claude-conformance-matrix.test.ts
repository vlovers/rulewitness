import assert from "node:assert/strict";
import test from "node:test";
import {
  assessComparisonGate,
  comparePolicies,
  comparisonOutcome,
  evaluate,
  evaluateWithContext,
  evaluateWithSources,
  parsePolicy,
  scanPolicy,
  validateWitness,
} from "../src/index.ts";
import type { Decision } from "../src/index.ts";

const shared = ".claude/settings.json";
const local = ".claude/settings.local.json";
const policy = (
  permissions: Record<string, unknown>,
  revision = "head",
  extra: Record<string, unknown> = {},
) =>
  parsePolicy(revision, {
    [shared]: JSON.stringify({ ...extra, permissions }),
  });

type Case = {
  name: string;
  permissions: Record<string, unknown>;
  tool: string;
  input: string;
  expected: Decision;
};

const modeled: Case[] = [
  {
    name: "deny has precedence over ask and allow",
    permissions: {
      allow: ["Bash"],
      ask: ["Bash(git *)"],
      deny: ["Bash(git push *)"],
    },
    tool: "Bash",
    input: "git push origin main",
    expected: "DENY",
  },
  {
    name: "ask has precedence over allow",
    permissions: { allow: ["Bash"], ask: ["Bash(npm *)"] },
    tool: "Bash",
    input: "npm test",
    expected: "ASK",
  },
  {
    name: "allow matches a supported exact Bash command",
    permissions: { allow: ["Bash(npm test)"] },
    tool: "Bash",
    input: "npm test",
    expected: "ALLOW",
  },
  {
    name: "trailing wildcard includes the bare prefix",
    permissions: { allow: ["Bash(npm *)"] },
    tool: "Bash",
    input: "npm",
    expected: "ALLOW",
  },
  {
    name: "legacy colon-star alias is normalized in allow",
    permissions: { allow: ["Bash(npm:*)"] },
    tool: "Bash",
    input: "npm test",
    expected: "ALLOW",
  },
  {
    name: "bare WebSearch default is conditional ASK",
    permissions: {},
    tool: "WebSearch",
    input: "*",
    expected: "ASK",
  },
  {
    name: "explicit WebSearch allow matches",
    permissions: { allow: ["WebSearch"] },
    tool: "WebSearch",
    input: "*",
    expected: "ALLOW",
  },
  {
    name: "unmatched Bash is unknown, not denied",
    permissions: { allow: ["Bash(npm test)"] },
    tool: "Bash",
    input: "git status",
    expected: "UNKNOWN",
  },
  {
    name: "unsupported tools stay unknown",
    permissions: { allow: ["Bash"] },
    tool: "Read",
    input: "/etc/passwd",
    expected: "UNKNOWN",
  },
  {
    name: "documented manual mode alias is modeled",
    permissions: { defaultMode: "manual", allow: ["Bash(npm test)"] },
    tool: "Bash",
    input: "npm test",
    expected: "ALLOW",
  },
];

for (const scenario of modeled) {
  test(`Claude modeled baseline: ${scenario.name}`, () => {
    const snapshot = policy(scenario.permissions);
    assert.deepEqual(snapshot.issues, []);
    assert.equal(
      evaluate(snapshot, scenario.tool, scenario.input).decision,
      scenario.expected,
    );
    assert.equal(scanPolicy(snapshot).complete, false);
  });
}

const unresolved = [
  {
    name: "unsupported defaultMode",
    permissions: { defaultMode: "bypassPermissions", allow: ["Bash"] },
    extra: {},
  },
  {
    name: "unsupported hook",
    permissions: { allow: ["Bash"] },
    extra: { hooks: { PreToolUse: [{ matcher: "Bash" }] } },
  },
  {
    name: "unsupported permission key",
    permissions: { allow: ["Bash"], additionalDirectories: ["/tmp"] },
    extra: {},
  },
  {
    name: "complex Bash substitution",
    permissions: { allow: ["Bash(echo $(whoami))"] },
    extra: {},
  },
  {
    name: "Bash wrapper normalization is not modeled",
    permissions: { allow: ["Bash(timeout 10 npm test)"] },
    extra: {},
  },
  {
    name: "unsupported tool rule",
    permissions: { allow: ["Read(/tmp/*)"] },
    extra: {},
  },
  {
    name: "unknown top-level key",
    permissions: { allow: ["Bash"] },
    extra: { futureSetting: { enabled: true } },
  },
];

for (const scenario of unresolved) {
  test(`Claude conservative baseline: ${scenario.name}`, () => {
    const snapshot = policy(scenario.permissions, "unknown", scenario.extra);
    assert.ok(snapshot.issues.length > 0);
    assert.equal(evaluate(snapshot, "Bash", "npm test").decision, "UNKNOWN");
    assert.equal(scanPolicy(snapshot).complete, false);
  });
}

test("Claude modeled transitions and masked no-ops remain replayable JSON v1", () => {
  const cases = [
    {
      name: "ask to allow",
      first: { ask: ["Bash(npm test)"] },
      second: { allow: ["Bash(npm test)"] },
      outcome: "modeled-change",
      exit: 1,
    },
    {
      name: "deny masks new allow",
      first: { deny: ["Bash(npm *)"] },
      second: { deny: ["Bash(npm *)"], allow: ["Bash(npm test)"] },
      outcome: "modeled-no-op",
      exit: 0,
    },
    {
      name: "reordered same rules",
      first: { allow: ["Bash(npm test)", "WebSearch"] },
      second: { allow: ["WebSearch", "Bash(npm test)"] },
      outcome: "modeled-no-op",
      exit: 0,
    },
    {
      name: "unsupported mode with changed rules",
      first: { defaultMode: "plan", ask: ["Bash(npm test)"] },
      second: { defaultMode: "plan", allow: ["Bash(npm test)"] },
      outcome: "uncertain",
      exit: 3,
    },
  ] as const;
  for (const scenario of cases) {
    const before = policy({ ...scenario.first }, "before");
    const after = policy({ ...scenario.second }, "after");
    const report = comparePolicies(before, after);
    assert.equal(report.schemaVersion, 1, scenario.name);
    assert.equal(report.provider, "claude-code", scenario.name);
    assert.equal(report.scope, "tracked-project-rule-policy", scenario.name);
    assert.equal(report.complete, false, scenario.name);
    assert.equal(comparisonOutcome(report), scenario.outcome, scenario.name);
    assert.equal(
      assessComparisonGate(report, "high").exitCode,
      scenario.exit,
      scenario.name,
    );
    for (const finding of report.findings.filter(
      (finding) => finding.kind === "permission",
    )) {
      assert.ok(validateWitness(before, after, finding), scenario.name);
    }
  }
});

test("Claude context and source assertions never become runtime verification", () => {
  const snapshot = policy({ allow: ["Bash(npm test)"] });
  const context = {
    projectTrust: "trusted",
    permissionMode: "default",
    externalInfluences: "none",
  } as const;
  const modeled = evaluateWithContext(snapshot, "Bash", "npm test", context);
  assert.equal(modeled.contextual.decision, "ALLOW");
  assert.equal(modeled.runtimeVerified, false);
  const sourceAware = evaluateWithSources(
    snapshot,
    "Bash",
    "npm test",
    context,
  );
  assert.equal(sourceAware.runtimeVerified, false);
  assert.notEqual(sourceAware.contextual.decision, "ALLOW");
  assert.ok(sourceAware.unresolvedSources.length > 0);
});

test("Unsupported configuration does not echo sensitive values", () => {
  const secret = "sensitive-credential-example-5ebd";
  const before = policy({ allow: ["Bash(npm test)"] }, "before");
  const after = policy(
    { allow: ["Bash(npm test)"], futureSetting: { token: secret } },
    "after",
  );
  const result = comparePolicies(before, after);
  assert.equal(comparisonOutcome(result), "uncertain");
  assert.equal(assessComparisonGate(result, "low").exitCode, 3);
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.equal(result.complete, false);
});
