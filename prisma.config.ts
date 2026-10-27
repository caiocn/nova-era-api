import 'dotenv/config';

import path from 'node:path';

import { defineConfig } from 'prisma/config';

// Prisma 7: a connection string saiu dos arquivos de schema e é configurada aqui.
// O schema e migrations são selecionados dinamicamente pelo DATABASE_PROVIDER
// para manter total compatibilidade com a arquitetura multi-provider do projeto.
const provider = (process.env.DATABASE_PROVIDER || 'postgresql').toLowerCase();

const schemaFile =
  provider === 'mysql'
    ? 'mysql-schema.prisma'
    : provider === 'psql_bouncer'
      ? 'psql_bouncer-schema.prisma'
      : 'postgresql-schema.prisma';

const defaultUrl =
  provider === 'mysql'
    ? 'mysql://root:password@localhost:3306/nova_era_api'
    : 'postgresql://nova_era:nova_era@localhost:5432/nova_era_api?schema=public';

export default defineConfig({
  schema: path.join('prisma', schemaFile),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_CONNECTION_URI || defaultUrl,
  },
});
