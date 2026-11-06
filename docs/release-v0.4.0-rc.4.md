# RuleWitness v0.4.0-rc.4 — proposed prerelease notes

**Status: merged to main via PR #92 (`5d44a0f1f2ce2cc317b5574c7a774f68add0abca`); not independently verified as published.** Publish from an exact reviewed commit after all gates pass. Do not claim that rc.4 is available on npm or GitHub until independently verified.

## Changes since rc.3

- Introduce opt-in typed experimental schema-v2 provider envelopes. Claude Code continues to provide modeled tracked-project permission-rule comparisons with the unchanged v1 report; Codex provides tracked TOML configured-posture observations, **not** runtime permission decisions.
- Validate malformed nested Claude report data and inconsistent Codex review/presence flags; snapshot evidence to avoid input mutation changing results.
- Add real missing Git-object negative controls for read-only Claude/Codex analysis, requiring errors rather than a false safe outcome.
- Update prerelease documentation and registry audit evidence while preserving the existing stable API and CLI semantics.

## Compatibility and boundaries

- Existing Claude JSON v1 and stable v0.3 consumer contracts remain unchanged.
- `complete: false` and `runtimeVerified: false` remain explicit; Codex also uses `runtimePermissionDiff: false`.
- This does not prove native Claude/Codex runtime behavior, trust, profile precedence, managed/user settings, Windows conformance or provenance of previously published rc.3.

## Verified source checks

- PR #92 head `c49ffa13377fd2da070905e95d256909a6999ffa`: six GitHub checks passed, including Node 24 CI, registry preflight, tarball/installed consumer, permissions review and stable v0.3 compatibility.
- PR #92 was squash-merged as `5d44a0f1f2ce2cc317b5574c7a774f68add0abca`. Head CI does **not** prove the merge SHA was independently tested. No GitHub Release, npm publication, npm provenance or current dist-tag state is asserted here.

## Publication checklist

1. Verify that `rulewitness@0.4.0-rc.4` does not exist on npm, that `next` is the intended prerelease channel and that `latest` is not modified.
2. Confirm `package.json`, `package-lock.json`, changelog, exact source SHA and proposed `v0.4.0-rc.4` tag match.
3. Run Node 24 `npm ci --ignore-scripts --no-audit --no-fund`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:package` and `git diff --check`.
4. Inspect `npm pack --dry-run --json`, the real packed tarball, ESM exports, TypeScript declarations, both CLI aliases, Codex commands and independent installation.
5. Review release workflow tag equality, main ancestry, OIDC trusted publishing, action pins and postpublication audit.
6. Publish a GitHub prerelease only after exact-commit CI passes. Verify npm package integrity, dist-tags and provenance independently. If publishing fails, do not claim success or republish the same version blindly.

Do not move stable npm `latest` to rc.4.
