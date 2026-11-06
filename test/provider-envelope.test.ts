import assert from "node:assert/strict";
import test from "node:test";
import {
  compareCodexPosture,
  comparePolicies,
  createExperimentalClaudeEnvelope,
  createExperimentalCodexEnvelope,
  inspectCodexPosture,
  parsePolicy,
  reviewCodexPosture,
  scanPolicy,
} from "../src/index.ts";
import type {
  ExperimentalProviderEnvelope,
  TrackedCodexPostureComparison,
} from "../src/index.ts";

const file = ".claude/settings.json";
const claude = (revision: string, permissions: object) =>
  parsePolicy(revision, {
    [file]: JSON.stringify({ permissions }),
  });
const knownToml = 'approval_policy = "on-request"\nsandbox_mode = "read-only"';
const broaderToml =
  'approval_policy = "never"\nsandbox_mode = "workspace-write"';

function codex(
  first: string,
  second: string,
): {
  comparison: TrackedCodexPostureComparison;
  review: ReturnType<typeof reviewCodexPosture>;
} {
  const before = inspectCodexPosture(first);
  const after = inspectCodexPosture(second);
  const posture = compareCodexPosture(before, after);
  return {
    comparison: {
      schemaVersion: 1,
      provider: "codex",
      scope: "tracked-project-config-posture",
      before: {
        revision: "a".repeat(40),
        path: ".codex/config.toml",
        present: true,
        posture: before,
      },
      after: {
        revision: "b".repeat(40),
        path: ".codex/config.toml",
        present: true,
        posture: after,
      },
      posture,
      uncertain: posture.uncertain,
      runtimePermissionDiff: false,
    },
    review: reviewCodexPosture(before, after),
  };
}

test("experimental v2 Claude envelope preserves the complete legacy v1 report", () => {
  const report = comparePolicies(
    claude("before", { ask: ["Bash(npm test)"] }),
    claude("after", { allow: ["Bash(npm test)"] }),
  );
  const v1 = JSON.stringify(report);
  const result = createExperimentalClaudeEnvelope(report);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.provider, "claude-code");
  assert.equal(result.scope, "tracked-project-rule-policy");
  assert.equal(result.analysisKind, "modeled-permission-decision-diff");
  assert.equal(result.outcome, "modeled-change");
  assert.deepEqual(result.revisions, ["before", "after"]);
  assert.equal(result.complete, false);
  assert.equal(result.runtimeVerified, false);
  assert.equal(JSON.stringify(result.report), v1);
  assert.equal(JSON.stringify(report), v1);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).report, report);
});

test("experimental v2 Claude uncertainty cannot silently become a known no-op", () => {
  const report = comparePolicies(
    claude("before", {
      defaultMode: "plan",
      ask: ["Bash(npm test)"],
    }),
    claude("after", {
      defaultMode: "plan",
      allow: ["Bash(npm test)"],
    }),
  );
  const result = createExperimentalClaudeEnvelope(report);
  assert.equal(result.outcome, "uncertain");
  assert.equal(result.complete, false);
  assert.equal(result.report.schemaVersion, 1);
});

test("experimental v2 Claude rejects invalid report and runtime completeness claims", () => {
  const report = comparePolicies(claude("a", {}), claude("b", {}));
  for (const wrong of [
    { ...report, command: "scan" },
    { ...report, provider: "codex" },
    { ...report, scope: "runtime-authorization" },
    { ...report, complete: true },
    { ...report, revisions: ["only-one"] },
    { ...report, schemaVersion: 2 },
  ]) {
    assert.throws(
      () =>
        createExperimentalClaudeEnvelope(
          wrong as Parameters<typeof createExperimentalClaudeEnvelope>[0],
        ),
      /Invalid or unsupported/,
    );
  }
  assert.throws(
    () => createExperimentalClaudeEnvelope(scanPolicy(claude("a", {}))),
    /Invalid or unsupported/,
  );
});

