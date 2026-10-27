# Third-Party Dependency Licence Review

**Status:** `BLOCKED — preliminary technical inventory only; not a legal opinion or a complete SBOM.`

**Review date:** 2026-10-23

## Scope and method

The installed lockfile contains 1,123 package manifests; 60 are direct runtime dependencies. This review inspected package metadata, installed licence files where present, `npm explain`/`npm ls` dependency paths and the built Docker image package metadata.

It does not establish copyright ownership, validate all transitive package metadata, scan every native binary, or determine legal consequences of linking/aggregation. A release must use a reproducible SBOM and counsel-reviewed notice bundle generated from the exact release lockfile and image digest.

## Direct dependency summary

Most direct dependencies report permissive licences (MIT, Apache-2.0, BSD or ISC). Manual verification resolved `qrcode-terminal@0.12.0` as Apache-2.0 even though the lockfile metadata is `NOASSERTION`.

| Status | Direct dependencies / finding |
| --- | --- |
| Permissive metadata | AWS SDK, Prisma, Baileys, Express, Redis, Socket.IO, OpenAI, MinIO and most other direct packages. |
| Copyleft / binary attention | `@ffmpeg-installer/ffmpeg@1.1.0` reports LGPL-2.1 and installs a GPLv3 Linux binary on this platform. |
| Metadata clarification | `qrcode-terminal@0.12.0` has an Apache-2.0 `LICENSE` despite no singular `license` package field. |
| Further examination required | `exif-parser@0.1.12` reports `NOASSERTION`; obtain primary licence evidence. |

The complete direct dependency list at review time is available from `package-lock.json`; do not treat package metadata alone as definitive licensing evidence.

## High-risk runtime paths

### Baileys / libsignal

```text
nova-era-api
└─ baileys@7.0.0-rc.9 (MIT)
   └─ @whiskeysockets/libsignal-node@2.0.1 (GPL-3.0)
```

`npm explain @whiskeysockets/libsignal-node` identifies this as a runtime dependency of Baileys. The installed package’s `LICENSE` is GNU GPL v3. Baileys is imported throughout the WhatsApp channel implementation, so this is not an unused development-only package.

**Required counsel decision:** determine whether the Node module/native integration, source distribution, Docker distribution and any hosted offering create GPL obligations for the combined work in each intended jurisdiction. Do not label the derivative Apache-only or adopt an incompatible proprietary/community licence before that analysis.

### FFmpeg installer and binary

```text
nova-era-api
└─ @ffmpeg-installer/ffmpeg@1.1.0 (LGPL-2.1)
   └─ @ffmpeg-installer/linux-x64@4.1.0 (GPLv3 binary)
```

The application explicitly imports `@ffmpeg-installer/ffmpeg` in `whatsapp.baileys.service.ts`, uses `ffmpegPath.path` in `spawn()`, and configures `fluent-ffmpeg` with that path. The installed platform binary package declares GPLv3 and does not contain a licence text in its package contents.

**Required actions before public image distribution:**

1. Obtain authoritative licensing/source-offer information for the exact binary build.
2. Decide whether to remove the installer in favor of an operator-supplied FFmpeg binary, an audited package, or a separately documented distribution path.
3. Include all required licence/source notices in the exact image distribution if it remains.

### Alpine FFmpeg in Docker

The built image installs Alpine `ffmpeg@8.1.2-r0`; `apk info -a` reports `GPL-2.0-or-later AND LGPL-2.1-or-later`. It and its codec stack are shipped in the image.

**Required counsel/packaging decision:** determine the appropriate source, notice, attribution and image-distribution process. The project must not assume that copying only the application `LICENSE` resolves system package obligations.

### Other copyleft or uncertain transitive artifacts

| Component | Observed metadata | Path / concern |
| --- | --- | --- |
| `@img/sharp-libvips-linux-x64`, `linuxmusl-x64` | LGPL-3.0-or-later | Delivered native image-processing artifacts through `sharp@0.35.5`; confirm the exact `1.3.4` artifact notices/source obligations before publication. |
| `codec-parser@2.5.0` | LGPL-3.0-or-later | Runtime path through `audio-decode`. |
| `@ffmpeg-installer/linux-x64@4.1.0` | GPLv3 | Bundled executable described above. |

## Current notices and gaps

| Item | Current state | Gap |
| --- | --- | --- |
| Upstream Evolution source | `LICENSE` retained verbatim; `NOTICE` records provenance | Counsel must approve adequacy of placement and wording. |
| Baileys | Package contains MIT `LICENSE` | Add to generated third-party notice inventory. |
| libsignal | Package contains GPL-3.0 `LICENSE` | Resolve compatibility and corresponding-source obligations. |
| qrcode-terminal | Package contains Apache-2.0 `LICENSE` | Correctly capture in SBOM/notice generation. |
| FFmpeg installer binary | Package metadata declares GPLv3, no bundled licence text found | Block image publication pending vendor/source/notice solution. |
| Docker base/system packages | No project-level notice manifest | Generate image SBOM and associated attribution set. |

## Required release artefacts

Before publishing any source archive, image or package:

1. Lock dependencies with the intended Node/npm version.
2. Generate an SPDX or CycloneDX SBOM for application dependencies and Docker image packages.
3. Produce a reviewed `THIRD_PARTY_NOTICES` bundle from authoritative licences, not only package metadata.
4. Record image digest, base image digest, Alpine repository snapshot and package list.
5. Record every copyleft component’s source location, version, modification status and required offer/notice mechanism.
6. Have counsel approve the resulting source/image distribution workflow.

## Explicit non-decisions

This review does not state that dynamic linking, spawning a binary, container aggregation or network use does or does not trigger a particular copyleft obligation. Those questions depend on facts and jurisdiction and require qualified advice.
