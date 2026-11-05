# Experimental provider analysis envelope (schema v2)

**Status: experimental, opt-in TypeScript API.** The existing Claude Code
`scan`, `compare` and `test` CLI commands and JSON report schema v1 are
unchanged. The envelope does not grant access, authorize commands or promise
native agent behavior. This API is introduced by the source PR for review;
**do not assume it is present in any already-published npm tarball**, including
`0.4.0-rc.3`. Installed-package checks here use a newly packed test artifact,
not published npm.

RuleWitness now has two distinct analysis categories:

| Provider | `analysisKind` | What is represented | What is NOT established |
| --- | --- | --- | --- |
| Claude Code | `modeled-permission-decision-diff` | A bounded semantic diff of supported tracked project rules, with replayable witnesses and the unchanged v1 report | Runtime-effective permissions, trust, managed/user settings, live approvals |
| Codex | `configured-posture-diff` | Experimental differences in explicitly recognized tracked TOML sandbox/approval settings | Permission decisions for individual commands, actual sandbox enforcement, configuration precedence |

Both envelopes carry `schemaVersion: 2`, exact supplied revision identifiers,
`complete: false`, and `runtimeVerified: false`. The Codex variant also has
`runtimePermissionDiff: false`. The discriminated union prevents TypeScript
callers from treating the Codex configured posture as a Claude modeled
permission transition.

## Usage

```ts
import {
  comparePolicies,
  createExperimentalClaudeEnvelope,
  createExperimentalCodexEnvelope,
  parsePolicy,
  compareCodexPosture,
  inspectCodexPosture,
  reviewCodexPosture,
} from "rulewitness";

// Two inert tracked-rule snapshots from a caller-controlled source.
const before = parsePolicy("base", {
  ".claude/settings.json": JSON.stringify({
    permissions: { ask: ["Bash(npm test)"] },
  }),
});
const after = parsePolicy("head", {
  ".claude/settings.json": JSON.stringify({
    permissions: { allow: ["Bash(npm test)"] },
  }),
});
const claude = createExperimentalClaudeEnvelope(
  comparePolicies(before, after),
);
console.log(claude.analysisKind); // modeled-permission-decision-diff
console.log(claude.report.schemaVersion); // 1: original report preserved

// For real Codex Git comparisons, obtain `comparison` and `review` using
// reviewTrackedCodexPosture(repository, baseRef, headRef) instead.
const oldPosture = inspectCodexPosture(
  'approval_policy = "on-request"\nsandbox_mode = "read-only"',
);
const newPosture = inspectCodexPosture(
  'approval_policy = "never"\nsandbox_mode = "workspace-write"',
);
const posture = compareCodexPosture(oldPosture, newPosture);
const codex = createExperimentalCodexEnvelope(
  {
    schemaVersion: 1,
    provider: "codex",
    scope: "tracked-project-config-posture",
    before: {
      revision: "a".repeat(40),
      path: ".codex/config.toml",
      present: true,
      posture: oldPosture,
    },
    after: {
      revision: "b".repeat(40),
      path: ".codex/config.toml",
      present: true,
      posture: newPosture,
    },
    posture,
    uncertain: posture.uncertain,
    runtimePermissionDiff: false,
  },
  reviewCodexPosture(oldPosture, newPosture),
);
console.log(codex.analysisKind); // configured-posture-diff
console.log(codex.runtimePermissionDiff); // false
```

For a typed consumer:

```ts
import type { ExperimentalProviderEnvelope } from "rulewitness";

function render(result: ExperimentalProviderEnvelope): string {
  switch (result.analysisKind) {
    case "modeled-permission-decision-diff":
      return result.report.findings.length + " modeled findings";
    case "configured-posture-diff":
      return result.outcome + " (not runtime permissions)";
  }
}
```

## Status, uncertainty and compatibility

- `createExperimentalClaudeEnvelope` accepts **only** a v1 Claude
  `compare` report with `complete: false`; rejects scan/test or incompatible
  provider identifiers. It computes outcome using the existing comparison
  evaluator, so uncertain findings are not silently downgraded to no-op.
- `createExperimentalCodexEnvelope` accepts an inspected tracked Codex
  comparison and its matching posture review. It rejects inconsistent evidence,
  unexpected provider/scope values and forged runtime verification flags.
  It does **not** synthesize `HIGH` severity, `ALLOW` or an authorization
  decision from configured sandbox changes.
- `configured-no-op` means no observed change in the limited represented
  posture model, not unchanged runtime behavior.
- The envelopes reference caller-supplied existing report objects; callers
  should treat returned DTOs as analysis evidence, not trusted policy or a
  tamper-resistant signed report. Never insert raw configuration or witness
  strings into unescaped HTML/Markdown.
- No new default CLI output, no JSON v1 schema changes and no new Codex
  semantic permission support. A future stable v2 report contract requires
  a separate compatibility and native-conformance decision.

See [provider architecture RFC](rfc-v0.4-provider-architecture.md),
[Claude conformance matrix](claude-conformance-matrix.md) and
[Codex posture limitations](codex-posture-experimental.md).
