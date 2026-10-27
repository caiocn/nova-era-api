import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';

import { InstanceRouter } from '../../src/api/routes/instance.router';
import { router as apiRouter } from '../../src/api/routes/index.router';
import { Integration } from '../../src/api/types/wa.types';
import express from 'express';

type ContractApp = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
};

async function requestFromApiRouter(path: string, init?: RequestInit): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.notEqual(typeof address, 'string');

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function withContractApp(
  router: express.Router,
  execute: (app: ContractApp) => Promise<void>,
  mountPath = '',
): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error?.status || 500).json({ error: error?.error, response: { message: error?.message } });
  });

  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.notEqual(typeof address, 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await execute({
      request: (path, init) => fetch(`${baseUrl}${mountPath}${path}`, init),
      close: async () => {
        server.close();
        await once(server, 'close');
      },
    });
  } finally {
    if (server.listening) {
      server.close();
      await once(server, 'close');
    }
  }
}

test('accepts NOVA_ERA and rejects the removed EVOLUTION instance integration', async () => {
  const createdInstances: any[] = [];
  const router = new InstanceRouter(
    {} as any,
    {
      createInstance: async (instance: any) => {
        createdInstances.push(instance);
        return { instanceName: instance.instanceName };
      },
    } as any,
  ).router;

  await withContractApp(router, async ({ request }) => {
    const legacy = await request('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName: 'legacy', integration: 'EVOLUTION' }),
    });
    assert.equal(legacy.status, 400);

    const novaEra = await request('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName: 'nova-era', integration: 'NOVA_ERA' }),
    });
    assert.equal(novaEra.status, 201);
  }, '/instance');

  assert.equal(Integration.NOVA_ERA, 'NOVA_ERA');
  assert.equal(Object.hasOwn(Integration, 'EVOLUTION'), false);
  assert.deepEqual(createdInstances, [{ instanceName: 'nova-era', integration: 'NOVA_ERA' }]);
});

test('mounts the Nova Era channel webhook and removes the legacy route', async () => {
  const novaEra = await requestFromApiRouter('/webhook/nova-era', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(novaEra.status, 200);

  const legacy = await requestFromApiRouter('/webhook/evolution', { method: 'POST' });
  assert.equal(legacy.status, 404);
});

test('mounts the Nova Era Bot route family and removes the legacy route', async () => {
  const novaEra = await requestFromApiRouter('/novaEraBot/fetch/bot-1/instance-1');
  assert.notEqual(novaEra.status, 404);

  const legacy = await requestFromApiRouter('/evolutionBot/fetch/bot-1/instance-1');
  assert.equal(legacy.status, 404);
});
