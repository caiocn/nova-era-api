# Nova Era API Roadmap

This roadmap is directional. It does not make release commitments or assert legal clearance.

## Foundation

- [x] Preserve upstream history through the `2.3.7` base commit.
- [x] Configure `upstream` and create `community-main` locally.
- [x] Remove the unverified embedded Manager distribution and upstream protected visual assets.
- [x] Create foundation documentation, governance templates and local CI definitions.
- [ ] Complete legal review of upstream additional licence conditions, dependency notices and Nova Era API name.

## `0.1.0-alpha.1`

- [ ] Validate the Docker Compose startup flow on a clean host.
- [ ] Validate PostgreSQL and Redis persistence with non-production data.
- [ ] Exercise a documented set of API contract tests.
- [ ] Define public repository organization, security address and container registry names.
- [ ] Review `npm audit` findings and establish triage decisions.
- [x] Establish a prioritized runtime vulnerability triage and remediation plan.

## `0.2.0-alpha.1` — breaking cutover

- [x] Approve the no-alias migration design for the legacy channel, bot, routes and Prisma schema. See [breaking migration design](docs/operations/NOVA_ERA_BREAKING_MIGRATION.md).
- [x] Rename legacy channel and bot modules, integration value and public routes to Nova Era API identifiers.
- [x] Add and rehearse PostgreSQL/MySQL migrations that rename bot tables, constraints, instance integration values and integration-session types.
- [x] Publish the `0.2.0-alpha.1` breaking-change and rollback runbook after isolated data-copy validation. See [runbook](docs/operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md).

## Beta

- Contract-test priority instance, message, webhook and authentication flows.
- Publish a supported migration path from the selected upstream base.
- Test Baileys reconnection and session recovery with authorized test accounts.
- Establish release signing, SBOM and dependency update automation.

## Release candidate

- Complete compatibility matrix for supported endpoints and event payloads.
- Publish operator backup/restore and upgrade runbooks.
- Complete a security review of multi-tenant authorization and webhook delivery.

## `1.0.0`

- Stabilize documented contracts and supported deployment combinations.
- Publish independent governance, release and support policies.

## Future

- Build an independently designed Nova Era Manager only after legal, accessibility and API requirements are approved.
- Add integration and compatibility regression coverage without requiring personal WhatsApp accounts in CI.
- Improve observability, backup automation and scale guidance.
