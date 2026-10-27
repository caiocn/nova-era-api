# Legal and Distribution Review

**Status:** `BLOCKED — no public source release, Docker image publication, package publication, or paid distribution until qualified legal counsel approves the listed gates.`

**Review date:** 2026-10-26

**Scope:** technical evidence and issue spotting for the Nova Era API foundation. This document is **not legal advice**, does not interpret enforceability, and is not a licence clearance opinion.

## Executive conclusion

The selected upstream source can be inspected and attributed, but its public redistribution path is not clear enough to approve. The foundation must not be represented as a legally cleared open-source project:

1. The selected upstream `LICENSE` is not a plain Apache-2.0 grant. It adds commercial-licence triggers, a usage-notification condition and a contributor condition that the producer may adjust the agreement. The effect, enforceability, scope, notice placement and interaction with downstream licensing must be reviewed by counsel.
2. The locked runtime graph contains GPL-3.0 components through the Baileys stack and a GPLv3 FFmpeg binary through a direct dependency. The Docker image also contains an Alpine FFmpeg package carrying `GPL-2.0-or-later AND LGPL-2.1-or-later`. Compatibility with the upstream terms and the intended source/image distribution model is unresolved.
3. The `Nova Era API` name has only received preliminary web discovery. No official registry clearance, domain clearance, company-name search or counsel similarity analysis has been completed.
4. The selected upstream Manager and protected visual assets remain removed. An independently authored Nova Era Manager is shipped from source, but the broader source/image distribution and trademark gates still require legal review.

**Do not replace the current `LICENSE`, assert “Apache-2.0”, call the project legally open-source, use the name in a public launch, or publish a container until the required review is signed off.**

## Evidence baseline

