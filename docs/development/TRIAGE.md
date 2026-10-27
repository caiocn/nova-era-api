# Bug Triage Procedure

## States

1. **New** — template complete; no sensitive data exposed.
2. **Needs reproduction** — maintainer cannot reproduce from current information.
3. **Confirmed** — impact, affected versions and minimal safe reproduction recorded.
4. **Needs decision** — scope, compatibility, security or legal trade-off requires maintainer direction.
5. **In progress** — linked branch/PR and regression test plan exist.
6. **Ready for verification** — fix has local validation evidence.
7. **Closed** — fixed, duplicate, cannot reproduce, declined or out of scope, with a clear state reason.

## Triage checklist

- Verify the report uses a Nova Era API version/commit and identify its upstream base.
- Remove/redact secrets, session files, phone identifiers and customer content.
- Classify: bug, security, documentation, compatibility, deployment or enhancement.
- Identify whether the issue crosses instance isolation, authentication, persistence, webhooks or external providers.
- Capture expected versus actual HTTP status/payload/event behavior.
- Link upstream reports/commits only as references; do not assume an upstream fix applies.
- For external integrations, use a mock or authorized test environment before requesting live credentials.

## Security escalation

If an issue suggests unauthorized access, credential disclosure, cross-instance data access, injection, webhook forgery or unsafe defaults, stop public triage and follow [SECURITY.md](../../SECURITY.md). Do not post exploit details in a public issue.

## Definition of ready for agent work

An implementation task should state: accepted behavior, non-goals, affected contracts, migration implications, testable acceptance criteria, relevant configuration and safe fixtures. Ambiguous work remains in **Needs decision**.
