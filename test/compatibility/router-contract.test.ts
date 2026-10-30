import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';

import { createHealthResponse } from '../../src/api/routes/health';
import { isCorsOriginAllowed } from '../../src/utils/cors-origin';
import { sanitizeInstanceCreateInput, sanitizeInstanceInput } from '../../src/utils/protected-instance-input';

test('does not allow request input to override the route instance identity', () => {
  const input = sanitizeInstanceInput({
    instanceId: 'victim-id',
    instanceName: 'victim-instance',
    page: '2',
  });

  assert.deepEqual(input, { page: '2' });
});

test('keeps the requested instance name while rejecting client-assigned IDs during instance creation', () => {
  const input = sanitizeInstanceCreateInput({
    instanceId: 'attacker-selected-id',
    instanceName: 'authorized-test-device',
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });

  assert.deepEqual(input, {
    instanceName: 'authorized-test-device',
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });
});

test('creates a deterministic health response without contacting WhatsApp', () => {
  assert.deepEqual(createHealthResponse('0.2.0-alpha.1'), {
    status: 200,
    service: 'nova-era-api',
    version: '0.2.0-alpha.1',
  });
});

test('allows non-browser requests when CORS uses explicit origins', () => {
  const allowedOrigins = ['https://console.example.test'];

  assert.equal(isCorsOriginAllowed(undefined, allowedOrigins), true);
  assert.equal(isCorsOriginAllowed('https://console.example.test', allowedOrigins), true);
  assert.equal(isCorsOriginAllowed('https://untrusted.example.test', allowedOrigins), false);
});

test('documents proxy trust for the secure Manager session deployment', () => {
  const main = readFileSync(join(process.cwd(), 'src', 'main.ts'), 'utf8');

  assert.match(main, /app\.set\('trust proxy', 1\)/);
});

test('pins the WhatsApp channel to the remediated Baileys release candidate', () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

  assert.equal(packageJson.dependencies.baileys, '7.0.0-rc14');
  assert.equal(packageJson.overrides['whatsapp-rust-bridge'], '0.5.5');
});
