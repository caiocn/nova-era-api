# Security Policy

## Supported versions

The current pre-release is `v0.2.0-alpha.1`. Security fixes are provided on the `main` branch on a best-effort basis; this alpha is not a stability or compatibility guarantee.

## Report vulnerabilities privately

Do **not** open a public issue for a suspected vulnerability. Until a dedicated security address is configured, use the repository host's private vulnerability-reporting feature. If that feature is unavailable, contact the repository owner through a private channel and request an encrypted reporting address.

Do not send production API keys, WhatsApp session credentials, customer content or unredacted database dumps in a report.

## Include

- A concise impact statement.
- A minimal, authorized reproduction.
- Affected version/commit and deployment context.
- Redacted logs and relevant configuration names (not values).
- Suggested remediation, if known.

## Handling target

Maintainers aim to acknowledge a report within 7 calendar days, assess severity privately, coordinate a fix and disclose after users have a reasonable remediation window. These are targets, not guarantees for an alpha project.

## Scope

Core HTTP authorization, instance isolation, session persistence, webhook handling, Docker distribution and project-maintained CI are in scope. Third-party services and dependencies may be coordinated with their maintainers, but report the Nova Era API impact first when a project integration is affected.
