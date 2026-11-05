# Release checklist

This checklist is a gate, **not authorization** to release.

- [ ] Identify target integration branch, candidate commit SHA, scope, known issues and release owner.
- [ ] Verify Definition of Done and all required CI checks on the actual candidate; disclose unrun or unavailable checks rather than marking them green.
- [ ] Confirm independent review covers the candidate SHA, and resolve blocking findings.
- [ ] Verify applicable project-specific integration, security and compatibility checks; use disposable test environments and never production credentials.
- [ ] Confirm documentation, changelog, version/schema changes and third-party asset/licensing obligations where relevant.
- [ ] Document rollback or recovery, compatibility/migration impact, and how the published artifact or deployed version will be verified.
- [ ] Obtain explicit maintainer authorization before merge, package publication or deployment.
- [ ] After authorized release, verify the actual published artifact or deployment independently; record SHA, version, evidence and unresolved follow-ups.

## RuleWitness release evidence

- [ ] Reconcile actual registry versions and dist-tags, latest `main`, candidate SHA, changelog, package manifest/lockfile, immutable tag and current [release-readiness audit](../release-readiness-v0.4.md); do not assume a prerelease is published.
- [ ] Verify supported Claude configured-rule semantics remain distinct from experimental Codex posture, with unknowns, `complete: false`, schema and exit `0/1/2/3` behavior documented.
- [ ] Inspect `npm pack` contents and test the tarball in a clean offline external consumer with lifecycle scripts disabled; verify CLI aliases, exports, declarations and deterministic reports.
- [ ] Verify candidate-specific fork/read-only CI isolation, SHA-pinned actions, least-privilege permissions, trusted publishing/OIDC provenance, tag ancestry and postpublish registry evidence as applicable; do not substitute tests of a different published version.

RuleWitness-specific requirements: validate the locally packed npm artifact in an isolated offline consumer with lifecycle scripts disabled; preserve uncertainty/fail-closed behavior, CLI exit semantics and JSON compatibility; require explicit maintainer authorization before any npm publication. This checklist does not override stricter RuleWitness security and release instructions.
