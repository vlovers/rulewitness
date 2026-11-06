# Changelog

All notable changes are documented here. Entries marked **Unreleased** describe repository code, not a published npm version.

## 0.4.0-rc.3 — GitHub prerelease published; npm publication verified on 2026-11-05

The [GitHub prerelease](https://github.com/vlovers/rulewitness/releases/tag/v0.4.0-rc.3) exists at source commit `e0b110b17ca762e3ff1c4a99b5f5bba6f200cba0`. A later [read-only registry check (run 41952270676)](https://github.com/vlovers/rulewitness/actions/runs/41952270676), completed 2026-11-05 02:00 UTC on PR #87 commit `9f156a6818b99702abbdc51fe11f75009fc88a53`, verified that npm `rulewitness@0.4.0-rc.3` was published with a SHA-512 integrity value, `next` pointed to `0.4.0-rc.3`, and stable `latest` remained `0.3.0`. Earlier PR #81 returned `E404`; that is historical evidence, not the latest observation. This registry check and installed-package tests do not establish GitHub-tag-to-npm provenance or a final merged-main release approval. Recheck registry state before relying on current dist-tags. This remains an experimental prerelease and does not establish effective runtime permissions for Claude Code or Codex.

### Compatibility and security

- Preserve the v0.3.0 named runtime exports and key TypeScript report/policy contracts through installed-tarball consumer tests.
- Expand Claude installed-CLI regression coverage for modeled transitions, deny-masked changes, unsupported settings and mixed uncertainty across JSON, Markdown and human output, preserving exits 0/1/3.
- Verify real npm tarball integrity, file allowlist, executable aliases, declarations, lockfile/changelog release gates and pinned GitHub workflow checks.

### Independent consumer validation

- Run the pinned `0.4.0-rc.2` experimental Codex reviewer in independent GitHub pull requests for configured changes (exit 1), unsupported profiles (exit 3), unchanged configuration (exit 0), and a real read-only external fork PR.
- Check that deliberately missing Git commit objects are rejected before analysis. Naturally incomplete Git history remains unverified.
- Record base/head SHAs, Action runs and explicit limitations in `docs/codex-consumer-validation.md`.

### Release process

- Add a read-only npm registry audit verifying `rc.3` availability, `next` and SHA-512 integrity while preserving stable `latest`. The workflow did not publish, tag or modify npm.
- The later registry observation confirms `rc.3` availability at the stated time; it does not authorize any new publish, dist-tag mutation, provenance claim or stable release.

## 0.4.0-rc.2 — published 2026-10-21 (npm `next`, experimental)

### Claude Code review and developer experience

- Added explicit session-context evaluation, permission-source provenance inventory and source-aware conservative evaluation; these opt-in TypeScript APIs do not establish live authorization.
- Hardened project trust, unsupported permission-mode and precedence coverage, with regression tests for `UNKNOWN` and secret-safe diagnostics.
- Hardened fork-compatible GitHub PR Actions reporting, preserving distinct threshold (`1`), analysis error (`2`) and uncertainty (`3`) exit outcomes.

### Experimental Codex configured posture

- Added opt-in Codex posture inspection/review APIs and `codex-posture` / `codex-review` commands comparing exact local Git revisions.
- Replaced the restrictive handwritten TOML syntax parser with pinned `smol-toml`; unmodeled settings still force conservative uncertainty.
- Added tracked Git blob safety checks and experimental configured sandbox, approval and workspace flags. **Not effective Codex permissions**, with `runtimeVerified: false` and `runtimePermissionDiff: false`.
- Extended disposable Git and installed-package tests; documented native trust, managed/user settings, profile and runtime limitations.

### Release preparation

- Published `0.4.0-rc.2` as a separate immutable npm prerelease under `next`, preserving stable `latest: 0.3.0`; publication was independently verified on 2026-10-21.
- The original postpublication registry verification exceeded its short retry window. Subsequent PR #60 hardened the read-only verification loop; PRs #61–#63 added published-package and consumer shell-gate CI tests. **None of those postpublication changes are in the rc.2 tarball.**
- Future stable publication requires a new version, matching lockfile, green CI, package audit and explicit maintainer approval.

## 0.4.0-rc.1 — published 2026-10-20

### Internal architecture

- Added an internal, bounded provider comparison contract with deterministic candidate ordering, strict decisions, uncertainty preservation, and cross-snapshot replay.
- Added an internal Claude Code adapter that reuses the existing evaluator; it does not replace the production comparison report.
- Added read-only provider-marker discovery and exact-commit Git snapshots. Codex can be _detected_, but its permissions are **not** evaluated.
- Consolidated shared Git subprocess hardening and tree-object validation for Claude and Codex marker discovery.

### Security and verification

- Reject unsafe Claude and Codex Git objects during provider snapshots, including symlinks and gitlinks.
- Added Git-boundary regressions for dirty worktrees, poisoned Git environment, missing revisions, and non-regular tree entries.
- Added synthetic tests for unstable or malformed provider decisions, candidate floods, and resource limits.
- Extended installed-package smoke tests for exact tarball contents and private module exports.
- Added PR consumer regressions and provider architecture/research documentation.

### Compatibility and limitations

- Published public CLI and TypeScript API still target the documented **Claude Code subset only**.
- JSON schema v1, default CLI behavior, and severity/exit gate semantics remain unchanged.
- These changes do **not** demonstrate parity with Claude Code's complete runtime authorization, or native Codex conformance.
- The `v0.4.0-rc.1` GitHub Release was published on 2026-10-20. Its original RC scope predates the later Unreleased Codex posture and session-context changes.

## 0.3.0

- Published reviewer-oriented Markdown presentation while preserving the narrow Claude Code permission model.
- Refer to [v0.3 documentation](README.md), [v0.3 roadmap](docs/roadmap-v0.3.md), and existing GitHub release notes for the historical release.
