import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import test from 'node:test';

import 'express-async-errors';

import { createApiKeyGuard } from '../../src/api/guards/auth.guard';
import { createInstanceExistsGuard, createInstanceLoggedGuard } from '../../src/api/guards/instance.guard';
import { WebhookController } from '../../src/api/integrations/event/webhook/webhook.controller';
import { WebhookRouter } from '../../src/api/integrations/event/webhook/webhook.router';
import { WebsocketRouter } from '../../src/api/integrations/event/websocket/websocket.router';
import { MetaRouter } from '../../src/api/integrations/channel/meta/meta.router';
import { PusherRouter } from '../../src/api/integrations/event/pusher/pusher.router';
import { InstanceRouter } from '../../src/api/routes/instance.router';
import { MessageRouter } from '../../src/api/routes/sendMessage.router';
import express, { RequestHandler } from 'express';
import { validate } from 'jsonschema';
import jwt from 'jsonwebtoken';

const GLOBAL_API_KEY = 'contract-global-api-key';
const INSTANCE_TOKEN = 'contract-instance-token';

type ContractApp = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
};

async function withContractApp(
  mountPath: string,
  router: express.Router,
  execute: (app: ContractApp) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error?.status || 500).json({
      status: error?.status || 500,
      error: error?.error || 'Internal Server Error',
      response: { message: error?.message || error || 'Internal Server Error' },
    });
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

function createGuards(instanceNames: string[] = ['alpha']): RequestHandler[] {
  const instances = new Map(instanceNames.map((name) => [name, { name, token: INSTANCE_TOKEN }]));

  const configService: any = {
    get: (key: string) => {
      if (key === 'AUTHENTICATION') return { API_KEY: { KEY: GLOBAL_API_KEY } };
      if (key === 'DATABASE') return { SAVE_DATA: { INSTANCE: true } };
      if (key === 'CACHE') return { REDIS: { ENABLED: false, SAVE_INSTANCES: false } };
      return {};
    },
  };
  const prismaRepository: any = {
    instance: {
      findUnique: async ({ where }: any) => instances.get(where.name) || null,
      findFirst: async ({ where }: any) => [...instances.values()].find((instance) => instance.token === where.token) || null,
      findMany: async ({ where }: any) => (instances.has(where.name) ? [instances.get(where.name)] : []),
    },
  };
  const waMonitor: any = { waInstances: {} };
  const cache: any = { has: async () => false };
  const dependencies = { cache, configService, prismaRepository, waMonitor };

  return [
    createInstanceExistsGuard(dependencies),
    createInstanceLoggedGuard(dependencies),
    createApiKeyGuard({ configService, prismaRepository }),
  ];
}

test('instance contract rejects missing and invalid API keys, then keeps route identity on create', async () => {
  const createdInstances: any[] = [];
  const router = new InstanceRouter(
    {} as any,
    {
      createInstance: async (instance: any) => {
        createdInstances.push(instance);
        return { instanceName: instance.instanceName, status: 'created' };
      },
    } as any,
    ...createGuards(),
  ).router;

  const payload = {
    instanceId: 'attacker-selected-id',
    instanceName: 'contract-instance',
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  };

  await withContractApp('/instance', router, async ({ request }) => {
    const missingKey = await request('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(missingKey.status, 401);

    const invalidKey = await request('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: 'invalid-key' },
      body: JSON.stringify(payload),
    });
    assert.equal(invalidKey.status, 401);

    const created = await request('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: GLOBAL_API_KEY },
      body: JSON.stringify(payload),
    });
    if (created.status !== 201) {
      assert.fail(await created.text());
    }
    assert.deepEqual(await created.json(), { instanceName: 'contract-instance', status: 'created' });
  });

  assert.deepEqual(createdInstances, [
    {
      instanceName: 'contract-instance',
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    },
  ]);
});