test("experimental v2 Codex records a configured change, never permission escalation", () => {
  const { comparison, review } = codex(knownToml, broaderToml);
  const result = createExperimentalCodexEnvelope(comparison, review);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.provider, "codex");
  assert.equal(result.analysisKind, "configured-posture-diff");
  assert.equal(result.scope, "tracked-project-config-posture");
  assert.equal(result.outcome, "configured-change");
  assert.equal(result.complete, false);
  assert.equal(result.runtimeVerified, false);
  assert.equal(result.runtimePermissionDiff, false);
  assert.equal(result.review.direction, "mixed");
  assert.deepEqual(result.comparison, comparison);
  assert.notEqual(result.comparison, comparison);
  assert.notEqual(result.review, review);
  assert.deepEqual(result.revisions, ["a".repeat(40), "b".repeat(40)]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test("experimental v2 Codex accepts equivalent evidence with reordered object keys", () => {
  const { comparison, review } = codex(knownToml, broaderToml);
  const reorderedPosture = Object.fromEntries(
    Object.entries(comparison.posture).reverse(),
  ) as typeof comparison.posture;
  const reorderedReview = Object.fromEntries(
    Object.entries(review).reverse(),
  ) as typeof review;
  const result = createExperimentalCodexEnvelope(
    { ...comparison, posture: reorderedPosture },
    { ...reorderedReview, comparison: reorderedPosture },
  );
  assert.equal(result.outcome, "configured-change");
  assert.equal(result.runtimeVerified, false);
  assert.equal(result.runtimePermissionDiff, false);
});

test("experimental v2 Codex differentiates unchanged and unknown posture", () => {
  const unchanged = codex(knownToml, knownToml);
  const known = createExperimentalCodexEnvelope(
    unchanged.comparison,
    unchanged.review,
  );
  assert.equal(known.outcome, "configured-no-op");
  const unsupported = codex(knownToml, broaderToml + "\n[profiles.test]");
  const unknown = createExperimentalCodexEnvelope(
    unsupported.comparison,
    unsupported.review,
  );
  assert.equal(unknown.outcome, "uncertain");
  assert.equal(unknown.review.direction, "unknown");
  assert.equal(unknown.runtimePermissionDiff, false);
});

test("experimental v2 Codex refuses spoofed runtime claims and mismatched evidence", () => {
  const { comparison, review } = codex(knownToml, broaderToml);
  const failures = [
    [{ ...comparison, runtimePermissionDiff: true }, review],
    [comparison, { ...review, runtimeVerified: true }],
    [comparison, { ...review, runtimePermissionDiff: true }],
    [
      comparison,
      { ...review, comparison: { ...review.comparison, changes: [] } },
    ],
    [comparison, { ...review, provider: "claude-code" }],
    [comparison, { ...review, direction: "unchanged" }],
    [{ ...comparison, uncertain: true }, review],
    [
      { ...comparison, posture: { ...comparison.posture, changes: [] } },
      review,
    ],
    [
      { ...comparison, before: { ...comparison.before, path: "../secret" } },
      review,
    ],
  ] as const;
  for (const [invalidComparison, invalidReview] of failures) {
    assert.throws(
      () =>
        createExperimentalCodexEnvelope(
          invalidComparison as TrackedCodexPostureComparison,
          invalidReview as typeof review,
        ),
      /Invalid or inconsistent/,
    );
  }
});

test("provider discriminant prevents interpreting configured posture as Claude permission decision", () => {
  const report = comparePolicies(claude("before", {}), claude("after", {}));
  const { comparison, review } = codex(knownToml, broaderToml);
  const envelopes: ExperimentalProviderEnvelope[] = [
    createExperimentalClaudeEnvelope(report),
    createExperimentalCodexEnvelope(comparison, review),
  ];
  for (const envelope of envelopes) {
    switch (envelope.analysisKind) {
      case "modeled-permission-decision-diff":
        assert.equal(envelope.provider, "claude-code");
        assert.equal(envelope.outcome, "modeled-no-op");
        assert.equal(envelope.report.schemaVersion, 1);
        break;
      case "configured-posture-diff":
        assert.equal(envelope.provider, "codex");
        assert.equal(envelope.runtimePermissionDiff, false);
        assert.equal(envelope.outcome, "configured-change");
        break;
      default: {
        const exhaustive: never = envelope;
        throw new Error(String(exhaustive));
      }
    }
  }
});

test("experimental v2 Claude envelope retains evidence after caller mutation", () => {
  const report = comparePolicies(
    claude("before", { ask: ["Bash(npm test)"] }),
    claude("after", { allow: ["Bash(npm test)"] }),
  );
  const envelope = createExperimentalClaudeEnvelope(report);
  const snapshot = JSON.stringify(envelope);
  assert.notEqual(envelope.report, report);
  report.findings.length = 0;
  report.revisions[0] = "mutated";
  assert.equal(JSON.stringify(envelope), snapshot);
  assert.equal(envelope.outcome, "modeled-change");
});

test("experimental v2 Codex envelope retains evidence after caller mutation", () => {
  const { comparison, review } = codex(knownToml, broaderToml);
  const envelope = createExperimentalCodexEnvelope(comparison, review);
  const snapshot = JSON.stringify(envelope);
  comparison.before.revision = "mutated";
  Object.assign(comparison.posture, { changes: [] });
  Object.assign(review, { unresolved: [] });
  assert.equal(JSON.stringify(envelope), snapshot);
  assert.equal(envelope.outcome, "configured-change");
});

test("experimental v2 rejects malformed nested Claude evidence and Codex presence", () => {
  const report = comparePolicies(
    claude("before", { ask: ["Bash(npm test)"] }),
    claude("after", { allow: ["Bash(npm test)"] }),
  );
  const invalidReports = [
    { ...report, policies: [null, report.policies[1]] },
    { ...report, policies: [report.policies[0]] },
    {
      ...report,
      policies: [{ ...report.policies[0], issues: null }, report.policies[1]],
    },
    { ...report, findings: [null] },
    { ...report, findings: [{ ...report.findings[0], before: null }] },
    {
      ...report,
      findings: [{ ...report.findings[0], after: { decision: "ALLOW" } }],
    },
    { ...report, findings: [{ ...report.findings[0], severity: "CRITICAL" }] },
  ];
  for (const invalid of invalidReports) {
    assert.throws(
      () => createExperimentalClaudeEnvelope(invalid as typeof report),
      /Invalid or unsupported Claude comparison report/,
    );
  }
  const { comparison, review } = codex(knownToml, broaderToml);
  for (const invalidPresent of ["true", 1, null, undefined]) {
    assert.throws(
      () =>
        createExperimentalCodexEnvelope(
          {
            ...comparison,
            before: {
              ...comparison.before,
              present: invalidPresent as unknown as boolean,
            },
          },
          review,
        ),
      /Invalid or inconsistent Codex configured-posture evidence/,
    );
  }
});
