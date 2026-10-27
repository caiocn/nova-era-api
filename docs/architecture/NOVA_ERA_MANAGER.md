# Nova Era API Manager Proposal

## Current decision

**Nova Era API ships an independently developed, optional Manager.** The upstream embedded Manager artifacts, git submodule and protected visual assets remain removed from the derivative distribution.

The Manager is served by the API at `/manager/` when `SERVER_DISABLE_MANAGER=false`. It provides authenticated operational controls for instance inventory, state, connect/QR, restart, logout and deletion. The API remains independently operable without the Manager.

## Why the upstream Manager is not reused

- The selected base `2.3.7` contained a separate upstream Manager gitlink and compiled assets, but this audit did not verify a distributable licence for that component. The gitlink and assets are absent from this foundation.
- The selected upstream licence has frontend logo/copyright conditions.
- Later upstream policy identifies the Manager's visual identity as protected, and later release notes describe the Manager source repository as private.
- A prebuilt artifact is not a substitute for an independently auditable source distribution.

The upstream Manager may be available under circumstances not established here; this document does not decide its legal status. It simply prevents redistribution until a qualified review says otherwise.

## Current scope

- Instance creation for WhatsApp Web (Baileys) and official WhatsApp Business API, with server-side input validation and secret-redacted responses.
- Instance list and redacted operational counts.
- Connection state, connect/QR, restart, logout and delete flows.
- Operational settings for connection behavior, calls, read receipts, groups and history synchronization.
- Webhook destination, events and payload options, without exposing or accepting protected custom headers.
- Proxy enablement and endpoint configuration; stored proxy credentials remain protected and cannot be exposed or changed through the Manager.
- Server-side short-lived session created from the operator-supplied global API key.
- HttpOnly, `SameSite=Strict` session cookie and per-session CSRF token for state-changing actions.
- No global API key, instance token, Chatwoot token or integration credential is returned by the Manager API.

## Future functional scope

- Additional event transports and allowed integration configuration.
- Read-only operational diagnostics and API configuration guidance without displaying persistent secrets.

## Proposed architecture

```text
Nova Era API Manager (`manager/`)
  ├─ Static, independently branded HTML/CSS/JavaScript UI
  ├─ Served only when explicitly enabled
  ├─ No API key in assets, localStorage or sessionStorage
  └─ HttpOnly session + per-session CSRF token
             │ same-origin `/manager-api/*`
             ▼
Nova Era API
  ├─ Manager session endpoints validate the global API key server-side
  ├─ Existing instance controller handles operational actions
  └─ Manager responses redact credentials and sensitive integration fields
```

## Preconditions before implementation

1. Legal review approves the product name, all new assets and coexistence language with upstream marks.
2. Threat model review covers multi-tenant isolation, QR/session leakage, CORS, clickjacking and webhook secret exposure.
3. Accessibility testing covers keyboard flows, focus management, contrast and non-visual QR alternatives/instructions.
4. Source, licence, SBOM, build reproducibility and release ownership remain established independently.

## Roadmap

- **Foundation:** independent Manager instance operations with server-side sessions.
- **Alpha:** instance creation, QR/pairing lifecycle and manual security review.
- **Beta:** webhooks, integrations, accessibility and security regression coverage.

## Operational dependency statement

The API does not depend on a Manager to start. Future manager functionality must remain optional and must not require proprietary upstream services.