test('message contract authenticates the route instance and validates text payloads before dispatch', async () => {
  const calls: any[] = [];
  const router = new MessageRouter(
    {
      sendText: async (instance: any, data: any) => {
        calls.push({ instance, data });
        return { accepted: true, number: data.number, text: data.text, linkPreview: data.linkPreview };
      },
    } as any,
    ...createGuards(),
  ).router;

  await withContractApp('/message', router, async ({ request }) => {
    const unauthorized = await request('/sendText/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: '5511999999999', text: 'should not dispatch' }),
    });
    assert.equal(unauthorized.status, 401);

    const invalidPayload = await request('/sendText/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ text: 'number is required' }),
    });
    if (invalidPayload.status !== 400) {
      assert.fail(await invalidPayload.text());
    }

    const accepted = await request('/sendText/alpha?instanceName=other-instance&instanceId=other-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({
        instanceName: 'another-instance',
        instanceId: 'attacker-id',
        number: '5511999999999',
        text: 'contract message',
        linkPreview: true,
      }),
    });
    assert.equal(accepted.status, 201);
    assert.deepEqual(await accepted.json(), {
      accepted: true,
      number: '5511999999999',
      text: 'contract message',
      linkPreview: true,
    });
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].instance, { instanceName: 'alpha' });
  assert.equal(calls[0].data.number, '5511999999999');
  assert.equal(calls[0].data.text, 'contract message');
  assert.equal(calls[0].data.linkPreview, true);
});

test('instance lifecycle contract preserves the route identity for state, presence and lifecycle operations', async () => {
  const calls: { method: string; instance: any; data?: any; key?: string }[] = [];
  const router = new InstanceRouter(
    {} as any,
    {
      connectToWhatsapp: async (instance: any) => {
        calls.push({ method: 'connect', instance });
        return { state: 'connecting' };
      },
      connectionState: async (instance: any) => {
        calls.push({ method: 'connectionState', instance });
        return { instanceName: instance.instanceName, state: 'open' };
      },
      createInstance: async () => ({}) as any,
      deleteInstance: async (instance: any) => {
        calls.push({ method: 'delete', instance });
        return { deleted: true };
      },
      fetchInstances: async (instance: any, key: string) => {
        calls.push({ method: 'fetchInstances', instance, key });
        return [{ instanceName: 'alpha' }];
      },
      logout: async (instance: any) => {
        calls.push({ method: 'logout', instance });
        return { loggedOut: true };
      },
      restartInstance: async (instance: any) => {
        calls.push({ method: 'restart', instance });
        return { restarted: true };
      },
      setPresence: async (instance: any, data: any) => {
        calls.push({ method: 'setPresence', instance, data });
        return { presence: data.presence };
      },
    } as any,
    ...createGuards(),
  ).router;

  await withContractApp('/instance', router, async ({ request }) => {
    const state = await request('/connectionState/alpha?instanceName=other-instance', {
      headers: { apikey: INSTANCE_TOKEN },
    });
    assert.equal(state.status, 200);
    assert.deepEqual(await state.json(), { instanceName: 'alpha', state: 'open' });

    const presence = await request('/setPresence/alpha?instanceId=attacker-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ instanceName: 'other-instance', presence: 'composing' }),
    });
    assert.equal(presence.status, 201);
    assert.deepEqual(await presence.json(), { presence: 'composing' });

    const restart = await request('/restart/alpha', {
      method: 'POST',
      headers: { apikey: INSTANCE_TOKEN },
    });
    assert.equal(restart.status, 200);
    assert.deepEqual(await restart.json(), { restarted: true });

    const logout = await request('/logout/alpha', {
      method: 'DELETE',
      headers: { apikey: INSTANCE_TOKEN },
    });
    assert.equal(logout.status, 200);
    assert.deepEqual(await logout.json(), { loggedOut: true });

    const fetchInstances = await request('/fetchInstances', {
      headers: { apikey: INSTANCE_TOKEN },
    });
    assert.equal(fetchInstances.status, 200);
    assert.deepEqual(await fetchInstances.json(), [{ instanceName: 'alpha' }]);
  });

  assert.deepEqual(
    calls.map(({ method, instance }) => ({ method, instance })),
    [
      { method: 'connectionState', instance: { instanceName: 'alpha' } },
      { method: 'setPresence', instance: { instanceName: 'alpha' } },
      { method: 'restart', instance: { instanceName: 'alpha' } },
      { method: 'logout', instance: { instanceName: 'alpha' } },
      { method: 'fetchInstances', instance: {} },
    ],
  );
  assert.equal(calls[1].data.instanceName, 'other-instance');
  assert.equal(calls[1].data.presence, 'composing');
  assert.equal(calls[4].key, INSTANCE_TOKEN);
});

