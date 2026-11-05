# RuleWitness v0.4 — proposed roadmap

Status as checked 2026-11-05: **in progress, stable v0.4.0 not approved**. The [GitHub prerelease v0.4.0-rc.3](https://github.com/vlovers/rulewitness/releases/tag/v0.4.0-rc.3) exists at commit `e0b110b17ca762e3ff1c4a99b5f5bba6f200cba0`; its **npm publication is unverified** (the recorded npm-consumer run in [PR #81](https://github.com/vlovers/rulewitness/pull/81) failed with E404). The last separately verified npm prerelease was `0.4.0-rc.2`; the independently verified stable baseline is `0.3.0`. Do not assume current dist-tags without a new registry check.

Phase 1 consumer evidence is recorded in [docs/codex-consumer-validation.md](codex-consumer-validation.md): real PR changes, unsupported syntax, unchanged config and an external fork PR were exercised. The missing-object negative control deliberately supplied an invalid SHA; a naturally incomplete checkout has **not** been reproduced. These tests do not establish effective Codex runtime permissions.

See [release readiness](release-readiness-v0.4.md), [Claude runtime boundaries](claude-runtime-boundaries.md) and [changelog](../CHANGELOG.md). The [v0.3 roadmap](roadmap-v0.3.md) is historical.

## Goal

Improve adoption and validate a careful provider-extension architecture **without** claiming that Claude Code rules apply to other AI tools. Prioritize verifiable behavior over broad but speculative support.

## Phase 1 — evidence and compatibility

- Audit the current CLI/library API, published package, documented settings subset, known unsafe assumptions, and security boundaries.
- Build executable disposable-repository consumer fixtures for normal PRs, fork PRs, missing commit objects, unsupported syntax, and sensitive output.
- Verify CI, package installation and the public example using exact refs. Record real run links and limitations; do not mark missing cases as tested.
- Improve operational docs, platform requirements, and exit-code troubleshooting without changing schema v1.

**Acceptance:** reproducible fixtures, tests passing on Node.js 24, no command execution from examined policies, explicit uncertainty.

## Phase 2 — provider-neutral reporting (design first)

- Inventory what the existing CLI, policy types, parser and comparator assume about Claude-specific rules.
- Specify a **versioned provider identity** on future report data while preserving v1 consumers and the current CLI by default.
- Define adapter interfaces with separate detection, loading, validation, and evaluation responsibilities. Reject unknown providers, ambiguous auto-detection, and unsupported rules.
- Keep evidence, bounded witness generation, deterministic ordering and `complete: false` where coverage remains partial.
- Review backwards compatibility, threat models and potential maintenance burden before implementation.

**Acceptance:** a written design with compatibility tests; no unverified provider claims.

## Phase 3 — first additional provider only after research

Select one provider **only if** its documented configuration and precedence semantics can be modeled and independently tested. Otherwise publish a feasibility report rather than a misleading implementation. Consider Codex or other coding agents as candidates, not supported products.

- Link version-specific primary documentation; capture representative positive/negative fixtures.
- Test precedence, inheritance, unknown syntax, defaults and configuration locations against confirmed behavior where possible.
- Support provider-specific uncertainty instead of mapping unknown decisions to `ALLOW`.
- Ship behind an explicit provider selection and experimental label until adequately validated.

**Acceptance:** independent tests, versioned reference evidence, CLI and package smoke tests, threat-model review and clear documented limitations.

## Phase 4 — developer adoption

- Build a copy-pasteable minimal repository integration and tested `npm exec` / `npx` flow.
- Improve short documentation and real examples; compare competitor approaches accurately without unsupported differentiation claims.
- Evaluate optional PR comments separately: no write-token execution of untrusted PR code; preserve redaction and permissions safety.
- Gather early user feedback before adding more plugins or provider adapters.

## Current compatibility evidence

The [Claude runtime boundaries audit](claude-runtime-boundaries.md) documents why tracked Git rules cannot establish live session trust, external settings precedence or complete effective permission decisions. Regression tests exercise modeled cross-file precedence, deny masking, unsupported hooks and modes, and secret-safe diagnostics. These tests validate the **model**, not Claude Code runtime conformance.

## Release gate

No tag or npm publication until the code, docs, tests and package smoke checks pass and maintainer review is complete. Keep changes reviewable in dedicated PRs; never silently change v0.3 JSON v1, severity gates or exit statuses.
