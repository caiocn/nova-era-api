import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { getDefaultChatwootBotAvatarUrl } from '../../src/api/integrations/chatbot/chatwoot/services/chatwoot.service';
import { ConfigService } from '../../src/config/env.config';

const rootDir = process.cwd();
const brandDirectory = join(rootDir, 'public', 'brand');

const webpAssets = [
  'nova-era-api-favicon.webp',
  'nova-era-api-logo-horizontal.webp',
  'nova-era-api-logo-square.webp',
  'nova-era-api-logo-monochrome-dark.webp',
  'nova-era-api-logo-monochrome-light.webp',
];

test('ships the Nova Era API brand asset variants through the public directory', async () => {
  for (const asset of webpAssets) {
    const assetPath = join(brandDirectory, asset);
    assert.equal((await stat(assetPath)).isFile(), true, `${asset} must be a regular file`);

    const signature = await readFile(assetPath);
    assert.equal(signature.subarray(0, 4).toString('ascii'), 'RIFF', `${asset} must be a RIFF image`);
    assert.equal(signature.subarray(8, 12).toString('ascii'), 'WEBP', `${asset} must be a WebP image`);
  }
});

test('ships a browser-compatible favicon and includes independently developed Manager assets in the runtime image', async () => {
  const favicon = await readFile(join(rootDir, 'public', 'favicon.ico'));
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);

  const dockerfile = await readFile(join(rootDir, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /^COPY \.\/public \.\/public$/m);
  assert.match(dockerfile, /^COPY \.\/manager \.\/manager$/m);

  const managerHtml = await readFile(join(rootDir, 'manager', 'index.html'), 'utf8');
  assert.match(managerHtml, /Nova Era API Manager/);
  assert.doesNotMatch(managerHtml, /Evolution Manager/i);
  assert.doesNotMatch(managerHtml, /evolution-api\.com/i);
});

test('uses the local Nova Era API icon as the default Chatwoot bot avatar', async () => {
  assert.equal(
    getDefaultChatwootBotAvatarUrl('https://api.example.test/nested/path'),
    'https://api.example.test/brand/nova-era-api-favicon.webp',
  );
});

test('uses Nova Era identifiers for newly configured infrastructure', () => {
  const environmentKeys = [
    'SERVER_NAME',
    'DATABASE_CONNECTION_CLIENT_NAME',
    'CACHE_REDIS_PREFIX_KEY',
    'KAFKA_CLIENT_ID',
    'KAFKA_CONSUMER_GROUP_ID',
    'KAFKA_TOPIC_PREFIX',
    'WA_BUSINESS_TOKEN_WEBHOOK',
    'SQS_GLOBAL_PREFIX_NAME',
  ] as const;
  const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

  try {
    delete process.env.SERVER_NAME;
    delete process.env.DATABASE_CONNECTION_CLIENT_NAME;
    delete process.env.CACHE_REDIS_PREFIX_KEY;
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_CONSUMER_GROUP_ID;
    delete process.env.KAFKA_TOPIC_PREFIX;
    delete process.env.WA_BUSINESS_TOKEN_WEBHOOK;
    delete process.env.SQS_GLOBAL_PREFIX_NAME;

    const config = new ConfigService();
    assert.equal(config.get<any>('SERVER').NAME, 'nova-era-api');
    assert.equal(config.get<any>('DATABASE').CONNECTION.CLIENT_NAME, 'nova-era');
    assert.equal(config.get<any>('CACHE').REDIS.PREFIX_KEY, 'nova-era-cache');
    assert.equal(config.get<any>('KAFKA').CLIENT_ID, 'nova-era-api');
    assert.equal(config.get<any>('KAFKA').CONSUMER_GROUP_ID, 'nova-era-api-consumers');
    assert.equal(config.get<any>('KAFKA').TOPIC_PREFIX, 'nova-era');
    assert.equal(config.get<any>('WA_BUSINESS').TOKEN_WEBHOOK, '');
    assert.equal(config.get<any>('SQS').GLOBAL_PREFIX_NAME, 'nova-era');
  } finally {
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnvironment[key];
      }
    }
  }
});

test('uses the Nova Era API package identity', async () => {
  const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, 'nova-era-api');
  assert.equal(packageJson.repository.url, 'https://github.com/caiocn/nova-era-api.git');
});

test('uses Nova Era API as the health service identity', async () => {
  const healthRoute = await readFile(join(rootDir, 'src', 'api', 'routes', 'health.ts'), 'utf8');
  assert.match(healthRoute, /service: 'nova-era-api'/);
});

test('documents that Nova Era API identity assets remain provisional', async () => {
  const notice = await readFile(join(rootDir, 'NOTICE'), 'utf8');
  const nameClearance = await readFile(join(rootDir, 'docs', 'legal', 'NAME_CLEARANCE.md'), 'utf8');

  assert.match(notice, /Nova Era API” name is provisional pending independent trademark and domain\s+clearance/i);
  assert.match(nameClearance, /Do not announce, market, file package metadata with a final public owner/i);
  assert.match(nameClearance, /artwork.*not evidence of trademark availability/i);
});