test('media and interactive message contracts validate inputs and dispatch only to the route instance', async () => {
  const calls: { method: string; instance: any; data: any }[] = [];
  const record = (method: string) => async (instance: any, data: any) => {
    calls.push({ method, instance, data });
    return { method, routeInstance: instance.instanceName };
  };
  const router = new MessageRouter(
    {
      sendMedia: record('media'),
      sendPoll: record('poll'),
      sendReaction: record('reaction'),
      sendSticker: record('sticker'),
      sendWhatsAppAudio: record('audio'),
    } as any,
    ...createGuards(),
  ).router;

  await withContractApp('/message', router, async ({ request }) => {
    const invalidMedia = await request('/sendMedia/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ number: '5511999999999' }),
    });
    assert.equal(invalidMedia.status, 400);

    const media = await request('/sendMedia/alpha?instanceName=other-instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({
        instanceId: 'attacker-id',
        mediatype: 'image',
        media: 'data:image/png;base64,AA==',
        number: '5511999999999',
      }),
    });
    assert.equal(media.status, 201);
    assert.deepEqual(await media.json(), { method: 'media', routeInstance: 'alpha' });

    const audio = await request('/sendWhatsAppAudio/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ audio: 'data:audio/ogg;base64,AA==', number: '5511999999999' }),
    });
    assert.equal(audio.status, 201);

    const sticker = await request('/sendSticker/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ number: '5511999999999', sticker: 'data:image/webp;base64,AA==' }),
    });
    assert.equal(sticker.status, 201);

    const reaction = await request('/sendReaction/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ key: { fromMe: false, id: 'message-id', remoteJid: '5511999999999@s.whatsapp.net' }, reaction: '👍' }),
    });
    assert.equal(reaction.status, 201);

    const poll = await request('/sendPoll/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ name: 'Select one', number: '5511999999999', selectableCount: 1, values: ['A', 'B'] }),
    });
    assert.equal(poll.status, 201);
  });

  assert.deepEqual(
    calls.map(({ method, instance }) => ({ method, instance })),
    [
      { method: 'media', instance: { instanceName: 'alpha' } },
      { method: 'audio', instance: { instanceName: 'alpha' } },
      { method: 'sticker', instance: { instanceName: 'alpha' } },
      { method: 'reaction', instance: { instanceName: 'alpha' } },
      { method: 'poll', instance: { instanceName: 'alpha' } },
    ],
  );
});

test('webhook configuration contract requires authentication and preserves route identity', async () => {
  const calls: any[] = [];
  const router = new WebhookRouter(
    {} as any,
    {
      webhook: {
        set: async (instanceName: string, data: any) => {
          calls.push({ instanceName, data });
          return { enabled: data.webhook.enabled, instanceName, url: data.webhook.url };
        },
      },
    } as any,
    ...createGuards(),
  ).router;

  await withContractApp('/webhook', router, async ({ request }) => {
    const missingKey = await request('/set/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook: { enabled: true, url: 'https://hooks.example.test/events', events: [] } }),
    });
    assert.equal(missingKey.status, 401);

    const invalidUrl = await request('/set/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ webhook: { enabled: true, url: 'file:///etc/passwd', events: [] } }),
    });
    assert.equal(invalidUrl.status, 400);

    const configured = await request('/set/alpha?instanceName=other-instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: 'https://hooks.example.test/events',
          events: ['MESSAGES_UPSERT'],
          byEvents: true,
        },
      }),
    });
    if (configured.status !== 201) {
      assert.fail(await configured.text());
    }
    assert.deepEqual(await configured.json(), {
      enabled: true,
      instanceName: 'alpha',
      url: 'https://hooks.example.test/events',
    });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].instanceName, 'alpha');
  assert.deepEqual(calls[0].data.webhook.events, ['MESSAGES_UPSERT']);
});

