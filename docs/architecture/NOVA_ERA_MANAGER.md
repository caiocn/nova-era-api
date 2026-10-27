# Nova Era API Manager Proposal

## Current decision

**No Nova Era API Manager is shipped in this foundation.** The upstream embedded Manager artifacts, git submodule and protected visual assets were removed from the derivative distribution.

This decision keeps the API self-hosted and operational without a frontend dependency. Instances can be managed through existing API routes and compatible clients using an `apikey` header.

## Why the upstream Manager is not reused

- The selected base `2.3.7` contained a separate upstream Manager gitlink and compiled assets, but this audit did not verify a distributable licence for that component. The gitlink and assets are absent from this foundation.
- The selected upstream licence has frontend logo/copyright conditions.
- Later upstream policy identifies the Manager's visual identity as protected, and later release notes describe the Manager source repository as private.
- A prebuilt artifact is not a substitute for an independently auditable source distribution.

The upstream Manager may be available under circumstances not established here; this document does not decide its legal status. It simply prevents redistribution until a qualified review says otherwise.

## Future functional scope

An independently designed manager may later provide:

- Instance create/list/status/connect/logout/delete flows.
- QR and pairing-code display with safe expiry handling.
- Webhook/event and allowed integration configuration.
- Read-only operational status and redacted diagnostics.
- API configuration guidance without displaying persistent secrets.

## Proposed architecture

```text
Nova Era API Manager (separate repository/package)
  ├─ Static, independently branded web UI
  ├─ API client generated/maintained from documented Nova Era API contracts
  ├─ No embedded API key in assets or browser storage by default
  └─ Accessibility and security test suite
             │ HTTPS, operator-supplied endpoint
             ▼
Nova Era API
  ├─ Existing protected API routes and instance authorization
  ├─ Future scoped operator/session authentication (requires design approval)
  └─ Auditable configuration endpoints
```

## Preconditions before implementation

1. Legal review approves the product name, all new assets and coexistence language with upstream marks.
2. A stable API contract and versioning policy exist for manager-required endpoints.
3. An authentication model is designed and reviewed; browser storage of global API keys is not an acceptable default.
4. Threat model covers multi-tenant isolation, QR/session leakage, CORS, clickjacking and webhook secret exposure.
5. Accessibility requirements include keyboard flows, focus management, contrast and non-visual QR alternatives/instructions.
6. Source, licence, SBOM, build reproducibility and release ownership are established independently.

## Roadmap

- **Foundation:** API-only operation; documentation and compatibility testing.
- **Discovery:** operator interviews, API contract gaps and threat model.
- **Prototype:** independent design system and read-only status view against a mock API.
- **Alpha:** authenticated instance lifecycle with manual security review.
- **Beta:** QR/session lifecycle, webhooks and accessibility/security regression coverage.

## Operational dependency statement

The API does not depend on a Manager to start. Future manager functionality must remain optional and must not require proprietary upstream services.
