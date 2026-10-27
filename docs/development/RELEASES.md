# Release Policy

## Scope

Nova Era API uses independent Semantic Versioning. Upstream tags are provenance references, not Nova Era API release numbers.

| Stage | Meaning |
| --- | --- |
| `0.1.0-alpha.N` | Incomplete foundation; limited validation and no production claim. |
| `0.1.0-beta.N` | Feature/compatibility validation in progress; upgrade notes required. |
| `0.1.0-rc.N` | Candidate for the initial preliminary release; only stabilizing changes expected. |
| `0.1.0` | Initial preliminary public release after documented acceptance checks. |
| `1.0.0` | First stable contract commitment. |

## Release checklist

1. Confirm legal review of upstream terms, notices, dependencies and branding remains current.
2. Record the upstream base/commits incorporated since the last Nova Era API release.
3. Update `package.json`, `CHANGELOG.md`, compatibility and migration documentation.
4. Run locked installation, Prisma generation, tests, lint, build, dependency audit and Docker build.
5. Run Compose and authorized channel/integration validation when the release claims them.
6. Review the generated diff for secrets, protected upstream assets and unintentional contract changes.
7. Obtain maintainer approval before creating a tag, release or image.
8. Publish an immutable release note with rollback and upgrade instructions.

## Publication policy

Branch pushes and pull requests must never publish containers or releases. Publishing to GitHub Releases, npm or a container registry is a separate maintainer-approved action after the checklist passes. `ghcr.io/<owner-or-org>/nova-era-api` remains a placeholder until a lowercase owner is assigned.

## Branch protection recommendations

When the remote repository exists, protect `community-main` with:

- pull requests only; no direct pushes;
- at least one approving maintainer review;
- required CI, Docker build and security checks;
- conversation resolution before merge;
- no force pushes or branch deletions;
- restricted release/tag creation permissions.

These are recommendations only; this local foundation does not alter remote GitHub settings.
