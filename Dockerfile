FROM node:22-alpine AS builder

RUN apk update && \
    apk add --no-cache git ffmpeg wget curl bash openssl dos2unix

LABEL org.opencontainers.image.title="Nova Era API"
LABEL org.opencontainers.image.description="Self-hosted messaging API foundation for stability, compatibility and community-driven development."
LABEL org.opencontainers.image.source="https://github.com/SEU_USUARIO_OU_ORG/nova-era-api"

WORKDIR /nova-era

COPY ./package*.json ./
COPY ./LICENSE ./NOTICE ./
COPY ./tsconfig.json ./
COPY ./tsup.config.ts ./
COPY ./prisma.config.ts ./

RUN npm ci --legacy-peer-deps --silent

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./public ./public
COPY ./.env.example ./.env
COPY ./runWithProvider.js ./

COPY ./Docker ./Docker

RUN chmod +x ./Docker/scripts/* && dos2unix ./Docker/scripts/*

RUN ./Docker/scripts/generate_database.sh

RUN npm run build

FROM node:22-alpine AS final

RUN apk update && \
    apk add tzdata ffmpeg bash openssl

ENV TZ=America/Sao_Paulo
ENV DOCKER_ENV=true
ENV NODE_OPTIONS=--max-old-space-size=4096

WORKDIR /nova-era

COPY --from=builder /nova-era/package.json ./package.json
COPY --from=builder /nova-era/package-lock.json ./package-lock.json
COPY --from=builder /nova-era/LICENSE ./LICENSE
COPY --from=builder /nova-era/NOTICE ./NOTICE

COPY --from=builder /nova-era/node_modules ./node_modules
COPY --from=builder /nova-era/dist ./dist
COPY --from=builder /nova-era/prisma ./prisma
COPY --from=builder /nova-era/public ./public
COPY --from=builder /nova-era/.env ./.env
COPY --from=builder /nova-era/Docker ./Docker
COPY --from=builder /nova-era/runWithProvider.js ./runWithProvider.js
COPY --from=builder /nova-era/tsup.config.ts ./tsup.config.ts
COPY --from=builder /nova-era/prisma.config.ts ./prisma.config.ts

ENV DOCKER_ENV=true

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/bin/bash", "-c", ". ./Docker/scripts/deploy_database.sh && npm run start:prod" ]
