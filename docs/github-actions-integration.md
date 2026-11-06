# Review AI agent configuration changes in GitHub pull requests

RuleWitness runs on **Git objects**, not the checked-out working tree. The supported stable GitHub Action integration uses the publicly released `rulewitness@0.3.0` and audits the bounded Claude Code permission-rule model.

## Copy-paste integration for Claude Code

Copy the repository's audited [workflow](../.github/workflows/rulewitness-pr.yml) to `.github/workflows/rulewitness-pr.yml` in the target project. It works on `pull_request` including fork PRs, provided the GitHub-created merge ref and both commit objects are available. Required permissions are `contents: read`; no secret or write-capable token is necessary.

The workflow:

1. Checks out the generated PR merge commit with history and `persist-credentials: false`.
2. Installs the **trusted published analyzer** without install scripts (never `npm ci` or `npm run` from PR source).
3. Uses `github.event.pull_request.base.sha` and `head.sha` through environment variables, verifies both Git commit objects and compares them without fetching.
4. Writes Markdown to the job summary on success, known HIGH rule transition, or uncertainty. The check fails on both known HIGH transitions (exit 1) and the conservative uncertainty gate (exit 3). Parse/usage failures exit 2.

The report is not automatically posted as a PR comment; this avoids giving untrusted fork PR workflows write permissions. Review the Actions summary instead. If you change the threshold, `high|medium|low|info` are the documented options for `--fail-on`. Do not replace the workflow trigger with `pull_request_target` or execute scripts from the PR head.

## Version boundaries

The existing Claude workflow deliberately installs stable `rulewitness@0.3.0`. Experimental `codex-posture` and `codex-review` commands were published in `rulewitness@0.4.0-rc.2` on npm `next`. **They do not exist in stable v0.3.0.** Never use the unpinned `latest` tag or execute PR-branch code to gain those commands.

Codex changes in the development branch concern _configured posture_, not effective permissions: an approval or sandbox setting does not prove a concrete command can execute in the live agent. Use the [standalone Codex configured-posture PR example](../examples/github-actions/codex-posture-pr.yml) for an explicitly pinned `rulewitness@0.4.0-rc.2` job. This is an experimental and **separate** check: it requires `runtimeVerified: false`, fails on uncertainty and flagged changes, and is not a Claude severity gate. Copy it into the target repository's `.github/workflows/` directory; do not enable it automatically in RuleWitness itself. The pinned published-package Git fixture E2E passed in [PR #61](https://github.com/vlovers/rulewitness/pull/61). The [independent consumer evidence](codex-consumer-validation.md) records three real `pull_request` runs on 2026-10-22: recognized configured-posture change (exit `1`), unsupported TOML profile (exit `3`), and unrelated file (exit `0`). A separate fork-originated consumer PR #5 ran successfully with a read-only token, and consumer PR #4 verified rejection of a deliberately invalid base SHA before analysis. These results validate the pinned experimental workflow in those environments only; naturally incomplete GitHub checkout histories, Codex runtime authorization, and effective settings precedence remain unverified.

## Threat model and maintenance

- PR-controlled configuration is inert evidence, never executed or evaluated.
- No `pull_request_target`, branch-name interpolation in Bash, write tokens, Git hooks, checkout of head to execute scripts, remote Git fetching, or npm lifecycle scripts.
- Even a successful configured-rule review does **not** prove unchanged effective permissions: untracked, user and managed settings, trust and runtime approvals remain outside the model.
- If Git objects are missing, the job fails analysis rather than silently skipping changes.
- Test changes to this workflow in this repository and retain the pinned action SHAs. Review the pinned npm package contents for future upgrades.

Example outcomes in the Actions summary:

| Analyzer exit | Meaning                                          | CI job |
| ------------- | ------------------------------------------------ | ------ |
| `0`           | No configured-rule finding at the gate threshold | Pass   |
| `1`           | Known modeled rule transition exceeds threshold  | Fail   |
| `2`           | Analysis or input error                          | Fail   |
| `3`           | Uncertain gate; manual review needed             | Fail   |

This integration remains offline with respect to the inspected Git policy. Installing the published analyzer accesses the npm registry, but analyzed configuration never triggers its own code execution.

## npm publication verification

The `v0.4.0-rc.2` publish command succeeded on 2026-10-21, but the original workflow exhausted six metadata reads returning `404` before the registry propagated. A later independent `npm view` confirmed `0.4.0-rc.2`, `next: 0.4.0-rc.2`, and the unchanged `latest: 0.3.0`. **Do not rerun `npm publish` for that immutable package version.** The release workflow now allows up to 24 read-only verification attempts, uses `--prefer-online`, and preserves the `latest` tag invariant.

The [experimental Codex consumer workflow](../examples/github-actions/codex-posture-pr.yml) was exercised in three real independent [consumer PR runs](codex-consumer-validation.md) (expected exits `1`, `3`, `0`), plus a [fork-originated PR #5](https://github.com/vlovers/rulewitness-consumer-e2e/pull/5) (read-only `pull_request`, exit `0`) and an [injected missing-base preflight in PR #4](https://github.com/vlovers/rulewitness-consumer-e2e/pull/4). These are historical checks of the pinned `0.4.0-rc.2` workflow, not tests of a naturally incomplete runner checkout or live Codex permissions. The [2026-11-05 registry verification](https://github.com/vlovers/rulewitness/actions/runs/41952270676) separately observed published `0.4.0-rc.3`, `next=0.4.0-rc.3` and unchanged `latest=0.3.0`; it does not establish current registry state, provenance or equivalence of release and npm artifacts. Do not republish immutable versions to resolve documentation discrepancies.
