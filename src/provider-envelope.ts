import { isDeepStrictEqual } from "node:util";
import { comparisonOutcome } from "./explain.ts";
import { reviewCodexPosture } from "./codex-posture-review.ts";
import { compareCodexPosture } from "./codex-posture.ts";
import type { CodexPostureReview } from "./codex-posture-review.ts";
import type { TrackedCodexPostureComparison } from "./codex-git.ts";
import type { ComparisonOutcome, Report } from "./types.ts";

/**
 * Experimental, opt-in report envelope. This is NOT Claude JSON report v1.
 * The two analysis kinds are intentionally disjoint: a Codex posture
 * observation can never be represented as a permission-decision diff.
 */
export type ExperimentalProviderEnvelope =
  ExperimentalClaudeComparisonEnvelope | ExperimentalCodexPostureEnvelope;

interface EnvelopeBase {
  readonly schemaVersion: 2;
  readonly complete: false;
  readonly runtimeVerified: false;
  readonly revisions: readonly [string, string];
}

export interface ExperimentalClaudeComparisonEnvelope extends EnvelopeBase {
  readonly provider: "claude-code";
  readonly analysisKind: "modeled-permission-decision-diff";
  readonly scope: "tracked-project-rule-policy";
  readonly outcome: ComparisonOutcome;
  /** Original v1 compare report, unchanged; no new v1 fields. */
  readonly report: Report;
}

export interface ExperimentalCodexPostureEnvelope extends EnvelopeBase {
  readonly provider: "codex";
  readonly analysisKind: "configured-posture-diff";
  readonly scope: "tracked-project-config-posture";
  readonly outcome: "configured-change" | "configured-no-op" | "uncertain";
  readonly runtimePermissionDiff: false;
  readonly comparison: TrackedCodexPostureComparison;
  readonly review: CodexPostureReview;
}

function validRevisions(revisions: unknown): revisions is [string, string] {
  return (
    Array.isArray(revisions) &&
    revisions.length === 2 &&
    revisions.every(
      (revision) =>
        typeof revision === "string" &&
        revision.length > 0 &&
        revision.length <= 1024,
    )
  );
}

function validEvidence(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const evidence = value as Record<string, unknown>;
  return (
    typeof evidence.revision === "string" &&
    typeof evidence.file === "string" &&
    typeof evidence.pointer === "string" &&
    (evidence.rule === undefined || typeof evidence.rule === "string")
  );
}

function validClaudeEvidence(report: Report): boolean {
  const decisions = ["ALLOW", "ASK", "DENY", "UNKNOWN"];
  const severities = ["HIGH", "MEDIUM", "LOW", "INFO"];
  return (
    report.policies.length === 2 &&
    report.policies.every(
      (policy) =>
        policy !== null &&
        typeof policy === "object" &&
        typeof policy.revision === "string" &&
        Array.isArray(policy.issues) &&
        policy.issues.every(
          (issue) =>
            issue !== null &&
            typeof issue === "object" &&
            typeof issue.message === "string" &&
            validEvidence(issue.evidence) &&
            typeof issue.fingerprint === "string" &&
            (issue.tool === null || typeof issue.tool === "string"),
        ) &&
        Array.isArray(policy.rules) &&
        policy.rules.every(
          (rule) =>
            rule !== null &&
            typeof rule === "object" &&
            typeof rule.tool === "string" &&
            typeof rule.pattern === "string" &&
            ["ALLOW", "ASK", "DENY"].includes(rule.decision) &&
            validEvidence(rule.evidence),
        ) &&
        Array.isArray(policy.files) &&
        policy.files.every((file) => typeof file === "string"),
    ) &&
    report.policies.every(
      (policy, index) => policy.revision === report.revisions[index],
    ) &&
    report.findings.every(
      (finding) =>
        finding !== null &&
        typeof finding === "object" &&
        ["permission", "coverage"].includes(finding.kind) &&
        typeof finding.tool === "string" &&
        typeof finding.witness === "string" &&
        severities.includes(finding.severity) &&
        [finding.before, finding.after].every(
          (evaluation) =>
            evaluation !== null &&
            typeof evaluation === "object" &&
            decisions.includes(evaluation.decision) &&
            typeof evaluation.reason === "string" &&
            Array.isArray(evaluation.evidence) &&
            evaluation.evidence.every(validEvidence),
        ),
    )
  );
}

