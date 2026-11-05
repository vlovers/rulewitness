# Real missing Git objects — negative control

RuleWitness must distinguish a **file that does not exist in a Git revision**
from a **file whose tree entry exists but whose blob cannot be read**. Returning
an empty policy for the latter would permit a false modeled no-op or an invalid
CI pass.

The executable regression suite
[`test/git-missing-blob-e2e.test.ts`](../test/git-missing-blob-e2e.test.ts)
constructs isolated, unnetworked disposable Git repositories, commits normal
Claude and Codex settings, then removes the **actual loose blob** from the
object database while leaving the commit and tree intact. It does not fake a
SHA, execute agent commands, set up a remote, or fetch missing content.

The tests verify:

- A missing **head** Claude settings blob raises a read-only Git analysis
  error, rather than a missing-config interpretation or a partial JSON report.
- A missing **head** Codex TOML blob raises an analysis error rather than an
  inferred safe posture or `runtimePermissionDiff: true`.
- The provider snapshot reader also rejects either missing referenced blob.
- A missing **base** Claude blob does not silently fall back to the valid
  checkout HEAD policy.
- A genuinely absent tracked file is distinguishable from a corrupt/incomplete
  object graph.
- CLI compare operations fail with exit code **2**, without success JSON.
- The Git HEAD, worktree status and index do not change through failed reads.
- Error messages are generic and do not print contents of the source settings.

This extends the existing [Codex consumer validation](codex-consumer-validation.md)
negative controls and the [Git object boundary tests](../test/git-object-boundary.test.ts).

## Scope of evidence

These are **real missing-object Git fixtures** on a locally manufactured
incomplete object graph. They do not prove that GitHub Actions checkout itself
will produce the same incomplete object graph under every shallow fetch,
partial clone, Git version or fork workflow. The read-only Git reader uses
`--no-lazy-fetch`, removes inherited `GIT_*` overrides, and does not run
`git fetch`, `git checkout`, shell commands from policy files, or hooks.

The expected conservative outcome is an **analysis error**, not a claim that
the requested command would be denied by Claude Code or Codex. Both providers
remain limited to their documented configuration models; runtime enforcement
and trust are not verified.
