import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();

test('uses Nova Era API identifiers for external event and storage defaults', async () => {
  const [kafka, sqs, storage] = await Promise.all([
    readFile(join(rootDir, 'src', 'api', 'integrations', 'event', 'kafka', 'kafka.controller.ts'), 'utf8'),
    readFile(join(rootDir, 'src', 'api', 'integrations', 'event', 'sqs', 'sqs.controller.ts'), 'utf8'),
    readFile(join(rootDir, 'src', 'api', 'integrations', 'storage', 's3', 'libs', 'minio.server.ts'), 'utf8'),
  ]);

  assert.match(kafka, /'nova-era-api'/);
  assert.match(kafka, /'nova-era-api-consumers'/);
  assert.match(kafka, /'nova-era'/);
  assert.doesNotMatch(kafka, /'evolution-api'|'evolution-api-consumers'|'evolution'/);

  assert.match(sqs, /: 'nova-era';/);
  assert.doesNotMatch(sqs, /: 'evolution';/);

  assert.match(storage, /join\('nova-era-api', fileName\)/);
  assert.match(storage, /'custom-header-application'\] = 'nova-era-api'/);
  assert.doesNotMatch(storage, /evolution-api/);
});