/** Convert only a supported v1 Claude comparison, never a scan or test report. */
export function createExperimentalClaudeEnvelope(
  report: Report,
): ExperimentalClaudeComparisonEnvelope {
  if (
    !report ||
    report.schemaVersion !== 1 ||
    report.provider !== "claude-code" ||
    report.scope !== "tracked-project-rule-policy" ||
    report.command !== "compare" ||
    report.complete !== false ||
    !validRevisions(report.revisions) ||
    !Array.isArray(report.policies) ||
    !Array.isArray(report.findings) ||
    !validClaudeEvidence(report)
  )
    throw new Error("Invalid or unsupported Claude comparison report");

  // A returned envelope must not change when a caller mutates its input.
  return {
    schemaVersion: 2,
    provider: "claude-code",
    analysisKind: "modeled-permission-decision-diff",
    scope: "tracked-project-rule-policy",
    complete: false,
    runtimeVerified: false,
    revisions: [report.revisions[0], report.revisions[1]],
    outcome: comparisonOutcome(report),
    report: structuredClone(report),
  };
}

/** Convert an already inspected tracked Codex comparison; never resolve trust. */
export function createExperimentalCodexEnvelope(
  comparison: TrackedCodexPostureComparison,
  review: CodexPostureReview,
): ExperimentalCodexPostureEnvelope {
  if (
    !comparison ||
    !review ||
    comparison.schemaVersion !== 1 ||
    comparison.provider !== "codex" ||
    comparison.scope !== "tracked-project-config-posture" ||
    comparison.runtimePermissionDiff !== false ||
    review.schemaVersion !== 1 ||
    review.provider !== "codex" ||
    review.scope !== "tracked-project-config-posture" ||
    review.runtimePermissionDiff !== false ||
    review.runtimeVerified !== false ||
    !comparison.before ||
    !comparison.after ||
    typeof comparison.before.present !== "boolean" ||
    typeof comparison.after.present !== "boolean" ||
    comparison.before.path !== ".codex/config.toml" ||
    comparison.after.path !== ".codex/config.toml" ||
    !validRevisions([comparison.before.revision, comparison.after.revision]) ||
    !Array.isArray(review.unresolved) ||
    ![
      "unknown",
      "unchanged",
      "mixed",
      "broader-configured-sandbox",
      "narrower-configured-sandbox",
      "fewer-approval-prompts",
      "more-approval-prompts",
    ].includes(review.direction) ||
    !isDeepStrictEqual(comparison.posture, review.comparison)
  )
    throw new Error(
      "Invalid or inconsistent Codex configured-posture evidence",
    );

  // Cross-check the caller-provided objects against independent recomputation.
  // A JavaScript caller can forge TS types, a direction, or an uncertainty flag.
  // No supplied configured-posture assertion is treated as runtime truth.
  let expectedPosture: typeof comparison.posture;
  let expectedReview: CodexPostureReview;
  try {
    expectedPosture = compareCodexPosture(
      comparison.before.posture,
      comparison.after.posture,
    );
    expectedReview = reviewCodexPosture(
      comparison.before.posture,
      comparison.after.posture,
    );
  } catch {
    throw new Error(
      "Invalid or inconsistent Codex configured-posture evidence",
    );
  }
  if (
    typeof comparison.uncertain !== "boolean" ||
    comparison.uncertain !==
      (expectedPosture.uncertain ||
        !comparison.before.present ||
        !comparison.after.present) ||
    !isDeepStrictEqual(comparison.posture, expectedPosture) ||
    !isDeepStrictEqual(review, expectedReview)
  )
    throw new Error(
      "Invalid or inconsistent Codex configured-posture evidence",
    );

  const uncertain = comparison.uncertain || review.direction === "unknown";
  // Preserve the validated evidence as detached snapshots.
  return {
    schemaVersion: 2,
    provider: "codex",
    analysisKind: "configured-posture-diff",
    scope: "tracked-project-config-posture",
    complete: false,
    runtimeVerified: false,
    runtimePermissionDiff: false,
    revisions: [comparison.before.revision, comparison.after.revision],
    outcome: uncertain
      ? "uncertain"
      : review.direction === "unchanged"
        ? "configured-no-op"
        : "configured-change",
    comparison: structuredClone(comparison),
    review: structuredClone(review),
  };
}
