<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/nova-era-api-logo-horizontal.webp">
    <img src="public/brand/nova-era-api-logo-monochrome-dark.webp" width="520" alt="Nova Era API">
  </picture>
</p>

# Nova Era API

> Self-hosted multi-tenant messaging API platform built for stability, security, and independent community governance.

<p align="center">
  <strong>🇺🇸 English</strong> |
  <a href="README.pt-BR.md">🇧🇷 Leia em Português</a>
</p>

[![Node.js](https://img.shields.io/badge/node.js-v22%20LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-v5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/prisma-v7.10.1-5A67D8.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Apache%202.0-orange.svg)](LICENSE)

**Nova Era API** is an open-source, self-hosted messaging platform for WhatsApp communication and messaging integration with chatbots, CRM platforms, and event brokers.

The project is an **independent fork derived from Evolution API `2.3.7`** (commit `fa09d378`). It maintains architectural compatibility and full provenance transparency with the original upstream base while introducing deep technical modernization, security hardening (mitigating SSRF and CWE-639), legacy dependency elimination, and independent community governance.

---

## 🌟 Key Features & Architecture

- **Native Multi-Tenancy:** Strict instance isolation per tenant, authenticated via global or per-instance `apikey` headers.
- **WhatsApp Web Channel (Baileys):** Upgraded to `baileys@7.0.0-rc14` with `whatsapp-rust-bridge@0.5.5` for stable CommonJS runtime execution on Node.js 22 LTS.
- **Official Meta Cloud API:** Native support for the official Meta WhatsApp Business Cloud API.
- **Enhanced Security & Hardening:**
  - **CWE-639 Mitigation:** Prevents query/body parameters from overriding route instance context during authenticated calls.
  - **SSRF & DNS Rebinding Protection:** Active defense on URL previews and webhook delivery (`safe-url-preview`), preventing loopback, RFC 1918 private IP, and cloud metadata access.
  - **Strict CORS Origin Matching:** Secure origin validation for browser and server-to-server traffic.
- **Modernized Image Pipeline:** Native media conversion using **Sharp `0.35.5`** (libvips), removing vulnerable dependencies (Jimp) and enforcing safe 40-megapixel processing ceilings against DoS attacks.
- **Multi-Provider Database Layer (Prisma 7):**
  - Powered by Prisma `7.10.1` with native PostgreSQL (`@prisma/adapter-pg`) and MySQL (`@prisma/adapter-mariadb`) driver adapters.
  - Retains upstream migration history while introducing provider-specific additive migrations.
- **Extensive Integrations Ecosystem:**
  - **Chatbots & AI:** Native NovaEraBot, clean Chatwoot HTTP client (free of legacy vulnerable Axios), Typebot, Dify, Flowise, n8n, OpenAI (SDK v7), and EvoAI.
  - **Events & Message Brokers:** Webhooks with intelligent retries and JWT signatures, WebSockets (Socket.io), RabbitMQ, Apache Kafka, AWS SQS, NATS, and Pusher.
- **Observabilidade:** Native Prometheus metrics (`/metrics`) under the standardized `nova_era_api_*` namespace.

---

## 📋 Prerequisites

- **Node.js:** `22.x LTS`
- **npm:** `10+`
- **Database:** PostgreSQL `15+` (recommended) or MySQL `8.0+`
- **Cache:** Redis `7+` (optional, for distributed caching/session storage)
- **Container:** Docker Engine and Docker Compose v2

---

## 🚀 Quick Start with Docker Compose

The fastest way to deploy the complete platform (API, PostgreSQL, and Redis) is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/caiocn/nova-era-api.git
cd nova-era-api

# 2. Configure environment variables
cp .env.example .env

# 3. Edit .env and set secure values:
# - AUTHENTICATION_API_KEY
# - POSTGRES_PASSWORD

# 4. Start the stack
docker compose up --build -d

# 5. Check service health
curl http://127.0.0.1:8080/health
```

---

## 💻 Local Development

```bash
# Install locked dependencies
npm run ci

# Generate Prisma client (set DATABASE_PROVIDER for your target database)
export DATABASE_PROVIDER=postgresql
npm run db:generate

# Start development server with hot-reload
npm run dev:server
```

### Quality Gates & Testing

```bash
# Run the automated test suite (59 passing tests)
npm test

# Run ESLint validation
npm run lint:check

# Run TypeScript type check
npx tsc --noEmit

# Production build
npm run build
```

---

## 📡 Basic API Usage

### 1. Healthcheck (Unauthenticated)
```bash
curl http://localhost:8080/health
```

### 2. Create a WhatsApp Instance (Baileys)
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: <YOUR_GLOBAL_API_KEY>" \
  -d '{
    "instanceName": "support",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

### 3. Check Instance Connection State
```bash
curl -H "apikey: <YOUR_GLOBAL_API_KEY>" \
  http://localhost:8080/instance/connectionState/support
```

### 4. Send a Text Message
```bash
curl -X POST http://localhost:8080/message/sendText/support \
  -H "Content-Type: application/json" \
  -H "apikey: <YOUR_GLOBAL_OR_INSTANCE_KEY>" \
  -d '{
    "number": "5511999999999",
    "text": "Hello! Sent via Nova Era API."
  }'
```

---

## 📖 Architecture & Technical Documentation

- **[Upstream Analysis & Provenance](docs/architecture/UPSTREAM_ANALYSIS.md)**
- **[Evolution API Compatibility Matrix](docs/compatibility/EVOLUTION_COMPATIBILITY.md)**
- **[Breaking Cutover Architecture (0.2.0-alpha.1)](docs/operations/NOVA_ERA_BREAKING_MIGRATION.md)**
- **[Operations & Upgrade Runbook](docs/operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md)**
- **[Baileys Maintenance Strategy](docs/architecture/BAILEYS_MAINTENANCE.md)**
- **[Docker Deployment Guide](docs/deployment/DOCKER.md)**
- **[Prometheus Metrics Migration Guide](docs/operations/METRICS_MIGRATION.md)**
- **[External Identifiers Migration Guide](docs/operations/EXTERNAL_IDENTIFIERS_MIGRATION.md)**

---

## ⚖️ License, Provenance & Trademarks

- **License:** Distributed under the **Apache License 2.0** with inherited additional conditions preserved in [LICENSE](LICENSE).
- **Provenance:** This project explicitly acknowledges that it derives from Evolution API version `2.3.7`. Complete legal notices and third-party attributions are documented in [NOTICE](NOTICE).
- **Trademarks:** *Evolution API*, *Evolution Foundation*, and related marks belong to their respective owners. They are referenced strictly for nominative, descriptive, and compatibility purposes, with no claim of affiliation or endorsement.
- **Platform Disclaimer:** The Baileys channel utilizes an unofficial library connecting to the WhatsApp Web protocol. Operators are solely responsible for compliance with platform policies and terms of service.
