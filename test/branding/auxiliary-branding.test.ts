import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();

const auxiliaryFiles = [
  'Docker/kafka/docker-compose.yaml',
  'Docker/minio/docker-compose.yaml',
  'Docker/mysql/docker-compose.yaml',
  'Docker/postgres/docker-compose.yaml',
  'Docker/rabbitmq/docker-compose.yaml',
  'Docker/redis/docker-compose.yaml',
  'Extras/chatwoot/configurar_admin.json',
  'Extras/chatwoot/criador_de_empresas.json',
  'Extras/chatwoot/criador_de_inbox.json',
];

test('uses Nova Era API identifiers in auxiliary Docker and Chatwoot files', async () => {
  for (const file of auxiliaryFiles) {
    const content = await readFile(join(rootDir, file), 'utf8');
    assert.doesNotMatch(content, /revolution/i, `${file} must not use the previous project identity`);
    assert.doesNotMatch(content, /evolution/i, `${file} must not use the upstream project identity`);
  }

  const chatwootWorkflow = await readFile(join(rootDir, 'Extras/chatwoot/criador_de_inbox.json'), 'utf8');
  assert.match(chatwootWorkflow, /nova_era_api_url/);
  assert.match(chatwootWorkflow, /Nova Era API/);
});

test('does not retain the removed Manager gitlink in Docker build configuration', async () => {
  const dockerignore = await readFile(join(rootDir, '.dockerignore'), 'utf8');

  assert.doesNotMatch(dockerignore, /evolution-manager-v2/);
  assert.doesNotMatch(dockerignore, /nova-era-manager-v2/);
});

test('does not retain the upstream Manager gitlink in the repository index', async () => {
  await assert.rejects(stat(join(rootDir, 'evolution-manager-v2')));
});

test('describes Cursor rules as Nova Era API guidance without upstream endpoints', async () => {
  const cursorConfig = JSON.parse(await readFile(join(rootDir, '.cursor/rules/cursor.json'), 'utf8'));
  assert.match(cursorConfig.description, /Nova Era API/);
  assert.ok(cursorConfig.rules.nova_era_api);
  assert.equal(cursorConfig.rules.evolution_api, undefined);

  const files = [
    '.cursor/rules/core-development.mdc',
    '.cursor/rules/project-context.mdc',
    '.cursor/rules/README.md',
    '.cursor/rules/specialized-rules/util-rules.mdc',
  ];

  for (const file of files) {
    const content = await readFile(join(rootDir, file), 'utf8');
    assert.doesNotMatch(content, /Evolution API/i, `${file} must use the Nova Era API project identity`);
    assert.doesNotMatch(content, /evolution-api\.com/i, `${file} must not suggest an upstream endpoint`);
  }
});
