import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();

test('builds the metrics image from the local Nova Era API image', async () => {
  const dockerfile = await readFile(join(rootDir, 'Dockerfile.metrics'), 'utf8');

  assert.match(dockerfile, /^FROM nova-era-api:local AS metrics$/m);
  assert.doesNotMatch(dockerfile, /evoapicloud\/evolution-api/i);
  assert.doesNotMatch(dockerfile, /\/evolution\b/i);
  assert.match(dockerfile, /^ENV PROMETHEUS_METRICS=true$/m);
});
