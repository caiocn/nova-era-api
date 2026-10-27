# External Identifier Migration

## Breaking change

Nova Era API uses its own identifiers when producing data for external systems. Existing Kafka consumers, SQS consumers, webhook verifiers, S3/MinIO object references and Meta webhook setups must be updated as part of the deployment.

No legacy aliases are emitted. Keeping the prior identifiers would continue to expose the previous product identity and could cause two deployments to share external resources unintentionally.

| Integration | Previous default | New default |
| --- | --- | --- |
| Kafka client ID | `evolution-api` | `nova-era-api` |
| Kafka consumer group | `evolution-api-consumers` | `nova-era-api-consumers` |
| Kafka topic prefix | `evolution` | `nova-era` |
| SQS non-global message group | `evolution` | `nova-era` |
| SQS global queue prefix | `global` | `nova-era` |
| Webhook JWT `app` claim | `evolution` | `nova-era-api` |
| S3/MinIO object prefix | `evolution-api/` | `nova-era-api/` |
| S3/MinIO application metadata | `evolution-api` | `nova-era-api` |
| Meta webhook verification token | implicit `evolution` fallback | explicitly configured `WA_BUSINESS_TOKEN_WEBHOOK` only |

## Migration steps

1. Inventory enabled integrations and record the existing topic, queue, consumer-group, object-prefix and webhook verification settings.
2. Update Kafka consumers and ACLs to use the new client ID, group and `nova-era.*` topics. Preserve or archive old topics according to retention requirements.
3. Update SQS FIFO queue consumers for the new group and, when global events are enabled, create or subscribe to queues with the `nova-era` prefix.
4. Copy required S3/MinIO objects from `evolution-api/` to `nova-era-api/`, or retain the old objects until their presigned URLs and retention window expire. New uploads do not read from the former prefix.
5. Update webhook JWT verifiers to require `app: "nova-era-api"` and retain the existing signing-key validation. Instance webhook configurations must use their existing `jwt_key` header value to enable signed JWT delivery.
6. Configure a unique, secret `WA_BUSINESS_TOKEN_WEBHOOK` in the Meta app and deployment environment before verifying the Meta webhook. An empty token now rejects every verification request.
7. Deploy first in an isolated environment and verify representative Kafka, SQS, S3/MinIO, webhook and Meta flows with authorized credentials.

Environment variable names remain stable. Their documented values and application fallbacks changed for new Nova Era API deployments.
