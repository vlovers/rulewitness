import { comparisonOutcome } from "./explain.ts";
import type { CodexPostureReview } from "./codex-posture-review.ts";
import type { TrackedCodexPostureComparison } from "./codex-git.ts";
import type { ComparisonOutcome, Report } from "./types.ts";

/**
 * Experimental, opt-in report envelope. This is NOT Claude JSON report v1.
 * The two analysis kinds are intentionally disjoint: a Codex posture
 * observation can never be represented as a permission-decision diff.
 */
export type ExperimentalProviderEnvelope =
  | ExperimentalClaudeComparisonEnvelope
  | ExperimentalCodexPostureEnvelope;

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
    !Array.isArray(report.findings)
  )
    throw new Error("Invalid or unsupported Claude comparison report");

  return {
    schemaVersion: 2,
    provider: "claude-code",
    analysisKind: "modeled-permission-decision-diff",
    scope: "tracked-project-rule-policy",
    complete: false,
    runtimeVerified: false,
    revisions: [report.revisions[0], report.revisions[1]],
    outcome: comparisonOutcome(report),
    report,
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
    comparison.before.path !== ".codex/config.toml" ||
    comparison.after.path !== ".codex/config.toml" ||
    !validRevisions([
      comparison.before.revision,
      comparison.after.revision,
    ]) ||
    !Array.isArray(review.unresolved) ||
    !["unknown", "unchanged", "mixed", "broader-configured-sandbox",
      "narrower-configured-sandbox", "fewer-approval-prompts",
      "more-approval-prompts"].includes(review.direction) ||
    JSON.stringify(comparison.posture) !== JSON.stringify(review.comparison)
  )
    throw new Error("Invalid or inconsistent Codex configured-posture evidence");

  const uncertain = comparison.uncertain || review.direction === "unknown";
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
    comparison,
    review,
  };
}