test('Meta webhook verification requires a configured matching token', async () => {
  const controller = { receiveWebhook: async () => ({ status: 'success' }) };
  const createRouter = (token: string) =>
    new MetaRouter(
      { get: (key: string) => (key === 'WA_BUSINESS' ? { TOKEN_WEBHOOK: token } : {}) } as any,
      controller,
    ).router;

  await withContractApp('', createRouter(''), async ({ request }) => {
    const missingConfiguration = await request('/webhook/meta?hub.challenge=untrusted-challenge');
    assert.equal(missingConfiguration.status, 403);
  });

  await withContractApp('', createRouter('configured-token'), async ({ request }) => {
    const mismatchedToken = await request('/webhook/meta?hub.verify_token=wrong&hub.challenge=untrusted-challenge');
    assert.equal(mismatchedToken.status, 403);

    const verified = await request('/webhook/meta?hub.verify_token=configured-token&hub.challenge=trusted-challenge');
    assert.equal(verified.status, 200);
    assert.equal(await verified.text(), 'trusted-challenge');
  });
});

test('event sink configuration contracts validate event lists and preserve route identity', async () => {
  const calls: any[] = [];
  const router = new WebsocketRouter(
    {
      set: async (instanceName: string, data: any) => {
        calls.push({ instanceName, data });
        return { enabled: data.websocket.enabled, events: data.websocket.events, instanceName };
      },
      get: async (instanceName: string) => ({ enabled: true, events: ['MESSAGES_UPSERT'], instanceName }),
    },
    ...createGuards(),
  ).router;

  await withContractApp('/websocket', router, async ({ request }) => {
    const unauthorized = await request('/set/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websocket: { enabled: true, events: [] } }),
    });
    assert.equal(unauthorized.status, 401);

    const invalidEvent = await request('/set/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ websocket: { enabled: true, events: ['UNKNOWN_EVENT'] } }),
    });
    assert.equal(invalidEvent.status, 400);

    const configured = await request('/set/alpha?instanceName=other-instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ websocket: { enabled: true, events: [] } }),
    });
    assert.equal(configured.status, 201);
    assert.deepEqual(await configured.json(), { enabled: true, events: [], instanceName: 'alpha' });

    const found = await request('/find/alpha', {
      headers: { apikey: INSTANCE_TOKEN },
    });
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), { enabled: true, events: ['MESSAGES_UPSERT'], instanceName: 'alpha' });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].instanceName, 'alpha');
});

test('Pusher configuration contract requires credentials and preserves the route instance', async () => {
  const calls: any[] = [];
  const router = new PusherRouter(
    {
      set: async (instanceName: string, data: any) => {
        calls.push({ instanceName, data });
        return { enabled: data.pusher.enabled, instanceName };
      },
      get: async (instanceName: string) => ({ enabled: true, instanceName }),
    },
    ...createGuards(),
  ).router;

  await withContractApp('/pusher', router, async ({ request }) => {
    const invalid = await request('/set/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({ pusher: { enabled: true } }),
    });
    assert.equal(invalid.status, 400);

    const configured = await request('/set/alpha?instanceName=other-instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: INSTANCE_TOKEN },
      body: JSON.stringify({
        pusher: {
          appId: 'contract-app',
          cluster: 'mt1',
          enabled: true,
          events: ['MESSAGES_UPSERT'],
          key: 'contract-key',
          secret: 'contract-secret',
          useTLS: true,
        },
      }),
    });
    assert.equal(configured.status, 201);
    assert.deepEqual(await configured.json(), { enabled: true, instanceName: 'alpha' });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].instanceName, 'alpha');
  assert.equal(calls[0].data.pusher.cluster, 'mt1');
});

type RecordedWebhook = {
  body: any;
  headers: IncomingMessage['headers'];
  url: string | undefined;
};

