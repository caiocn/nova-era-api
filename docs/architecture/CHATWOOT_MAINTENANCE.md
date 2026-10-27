# Chatwoot Client Maintenance

## Decision

Nova Era API replaces `@figuro/chatwoot-sdk` with a small internal client at `src/api/integrations/chatbot/chatwoot/libs/chatwoot.client.ts`.

The package's latest published release (`1.1.17`) embeds `axios@0.27.2`. Its upstream `master` branch was also checked during this remediation and still declares `axios@^0.27.2`; therefore, waiting for an upstream package release does not currently remove the vulnerability. A package-manager override was rejected because it would alter an unmaintained SDK's transitive HTTP implementation without an owned compatibility boundary.

This is a **replacement**, not a private fork: the project owns only the small adapter surface it uses and relies on the already direct, audited `axios@1.20.0` dependency.

## Compatibility boundary

The replacement preserves the Chatwoot endpoints and payload shapes used by the existing integration:

- contacts: create, update, search/filter and list conversations;
- inboxes: list and create;
- conversations: create, fetch and change status;
- messages: create multipart messages and delete messages;
- the custom contact-filter, contact-merge and `update_last_seen` requests.

Existing HTTP routes, Chatwoot configuration DTOs, stored integration configuration and webhook payload contracts are unchanged. The client still sends both `Authorization: Bearer` and `api_access_token`, matching the previous SDK behavior.

## Security properties

- Custom API paths must be relative; an absolute path is rejected before a request is made.
- Requests do not follow redirects (`maxRedirects: 0`) to prevent a configured Chatwoot server from redirecting credentials to another origin.
- Non-success responses become `ChatwootApiError`, preserving the status and response body required by existing error handling.
- Multipart messages are constructed with `form-data`; JSON requests explicitly use `application/json`.

The configured Chatwoot base URL and token are administrator-controlled configuration, but a compromised or misconfigured Chatwoot endpoint remains an outbound-trust boundary. Operators should use HTTPS and restrict the endpoint to their approved Chatwoot deployment. The existing direct Axios media-fetch and multipart-upload paths in `ChatwootService` are outside this replacement boundary and need a separate outbound URL/redirect hardening review.

## Validation record — 2026-10-25

1. Built the latest available Figuro SDK source with Axios `0.27.2`, `0.30.2` and `1.20.0`; its generated request implementation compiled unchanged with Axios `1.20.0`.
2. Exercised the old SDK's request behavior against a local HTTP fixture for JSON requests, query parameters, authorization and error mapping.
3. Added project regression tests for the replacement against a local HTTP fixture covering JSON, multipart attachments, authorization headers, error mapping, relative-path enforcement and redirect rejection.
4. Removed `@figuro/chatwoot-sdk` and its nested `axios@0.27.2` from the production lockfile.
5. Final `npm audit --omit=dev` snapshot: `0 critical`, `42 high`, `19 moderate`; `@figuro/chatwoot-sdk` and `axios` are absent from reported vulnerabilities.

The replacement has **not** been tested against a real Chatwoot deployment in this change. Before declaring Chatwoot supported for a release, validate an authorized staging account for inbox creation, contact/conversation creation, inbound/outbound text, attachment upload, message deletion, read receipts and webhook handling.

## Ownership and update policy

- Keep the adapter constrained to the endpoints used by `ChatwootService`; do not restore a broad generated SDK merely for convenience.
- Add a fixture test before adding an endpoint or changing request serialization.
- Track Chatwoot API changes independently from the deprecated Figuro SDK.
- Reassess URL, redirect and outbound-network policy whenever the Chatwoot integration gains user-controlled destinations.
