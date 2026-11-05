# Definition of Done — RuleWitness

A change is **implemented** when the agreed scope exists, **verified** when relevant checks and independent review have evidence, **accepted** when the maintainer confirms requirements, and **released** only after publication and external verification. These states are distinct.

## Required evidence

- Acceptance criteria, scope and non-goals are explicit.
- Preserve limited static-analysis claims: not runtime authorization, a sandbox, or proof a command will execute. Preserve `complete: false`, uncertainty/fail-closed behavior, report schema/version and exit-code semantics (including uncertainty exit code 3), unless a reviewed versioned breaking change is intentional.
- Regression tests cover malformed/untrusted Git objects and configurations, uncertainty, no-execution guarantees, and negative cases where relevant. Matcher changes extend the independent policy oracle (`test/independent-witness.test.ts`), not only implementation-sharing tests.
- Consumer/CI/Actions changes verify packed or published package behavior in isolated consumers and read-only fork safety where applicable; do not treat fixture-only success as evidence of installed-provider conformance.
- Record actual Node.js 24 checks as relevant: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:package`, `npm run format:check`, `npm pack --dry-run`. State unrun/N/A checks and why.
- Package tests use isolated consumer fixtures; do not execute analyzed rules/hooks/commands or third-party lifecycle scripts from analyzed packages.
- Independent reviewer records identity, reviewed head SHA, findings and disposition. AI review is not authorized GitHub approval. Re-review material changes and resolve blocking findings.
- Docs describe actual supported/unsupported behavior. A green CI run does not prove real Claude/Codex runtime conformance.

Docs-only changes may mark irrelevant runtime tests N/A with a reason; leave those PR checkboxes unchecked rather than treating N/A as a pass. Verify changed links and command references. At issue creation, SHA and CI evidence are planned fields; record actual revision and results at handoff. Publishing requires the separate release checklist and explicit maintainer authorization.
