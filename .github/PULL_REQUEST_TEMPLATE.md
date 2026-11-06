## Purpose and scope

- Linked issue:
- Acceptance criteria:
- Changes made:
- Out of scope:

## Multi-agent coordination and integration

- Parent tracking issue / batch owner / accountable integrator:
- Dependency order and related PRs (including superseded PRs):
- Owned paths and overlap with other agents or active branches:
- Base branch + exact base/head SHA used for review:
- [ ] Changes form one coherent, independently testable outcome rather than artificial micro-PRs
- [ ] Overlapping edits were coordinated; no peer worktree or commits overwritten
- [ ] Integration/rebase impact rechecked against the current target branch

Follow [multi-agent workflow](../docs/engineering/MULTI_AGENT_WORKFLOW.md); a coordination claim is not a file lock.

## Verification evidence

Record exact commands, results, and CI links. Check a command only if it actually passed on the recorded revision. For docs-only or other narrowly scoped changes, leave irrelevant runtime/package commands unchecked and write `N/A — <reason>` below; do not run expensive unrelated suites solely to fill checkboxes.

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:package`
- [ ] `npm run format:check`
- [ ] `npm pack --dry-run`
- [ ] Relevant negative/failure-path regression tests

CI run links, exact head SHA, known failures, and per-command N/A reasons:

## Semantic and supply-chain evidence

- Claude configured-rule coverage and unsupported cases:
- Experimental Codex configured-posture coverage and limitations (not effective authorization):
- `complete: false`, unknown/fail-closed behavior, report schema/version and exit `0/1/2/3` impact:
- Untrusted Git reads, fork CI, credentials and non-execution guarantees:
- Independent semantic oracle / negative regression evidence:
- Packed npm consumer, CLI aliases, exports/declarations, lifecycle scripts disabled (or N/A reason):

## RuleWitness-specific safety

- [ ] Matcher/provider changes include an independent oracle regression in `test/independent-witness.test.ts`, with unknown/fail-closed behavior and exit code `3` covered where relevant.
- [ ] Package-consumer checks use isolated fixtures. No analyzed third-party hooks, permission commands, or lifecycle scripts were executed.
- [ ] No npm publish or release was triggered; publication requires separate maintainer authorization.

See [Definition of Done](../docs/engineering/DEFINITION_OF_DONE.md), [independent review policy](../docs/engineering/REVIEW_POLICY.md), and [release checklist](../docs/engineering/RELEASE_CHECKLIST.md).

## Risk, documentation, and release

- Security / authorization / secrets / data impact:
- Documentation and compatibility changes:
- Rollback or recovery plan (if applicable):
- Unresolved risks / blockers:

## Merge gate

- [ ] Required checks passed on the recorded head SHA
- [ ] Independent review obtained (not author self-review)
- [ ] Blocking findings resolved

Do not merge while any required gate is missing.
