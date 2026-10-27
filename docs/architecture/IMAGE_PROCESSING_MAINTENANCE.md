# Image Processing Maintenance

## Decision

Nova Era API uses `sharp@0.35.5` as its only application image-processing dependency.

The previous direct `jimp@1.6.1` dependency was used solely for Chatwoot advertisement thumbnails. That path now uses Sharp. Baileys declares Jimp as an optional peer dependency, but dynamically prefers Sharp when available. The locked install is performed through `npm run ci` (`npm ci --legacy-peer-deps`) so that optional peer is not installed merely to satisfy Baileys.

This removes the Jimp package family from the production install without changing public message or Chatwoot API contracts.

## Processing boundary

`src/utils/image-processing.ts` owns the project image transforms:

| Use case | Output | Guardrails |
| --- | --- | --- |
| WhatsApp image send | JPEG | malformed input rejection; 40-megapixel ceiling; metadata stripped by Sharp defaults |
| Sticker conversion | WebP | malformed input rejection; 40-megapixel ceiling; animated GIF/WebP frames retained |
| Chatwoot advertisement thumbnail | `320×180` PNG cover crop | malformed input rejection; 40-megapixel ceiling |

The processing limit protects decode paths from extremely large image dimensions. It is not a complete upload-policy control: Multer file/field size limits and safe remote-media fetching remain separate security work.

## Validation record — 2026-10-25

The image regression suite generates fixtures in memory and verifies:

1. PNG → JPEG conversion, dimensions and metadata stripping;
2. still-image → WebP sticker conversion;
3. two-frame GIF → animated WebP conversion with frame delays preserved;
4. landscape cover crop → `320×180` PNG thumbnail;
5. Baileys thumbnail extraction selects Sharp while Jimp is absent from the application dependency set;
6. malformed input and a generated image over the 40-megapixel limit are rejected.

The production dependency audit after `npm run ci` reports `0 critical`, `11 high` and `18 moderate` findings. It no longer reports Sharp, Jimp or the Jimp plugin packages. The local Node 22 build and the Alpine Docker image load Sharp `0.35.5` with libvips `8.18.7`.

## Pending validation

The persistent authorized WhatsApp test environment validated the following on 2026-10-25:

- a PNG image sent through `sendMedia` was received correctly;
- a static PNG converted through `sendSticker` was received correctly;
- a generated two-frame GIF converted through `sendSticker` was received as an animated sticker.

The API returned message identifiers for all three sends and the service logs had no matching media-processing, disconnect or session errors. No phone number, message identifier, QR image, image payload, or credential is recorded in the repository.

Chatwoot thumbnail handling still requires an authorized staging Chatwoot integration test. Do not claim either flow is validated by the in-memory fixtures alone.

## Update policy

- Keep Sharp pinned to an explicitly tested release because it bundles native artifacts.
- Update the image tests and run a Docker build whenever Sharp or its libvips package changes.
- Do not re-add Jimp as a direct dependency unless a specific compatibility need cannot be met with Sharp and its security/license impact is reviewed.
- Preserve the separate legal review for Sharp/libvips distribution artifacts in `docs/legal/THIRD_PARTY_LICENSE_REVIEW.md`.
