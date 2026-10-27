import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();

const legacyMetrics = [
  'evolution_environment_info',
  'evolution_instances_total',
  'evolution_instance_up',
  'evolution_instance_state',
];

const novaEraMetrics = [
  'nova_era_api_environment_info',
  'nova_era_api_instances_total',
  'nova_era_api_instance_up',
  'nova_era_api_instance_state',
];

test('uses Nova Era API names for Prometheus metrics', async () => {
  const router = await readFile(join(rootDir, 'src', 'api', 'routes', 'index.router.ts'), 'utf8');

  for (const metric of novaEraMetrics) {
    assert.match(router, new RegExp(metric));
  }

  for (const metric of legacyMetrics) {
    assert.doesNotMatch(router, new RegExp(metric));
  }
});

test('ships Nova Era API Prometheus and Grafana examples without legacy metric names', async () => {
  const prometheus = await readFile(join(rootDir, 'prometheus.yml.example'), 'utf8');
  const grafana = await readFile(join(rootDir, 'grafana-dashboard.json.example'), 'utf8');

  assert.match(prometheus, /job_name: 'nova-era-api'/);
  assert.match(prometheus, /nova_era_api_instance_up/);
  assert.match(grafana, /Nova Era API Monitoring/);
  assert.match(grafana, /up\{job=\\"nova-era-api\\"\}/);

  for (const metric of legacyMetrics) {
    assert.doesNotMatch(prometheus, new RegExp(metric));
    assert.doesNotMatch(grafana, new RegExp(metric));
  }
});
