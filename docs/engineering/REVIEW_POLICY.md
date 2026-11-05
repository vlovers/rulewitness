# Independent review policy

Every change requires an independent assessment of the actual base-to-head diff, acceptance criteria, tests, documentation and security implications. The author and the reviewer must be distinct. A second AI model may supply useful independent technical findings, but **AI feedback is not an authorized GitHub approval**. Required human approvals and branch protections must still be satisfied.

Record the reviewer, reviewed head SHA, scope, evidence, and each finding with severity, concrete failure scenario and resolution. Security/correctness findings of high severity block acceptance. Material changes after review require a fresh review or documented revalidation. A green CI run is not a substitute for independent review.

## Reviewer evidence and severity

Provide exact base/head SHA, original diff, acceptance criteria, relevant source and README/SECURITY policies, real test output/CI links, and the reviewer identity. The author's summary is secondary evidence. Prioritize: (1) misleading effective-permission/security claims, (2) false negatives, unknown-to-allow fallthrough and exit-code/schema drift, (3) untrusted Git, script execution, credential leakage and fork/supply-chain risk, (4) circular test oracles and misleading consumer evidence, (5) package CLI/TypeScript compatibility and scope creep.

Each finding needs severity, file/location, affected invariant, concrete reproduction or evidence, proposed remediation/regression test, and a clear distinction between verified defects and hypotheses. High-severity correctness, security, supply-chain and compatibility findings block acceptance; medium findings require disposition and a tracked follow-up. Record the reviewed full head SHA and reassess after material changes.

RuleWitness review focus:

- Validate the independent permission oracle and supported-versus-unknown behavior, including fail-closed uncertainty and exit-code precedence.
- Check report schema and package compatibility, installed CLI consumers and provider-conformance limits.
- Confirm analyzed hooks and commands never execute, Git operations remain read-only, and reports/logs do not disclose private permission data.

No reviewer may silently merge, deploy, publish or weaken security settings without explicit maintainer authorization.