async function withWebhookReceiver(
  handler: (request: IncomingMessage, response: ServerResponse, attempt: number) => void,
  execute: (baseUrl: string, received: RecordedWebhook[]) => Promise<void>,
) {
  const received: RecordedWebhook[] = [];
  let attempts = 0;
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      attempts++;
      received.push({ body: JSON.parse(body), headers: request.headers, url: request.url });
      handler(request, response, attempts);
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.notEqual(typeof address, 'string');

  try {
    await execute(`http://127.0.0.1:${address.port}`, received);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function createWebhookController(webhook: any, resolveWebhookHost?: (url: string) => Promise<string>) {
  const configService: any = {
    get: (key: string) => {
      if (key === 'WEBHOOK') {
        return {
          EVENTS: {},
          GLOBAL: { ENABLED: false, URL: '', WEBHOOK_BY_EVENTS: false },
          REQUEST: { TIMEOUT_MS: 1000 },
          RETRY: {
            MAX_ATTEMPTS: 2,
            INITIAL_DELAY_SECONDS: 0,
            USE_EXPONENTIAL_BACKOFF: false,
            MAX_DELAY_SECONDS: 0,
            JITTER_FACTOR: 0,
            NON_RETRYABLE_STATUS_CODES: [400, 401, 403, 404, 422],
          },
        };
      }
      if (key === 'LOG') return { LEVEL: [] };
      return {};
    },
  };
  const prismaRepository: any = {
    webhook: {
      findUnique: async () => webhook,
      upsert: async ({ create }: any) => create,
    },
  };
  const monitor: any = { waInstances: { alpha: { instanceId: 'alpha-id' } } };

  return new WebhookController(prismaRepository, monitor, configService, resolveWebhookHost);
}

test('webhook delivery contract appends event path, signs JWT headers and retries retryable failures', async () => {
  await withWebhookReceiver(
    (_request, response, attempt) => {
      response.statusCode = attempt === 1 ? 500 : 204;
      response.end();
    },
    async (baseUrl, received) => {
      const controller = createWebhookController(
        {
          enabled: true,
          events: ['MESSAGES_UPSERT'],
          headers: { 'x-contract-test': 'enabled', jwt_key: 'local-test-signing-key' },
          url: `${baseUrl}/webhook`,
          webhookByEvents: true,
        },
        async () => '127.0.0.1',
      );

      await controller.emit({
        apiKey: 'event-api-key',
        data: { id: 'message-123' },
        dateTime: '2026-10-25T00:00:00.000Z',
        event: 'MESSAGES_UPSERT',
        instanceName: 'alpha',
        local: true,
        origin: 'ContractTest',
        sender: 'contract-test',
        serverUrl: 'https://api.example.test',
      });

      assert.equal(received.length, 2);
      assert.equal(received[0].url, '/webhook/messages-upsert');
      assert.equal(received[0].headers['x-contract-test'], 'enabled');
      assert.equal(received[0].headers.jwt_key, undefined);
      assert.match(received[0].headers.authorization || '', /^Bearer [\w.-]+$/);
      assert.equal(
        jwt.verify((received[0].headers.authorization || '').replace('Bearer ', ''), 'local-test-signing-key').app,
        'nova-era-api',
      );
      assert.deepEqual(received[0].body, {
        event: 'MESSAGES_UPSERT',
        instance: 'alpha',
        data: { id: 'message-123' },
        destination: `${baseUrl}/webhook`,
        date_time: '2026-10-25T00:00:00.000Z',
        sender: 'contract-test',
        server_url: 'https://api.example.test',
        apikey: 'event-api-key',
      });
    },
  );
});

test('webhook delivery does not retry a configured non-retryable HTTP response', async () => {
  await withWebhookReceiver(
    (_request, response) => {
      response.statusCode = 422;
      response.end();
    },
    async (baseUrl, received) => {
      const controller = createWebhookController(
        {
          enabled: true,
          events: ['MESSAGES_UPSERT'],
          headers: {},
          url: baseUrl,
          webhookByEvents: false,
        },
        async () => '127.0.0.1',
      );

      await controller.emit({
        data: { id: 'invalid-message-123' },
        dateTime: '2026-10-25T00:00:00.000Z',
        event: 'MESSAGES_UPSERT',
        instanceName: 'alpha',
        local: true,
        origin: 'ContractTest',
        sender: 'contract-test',
        serverUrl: 'https://api.example.test',
      });

      assert.equal(received.length, 1);
      assert.equal(received[0].url, '/');
    },
  );
});

test('webhook delivery blocks loopback destinations before any HTTP request is made', async () => {
  await withWebhookReceiver(
    (_request, response) => {
      response.statusCode = 204;
      response.end();
    },
    async (baseUrl, received) => {
      const controller = createWebhookController({
        enabled: true,
        events: ['MESSAGES_UPSERT'],
        headers: {},
        url: baseUrl,
        webhookByEvents: false,
      });

      await controller.emit({
        data: { id: 'blocked-message-123' },
        dateTime: '2026-10-25T00:00:00.000Z',
        event: 'MESSAGES_UPSERT',
        instanceName: 'alpha',
        local: true,
        origin: 'ContractTest',
        sender: 'contract-test',
        serverUrl: 'https://api.example.test',
      });

      assert.equal(received.length, 0);
    },
  );
});
