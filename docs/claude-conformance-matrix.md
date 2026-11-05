# Claude Code modeled conformance baseline

This matrix records **RuleWitness model assertions**, not tests against the
Claude Code executable. It is intentionally narrower than native permission
resolution. The executable test source is
[`test/claude-conformance-matrix.test.ts`](../test/claude-conformance-matrix.test.ts);
run it with `npm test` on Node 24.

Reference material (re-check upstream semantics before promoting any case):

- [Claude Code permissions](https://code.claude.com/docs/en/permissions)
- [Claude Code settings and source precedence](https://code.claude.com/docs/en/settings)
- [Permission modes](https://code.claude.com/docs/en/permission-modes)
- [Hooks](https://code.claude.com/docs/en/hooks)

## Model assertions exercised by executable tests

| Scenario | Expected configured-rule result | Evidence boundary |
| --- | --- | --- |
| Matching deny, ask and allow | `DENY` | Parser and evaluator precedence, not runtime precedence |
| Matching ask and allow | `ASK` | Supported rule subset |
| Exact Bash allow | `ALLOW` | Conditional rule match only |
| Bare prefix of trailing ` *` wildcard | `ALLOW` | RuleWitness's documented normalized model |
| Supported allow `:*` alias | `ALLOW` | Syntax normalization, not shell equivalence |
| Unmatched Bash | `UNKNOWN` | No assumed shell/runtime default |
| No rule for WebSearch | `ASK` | Assumed manual/default mode only |
| Explicit bare WebSearch rule | `ALLOW` | Project rule match, not tool execution |
| Unknown tool | `UNKNOWN` | No fictional provider support |
| Documented `manual` alias | Existing modeled rule decision | Does not prove the active session mode |

## Fail-closed cases

The test suite expects `UNKNOWN` rather than inferring a grant for:

- Unsupported `permissions.defaultMode`, including `bypassPermissions`.
- Unsupported hooks, top-level settings, or permission keys.
- Shell substitutions and wrapper command forms.
- Unsupported tool rules such as `Read(...)`.

These are **coverage failures**. They do not say that the agent would deny the
command. An `UNKNOWN` result must not be interpreted as `DENY` or `ALLOW`.

The same test suite checks ask-to-allow transitions, deny-masked additions,
reordering no-ops and changes under an unresolved permission mode. It verifies
JSON report v1 identity/scope, `complete: false`, witness replay and exit-code
gates (0 for modeled no-op, 1 for a known high violation and 3 for uncertainty).
A secret-looking value in an unsupported setting must not appear in diagnostics.

## What remains unverified against the actual agent

| Native behavior | RuleWitness guarantee |
| --- | --- |
| Managed, command-line, user, project and local precedence | No runtime source-merging guarantee |
| Project trust or `/status` output | Not derivable from Git revisions |
| Dynamically approved tools and session overrides | Not inspected |
| Hook execution and tool-specific conditions | Unsupported, unresolved |
| Bash parser, quoting, substitutions, wrappers and real shell expansions | Deliberately bounded rule syntax |
| Built-in approvals and runtime execution enforcement | Not proven |
| Permission changes outside tracked Git files | Not observable by Git-only comparison |
| Native Claude Code versions and cloud/desktop differences | No independently verified version-to-version conformance |

Current Claude Code docs describe managed policy and multiple non-repository
setting sources, so a two-commit comparison cannot establish the effective
authorization of a live session. Even when a caller asserts project trust and
absence of external influences, `runtimeVerified` remains `false`.

## Next conformance stage

1. Pin a **specific** Claude Code executable version and its official
   configuration schema. Record the installed binary hash and environment.
2. Build an isolated, controlled, zero-secret reference harness that observes
   supported decisions without executing dangerous tool commands; do not reuse
   the RuleWitness evaluator as the reference oracle.
3. Compare positive, masked, and ambiguous cases. Preserve explicit mismatches
   and `UNKNOWN` where the runtime result cannot be safely observed.
4. Only promote a supported capability after independent versioned evidence,
   threat-model review, and regression coverage of both CLI and installed npm
   consumers. Keep JSON v1 and existing exit semantics unchanged.

**Current status:** this is an independently reviewable **internal model
baseline**, not Claude Code runtime conformance certification.
