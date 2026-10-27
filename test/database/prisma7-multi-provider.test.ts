import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';

import { ConfigService } from '../../src/config/env.config';
import { PrismaRepository } from '../../src/api/repository/repository.service';

test('creates PostgreSQL driver adapter with custom connection pool defaults', () => {
  const adapter = new PrismaPg({
    connectionString: 'postgresql://postgres:test@localhost:5432/test?schema=public',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 300000,
  });

  assert.equal(typeof adapter, 'object');
  assert.equal(adapter.provider, 'postgres');
});

test('creates MariaDB driver adapter for MySQL database provider', () => {
  const adapter = new PrismaMariaDb('mysql://root:password@localhost:3306/test');

  assert.equal(typeof adapter, 'object');
  assert.equal(adapter.provider, 'mysql');
});

test('instantiates PrismaRepository without throwing when connection string is configured', () => {
  const previousProvider = process.env.DATABASE_PROVIDER;
  const previousUri = process.env.DATABASE_CONNECTION_URI;

  try {
    process.env.DATABASE_PROVIDER = 'postgresql';
    process.env.DATABASE_CONNECTION_URI = 'postgresql://postgres:test@localhost:5432/test?schema=public';

    const repo = new PrismaRepository(new ConfigService());
    assert.equal(typeof repo, 'object');
    assert.equal(typeof repo.$connect, 'function');
    assert.equal(typeof repo.$disconnect, 'function');
  } finally {
    process.env.DATABASE_PROVIDER = previousProvider;
    process.env.DATABASE_CONNECTION_URI = previousUri;
  }
});
