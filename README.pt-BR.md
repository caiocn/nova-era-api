<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/nova-era-api-logo-horizontal.webp">
    <img src="public/brand/nova-era-api-logo-monochrome-dark.webp" width="520" alt="Nova Era API">
  </picture>
</p>

# Nova Era API

> Plataforma self-hosted de API de mensagens multi-tenant, construída para estabilidade, segurança e governança comunitária independente.

<p align="center">
  <a href="README.md">🇺🇸 Read in English</a> |
  <strong>🇧🇷 Português</strong>
</p>

[![Node.js](https://img.shields.io/badge/node.js-v22%20LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-v5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/prisma-v7.10.1-5A67D8.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Apache%202.0-orange.svg)](LICENSE)

**Nova Era API** é uma solução de software livre (self-hosted) para comunicação via WhatsApp e integração de mensageria com chatbots, CRMs e plataformas de automação.

O projeto surge como um **fork independente derivado da Evolution API `2.3.7`** (commit `fa09d378`), mantendo total compatibilidade e transparência de proveniência com a base original, mas introduzindo modernização arquitetural profunda, segurança contra SSRF/CWE-639, eliminação de dependências legadas e governança própria comunitária.

---

## 🌟 Principais Recursos e Diferenciais

- **Multi-Tenant Nativo:** Isolamento estrito de instâncias por tenant com autenticação via `apikey` global e por instância.
- **Canal WhatsApp Baileys (Web):** Atualizado para `baileys@7.0.0-rc14` com `whatsapp-rust-bridge@0.5.5` para carregamento CommonJS robusto no Node 22 LTS.
- **WhatsApp Cloud API (Oficial):** Suporte nativo à API Cloud Oficial da Meta (Business API).
- **Nova Era Manager:** Console opcional de operação em `/manager/`, desenvolvido de forma independente, para status, conexão/QR, reinício, logout e exclusão de instâncias autenticadas. Não reutiliza código ou assets visuais do Manager upstream.
- **Segurança Reforçada:**
  - Mitigação contra CWE-639 (impedindo sobrescrita de identidade da instância via query ou body).
  - Prevenção ativa contra SSRF e DNS Rebinding em Link Previews e Webhooks (`safe-url-preview`).
  - Bloqueio de conexões a redes privadas RFC 1918, endereços de loopback e metadados de nuvem.
- **Pipeline de Imagem Modernizado:** Conversão de imagens nativa com **Sharp `0.35.5`** (libvips), substituindo dependências vulneráveis e limitando o processamento a tetos seguros contra DoS (40 megapixels).
- **Banco de Dados Multi-Provider (Prisma 7):**
  - Compatibilidade com PostgreSQL e MySQL através de driver adapters nativos (`@prisma/adapter-pg` e `@prisma/adapter-mariadb`).
  - Histórico de migrations preservado e novas migrations aditivas para cada provedor.
- **Ampla Gama de Integrações:**
  - **Chatbots e IAs:** NovaEraBot nativo, Chatwoot (cliente HTTP limpo e sem dependências vulneráveis), Typebot, Dify, Flowise, n8n, OpenAI (SDK v7) e EvoAI.
  - **Eventos e Mensageria:** Webhooks com retentativas inteligentes e assinatura JWT, WebSockets (Socket.io), RabbitMQ, Apache Kafka, AWS SQS, NATS e Pusher.
- **Observabilidade:** Métricas nativas para Prometheus (`/metrics`) com namespace padronizado `nova_era_api_*`.

---

## 📋 Pré-requisitos

- **Node.js:** `22.x LTS`
- **npm:** `10+`
- **Banco de Dados:** PostgreSQL `15+` (recomendado) ou MySQL `8.0+`
- **Cache:** Redis `7+` (opcional, para persistência distribuída de sessões)
- **Container:** Docker Engine e Docker Compose v2

---

## 🚀 Início Rápido com Docker Compose

A forma mais rápida de iniciar a plataforma completa (API, PostgreSQL e Redis) é via Docker Compose:

```bash
# 1. Clone o repositório
git clone https://github.com/caiocn/nova-era-api.git
cd nova-era-api

# 2. Configure o arquivo de ambiente
cp .env.example .env

# 3. Edite o .env configurando chaves seguras:
# - AUTHENTICATION_API_KEY
# - POSTGRES_PASSWORD

# 4. Inicie os containers
docker compose up --build -d

# 5. Verifique a saúde da aplicação
curl http://127.0.0.1:8080/health

# 6. Abra o console de operação
# http://127.0.0.1:8080/manager/
```

---

## 💻 Desenvolvimento Local

```bash
# Instalação de dependências
npm run ci

# Gerar clientes Prisma (ajustar DATABASE_PROVIDER conforme seu ambiente)
export DATABASE_PROVIDER=postgresql
npm run db:generate

# Iniciar servidor em modo desenvolvimento com hot-reload
npm run dev:server
```

### Comandos de Qualidade e Testes

```bash
# Executar a suíte de testes automatizados
npm test

# Verificação de linting
npm run lint:check

# Verificação estática de tipos
npx tsc --noEmit

# Build de produção
npm run build
```

---

## 📡 Exemplos Básicos de Uso da API

### 1. Healthcheck (Sem autenticação)
```bash
curl http://localhost:8080/health
```

### 2. Criar uma Instância WhatsApp (Baileys)
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: <SUA_CHAVE_GLOBAL>" \
  -d '{
    "instanceName": "atendimento",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

### 3. Consultar Estado da Conexão
```bash
curl -H "apikey: <SUA_CHAVE_GLOBAL>" \
  http://localhost:8080/instance/connectionState/atendimento
```

### 4. Enviar Mensagem de Texto
```bash
curl -X POST http://localhost:8080/message/sendText/atendimento \
  -H "Content-Type: application/json" \
  -H "apikey: <SUA_CHAVE_GLOBAL_OU_DA_INSTANCIA>" \
  -d '{
    "number": "5511999999999",
    "text": "Olá! Mensagem enviada via Nova Era API."
  }'
```

---

## 📖 Arquitetura e Documentação Técnica

- **[Proveniência e Análise da Base Upstream](docs/architecture/UPSTREAM_ANALYSIS.md)**
- **[Matriz de Compatibilidade com Evolution API](docs/compatibility/EVOLUTION_COMPATIBILITY.md)**
- **[Design do Corte Breaking e Migrações (0.2.0-alpha.1)](docs/operations/NOVA_ERA_BREAKING_MIGRATION.md)**
- **[Runbook Operacional de Migração](docs/operations/RUNBOOK_0.2.0_BREAKING_MIGRATION.md)**
- **[Estratégia de Manutenção do Baileys](docs/architecture/BAILEYS_MAINTENANCE.md)**
- **[Guia de Deployment com Docker](docs/deployment/DOCKER.md)**
- **[Migração de Métricas Prometheus](docs/operations/METRICS_MIGRATION.md)**
- **[Migração de Identificadores Externos (Kafka/SQS/S3)](docs/operations/EXTERNAL_IDENTIFIERS_MIGRATION.md)**

---

## ⚖️ Licença, Proveniência e Marcas Registradas

- **Licença:** Este software é distribuído sob os termos da licença **Apache License 2.0** com condições adicionais herdadas mantidas no arquivo [LICENSE](LICENSE).
- **Proveniência:** O projeto reconhece explicitamente que deriva da Evolution API versão `2.3.7`. A atribuição e os avisos legais completos estão detalhados em [NOTICE](NOTICE).
- **Marcas:** *Evolution API*, *Evolution Foundation* e marcas associadas são propriedades de seus respectivos titulares e são mencionadas aqui estritamente para fins descritivos de proveniência e compatibilidade técnica, sem qualquer intenção de afiliação ou endosso.
- **Isenção de Responsabilidade:** O uso do canal Baileys envolve a biblioteca não oficial de conexão ao protocolo WhatsApp Web. Os operadores são responsáveis pela observância dos termos de serviço da plataforma correspondente.