| Evidence | Result |
| --- | --- |
| Selected source | Evolution API tag `2.3.7`, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370` |
| Selected upstream `LICENSE` | SHA-256 `72b40bc1042b8b029d4937f095554cae346211cf095d88a4a7c104f32e0e4735` |
| Repository `LICENSE` | Byte-identical to the selected upstream `LICENSE` |
| Selected upstream `NOTICE` | None at tag `2.3.7` |
| Later upstream policy reviewed | `2.4.0-rc2` `LICENSE`, `NOTICE` and `TRADEMARKS.md`; evidence only, not adopted as the base licence |
| Manager state at selected tag | Upstream Manager gitlink at `f054b9bc28083152d4948f835e3346fd0add39db`; compiled `manager/dist` assets also existed |
| Foundation action | Manager submodule/artifacts and upstream visual assets removed; an independently authored Manager is shipped from source |
| Docker image | Includes repository `LICENSE` and `NOTICE` under `/nova-era/` |

The historical evolution of upstream licensing is relevant: the repository history records changes in August and October 2024, including removal of a former multi-tenant condition and addition of the usage-notification condition. It demonstrates that the upstream text changed over time; it does not establish that future changes can alter rights already granted for the selected commit. Counsel must assess that question.

## Upstream licence conditions requiring counsel review

The selected source presents itself as “Apache License 2.0, with the following additional conditions.” The relevant non-standard statements are summarized below; consult the verbatim [`LICENSE`](../../LICENSE), not this summary.

| Upstream statement | Foundation fact | Required determination |
| --- | --- | --- |
| Commercial licence may be required if a frontend logo/copyright is removed or modified. | The embedded frontend and its assets were removed rather than rebranded. | Does removing the frontend from a derivative distribution satisfy the condition? Does the source/API itself trigger another restriction? |
| A project using Evolution API must visibly notify system administrators through documentation/settings, with commercial-licence consequences for non-compliance. | `NOTICE`, README and image filesystem retain attribution; there is no Manager/settings UI. | Does the retained notice satisfy the obligation for source, image and each operator deployment? What exact text/placement is required? |
| Contributors “should agree” that the producer can adjust the open-source agreement. | Nova Era API contributors have not agreed to a new upstream CLA. | Is this a binding contribution/licence term? Could it affect future contributions or the selected upstream grant? |
| Apache-2.0 section 6 does not grant trademark rights except customary origin description. | Upstream marks are used only nominatively in provenance/compatibility text. | Confirm that current wording, package metadata and public positioning avoid implied affiliation. |

### Operational mitigation already applied

- Upstream `LICENSE` is retained verbatim and included in the Docker image.
- `NOTICE` records provenance and nominative trademark use.
- Modified upstream files carry a change notice where touched.
- The embedded upstream Manager, upstream logos, wordmarks and visual assets are not shipped.
- The Nova Era Manager is independently authored, uses Nova Era assets, and keeps the API key out of browser storage through a short-lived HttpOnly server session.
- README avoids claims of affiliation, authorization, legal availability or production readiness.

These are compliance-oriented mitigations only. They do **not** resolve the legal questions above.

## Later upstream trademark evidence

The later upstream `2.4.0-rc2` policy claims `Evolution Foundation`, `Evolution`, `Evolution API`, the upstream wordmark/logo and specified visual identity as protected. It permits truthful descriptive references but says modified user interfaces must remove/replace its branding and must not imply endorsement.

The foundation follows the conservative part of that policy by not shipping the upstream Manager or visual assets. Because the policy post-dates the selected tag and legal effect may vary, it is recorded as risk evidence rather than treated as the selected source licence.

## Third-party distribution blockers

See [THIRD_PARTY_LICENSE_REVIEW.md](THIRD_PARTY_LICENSE_REVIEW.md) for dependency-level evidence. The highest-priority unresolved paths are:

| Component/path | Observed licence | Why it blocks release review |
| --- | --- | --- |
| `baileys@7.0.0-rc.9` → `@whiskeysockets/libsignal-node@2.0.1` | MIT → GPL-3.0 | Runtime JavaScript/native dependency relationship needs a distribution and compatibility determination. |
| `@ffmpeg-installer/ffmpeg@1.1.0` → `@ffmpeg-installer/linux-x64@4.1.0` | LGPL-2.1 → GPLv3 | The application imports the installer and executes the bundled binary directly. The binary package has no bundled licence file. |
| Alpine `ffmpeg@8.1.2-r0` in runtime image | `GPL-2.0-or-later AND LGPL-2.1-or-later` | The public image distributes it; source/notice obligations and build configuration require review. |
| `sharp` bundled libvips packages; `codec-parser` | LGPL-3.0-or-later | Review dynamic/static linkage and notice/source obligations for delivered artifacts. |
| `exif-parser@0.1.12` | `NOASSERTION` metadata | Obtain authoritative licence evidence or replace/remove it. |

## Name and trademark review

The name is **not cleared**.

### Preliminary discovery performed

- Exact-term web searches for `"Nova Era API"` returned unrelated/non-decisive uses, including location-based SEO pages where “Nova Era” identifies a municipality rather than the source of an API.
- No authoritative result was found through generic web/NPM search that proves the name is free or unavailable.
- The official Brazilian INPI guide says a search is recommended and supports word, process-number and applicant searches. The INPI search service can be accessed anonymously.
- Official search resources were identified for INPI/TMview, WIPO Global Brand Database, EUIPO eSearch and USPTO Trademark Search.

Web discovery is not trademark clearance. The official registry interfaces are interactive and a search result needs class, owner, status, territorial and similarity analysis by a qualified professional.

### Required clearance plan

1. Search exact terms: `NOVA ERA API`, `NOVAERA API`, `NOVA-ERA API`, `NOVA ERA`, `NOVAERA` and `NOVA-ERA`.
2. Search phonetic, visual and conceptual variants in Portuguese and English, including `NOVA ERA` with software, messaging, WhatsApp, communication, chatbot and API-related terms.
3. Search at least Nice classes 9 (downloadable software) and 42 (SaaS/software development); counsel should determine whether class 38 or others apply to the communications offering.
4. Query Brazil (INPI), TMview/EUIPO, WIPO Madrid data and USPTO for intended markets; record query, date, database, result, owner, class and legal status.
5. Check company/DBA names, domains, GitHub organization/repository, package registries and social handles in intended territories.
6. Obtain counsel’s similarity/confusion opinion and filing strategy before announcement, domain purchase campaign, registry publication or public release under the new identity.

### Authoritative search resources

- Brazil INPI guide and mark search: <https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico> and <https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_num_processo.jsp>
- TMview: <https://www.tmdn.org/tmview/#/tmview>
- WIPO Global Brand Database: <https://www.wipo.int/en/web/global-brand-database>
- EUIPO eSearch: <https://euipo.europa.eu/eSearch/>
- USPTO Trademark Search: <https://tmsearch.uspto.gov/>

## Required legal sign-off

Before any public distribution, counsel must issue a written conclusion addressing each item:

- [ ] Copyright ownership/provenance of the selected upstream commit and relevant contributions.
- [ ] Whether the selected upstream licence permits the planned source, binary and container distributions.
- [ ] Meaning, enforceability and operational satisfaction of every additional upstream condition.
- [ ] Whether Nova Era API-owned changes can be licensed separately and, if so, under which compatible terms.
- [ ] GPL/LGPL/copyleft obligations and compatibility for Node modules, native dependencies and Alpine image packages.
- [ ] Required third-party notices, corresponding-source offers, SBOM and source-delivery process.
- [ ] Whether `Evolution API` references and provenance wording are nominative and non-confusing in every planned market.
- [ ] Trademark clearance and filing strategy for `Nova Era API`.
- [ ] WhatsApp/Meta contractual and platform-policy review for the intended product and marketing claims.

## Decision record

Until all sign-off items are resolved, the project may be developed and tested locally under controlled access but is **not approved for public release, hosted service, registry publication, commercial offer or public Manager distribution**.
