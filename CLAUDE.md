# Claude Code guidance — RuleWitness

Follow [AGENTS.md](AGENTS.md) as the canonical agent working agreement for this repository. Read the README, existing architecture/security documentation and linked issue before changing code.

Workflow: inspect → plan → implement a scoped change → run documented checks → report evidence → open a PR → obtain independent review. Do not assume tests passed unless they ran successfully.

Never override the security, data handling, deployment, release, or merge restrictions in AGENTS.md. If instructions conflict, stop and ask for clarification.

## Issue-first coordination and recovery

Before a parallel session, read [the RuleWitness multi-agent protocol](docs/engineering/MULTI_AGENT_WORKFLOW.md) and the current parent Issue. Record owner, independent reviewer, isolated branch/worktree, claimed files, shared-contract dependencies, integration PR, exact base/head SHA and evidence. Serialize edits to permission schemas, independent oracle, CI, package manifest and lockfile; Issue claims are advisory, not enforced locks.

On restart, fetch the actual `main` and PR head, inspect the worktree, pending reviews and package-test evidence before resuming. Never execute analyzed commands, hooks or lifecycle scripts. For permission-semantic changes, preserve uncertainty/fail-closed behavior and validate the independent oracle; for package checks, use isolated offline consumers with scripts disabled. A changed SHA invalidates stale verification. Keep one coherent PR per outcome, and require independent review and explicit maintainer approval for merge or publication.
