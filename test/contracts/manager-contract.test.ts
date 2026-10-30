import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';

import 'express-async-errors';

import { ManagerRouter } from '../../src/api/manager/manager.router';
import express from 'express';

const GLOBAL_API_KEY = 'manager-global-api-key';

type ContractApp = {
  getSessionSetCount: () => number;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
};

async function withManagerApp(
  execute: (app: ContractApp) => Promise<void>,
  managerSessionTtlSeconds = 900,
): Promise<void> {
  const sessions = new Map<string, any>();
  let sessionSetCount = 0;
  let chatwootSetCalls = 0;
  const app = express();
  app.use(express.json());
  app.use(
    '/manager-api',
    new ManagerRouter({
      cache: {
        delete: async (key: string) => sessions.delete(key),
        get: async (key: string) => sessions.get(key),
        set: async (key: string, value: any) => {
          sessionSetCount += 1;
          sessions.set(key, value);
        },
      } as any,
      configService: {
        get: (key: string) => {
          if (key === 'AUTHENTICATION') return { API_KEY: { KEY: GLOBAL_API_KEY } };
          if (key === 'MANAGER') return { COOKIE_SECURE: false, SESSION_TTL_SECONDS: managerSessionTtlSeconds };
          return {};
        },
      } as any,
      instanceController: {
        connectToWhatsapp: async ({ instanceName }: any) => ({ qrcode: { pairingCode: instanceName } }),
        connectionState: async ({ instanceName }: any) => ({ instance: { instanceName, state: 'open' } }),
        createInstance: async (instance: any) => {
          assert.equal(instance.token, undefined);
          return {
            hash: 'generated-instance-token',
            instance: {
              instanceId: 'created-instance-id',
              instanceName: instance.instanceName,
              integration: instance.integration,
              status: 'connecting',
            },
            qrcode: { pairingCode: '1234-5678' },
          };
        },
        deleteInstance: async ({ instanceName }: any) => ({ deleted: instanceName }),
        fetchInstances: async () => [
          {
            Chatwoot: { token: 'chatwoot-secret' },
            connectionStatus: 'open',
            id: 'instance-id',
            integration: 'WHATSAPP-BAILEYS',
            name: 'support',
            token: 'instance-secret',
            _count: { Chat: 1, Contact: 2, Message: 3 },
          },
        ],
        logout: async ({ instanceName }: any) => ({ loggedOut: instanceName }),
        restartInstance: async ({ instanceName }: any) => ({ restarted: instanceName }),
      } as any,
      chatwootController: {
        createChatwoot: async (instance: any, chatwoot: any) => {
          assert.equal(instance.instanceName, 'support');
          chatwootSetCalls += 1;
          assert.equal(chatwoot.token, chatwootSetCalls === 1 ? 'submitted-chatwoot-token' : 'stored-chatwoot-token');
          return { ...chatwoot, webhook_url: 'https://api.example.test/chatwoot/webhook/support' };
        },
        findChatwoot: async () => ({
          accountId: '1',
          enabled: true,
          token: 'stored-chatwoot-token',
          url: 'https://chatwoot.example.test',
          webhook_url: 'https://api.example.test/chatwoot/webhook/support',
        }),
      } as any,
      managerEnabled: true,
      proxyController: {
        createProxy: async (instance: any, proxy: any) => {
          assert.equal(instance.instanceName, 'support');
          assert.deepEqual(proxy, {
            enabled: true,
            host: 'proxy.example.test',
            password: 'existing-proxy-secret',
            port: '8080',
            protocol: 'http',
            username: 'existing-proxy-user',
          });
          return { proxy };
        },
        findProxy: async () => ({
          enabled: true,
          host: 'proxy.example.test',
          password: 'existing-proxy-secret',
          port: '8080',
          protocol: 'http',
          username: 'existing-proxy-user',
        }),
      } as any,
      eventManager: {
        webhook: {
          get: async () => ({
            enabled: true,
            events: ['MESSAGES_UPSERT'],
            headers: { Authorization: 'existing-webhook-secret' },
            url: 'https://hooks.example.test/messages',
            webhookBase64: false,
            webhookByEvents: true,
          }),
          set: async (instanceName: string, data: any) => {
            assert.equal(instanceName, 'support');
            assert.deepEqual(data, {
              webhook: {
                base64: false,
                byEvents: true,
                enabled: true,
                events: ['MESSAGES_UPSERT'],
                url: 'https://hooks.example.test/messages',
              },
            });
            return data.webhook;
          },
        },
      } as any,
      settingsController: {
        createSettings: async (_instance: any, settings: any) => {
          assert.deepEqual(settings, {
            alwaysOnline: true,
            groupsIgnore: false,
            msgCall: '',
            readMessages: false,
            readStatus: false,
            rejectCall: false,
            syncFullHistory: false,
            wavoipToken: 'server-only-wavoip-token',
          });
          return { settings };
        },
        findSettings: async () => ({
          alwaysOnline: false,
          groupsIgnore: false,
          msgCall: '',
          readMessages: false,
          readStatus: false,
          rejectCall: false,
          syncFullHistory: false,
          wavoipToken: 'server-only-wavoip-token',
        }),
      } as any,
    }).router,
  );
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error?.status || 500).json({ error: error?.error || 'Internal Server Error' });
  });

  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.notEqual(typeof address, 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await execute({
      getSessionSetCount: () => sessionSetCount,
      request: (path, init) => fetch(`${baseUrl}/manager-api${path}`, init),
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

test('Manager creates an HttpOnly session without returning the supplied API key', async () => {
  await withManagerApp(async ({ request }) => {
    const rejected = await request('/session', {
      body: JSON.stringify({ apiKey: 'invalid-key' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    assert.equal(rejected.status, 401);

    const authenticated = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    assert.equal(authenticated.status, 204);
    assert.match(authenticated.headers.get('set-cookie') || '', /HttpOnly/);
    assert.doesNotMatch(await authenticated.text(), new RegExp(GLOBAL_API_KEY));
  });
});

test('Manager renews a valid session cookie and server TTL on authenticated activity', async () => {
  await withManagerApp(
    async ({ getSessionSetCount, request }) => {
      const session = await request('/session', {
        body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';
      assert.match(session.headers.get('set-cookie') || '', /Max-Age=2592000/);
      assert.equal(getSessionSetCount(), 1);

      const renewed = await request('/instances', { headers: { Cookie: cookie } });
      assert.equal(renewed.status, 200);
      assert.match(renewed.headers.get('set-cookie') || '', /Max-Age=2592000/);
      assert.equal(getSessionSetCount(), 2);
    },
    60 * 60 * 24 * 30,
  );
});

test('Manager rate limits repeated failed sign-in attempts', async () => {
  await withManagerApp(async ({ request }) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rejected = await request('/session', {
        body: JSON.stringify({ apiKey: `invalid-key-${attempt}` }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      assert.equal(rejected.status, 401);
    }

    const limited = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    assert.equal(limited.status, 429);
    assert.notEqual(limited.headers.get('retry-after'), null);
  });
});

test('Manager exposes an authenticated, redacted instance inventory', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const response = await request('/instances', { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      instances: [
        {
          connectionStatus: 'open',
          counts: { chats: 1, contacts: 2, messages: 3 },
          id: 'instance-id',
          integration: 'WHATSAPP-BAILEYS',
          name: 'support',
        },
      ],
    });
  });
});

test('Manager creates a Baileys instance without disclosing its generated API token', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';
    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();

    const createInput = {
      instanceName: 'created-support',
      integration: 'WHATSAPP-BAILEYS',
      number: '5512981993942',
      token: 'attempted-client-token',
    };
    assert.equal(createInput.instanceName.length, 15);
    const response = await request('/instances', {
      body: JSON.stringify(createInput),
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'POST',
    });

    const payload = await response.json();
    assert.equal(response.status, 201, JSON.stringify(payload));
    assert.deepEqual(payload, {
      instance: {
        instanceId: 'created-instance-id',
        instanceName: 'created-support',
        integration: 'WHATSAPP-BAILEYS',
        status: 'connecting',
      },
      qrcode: { pairingCode: '1234-5678' },
    });
    assert.doesNotMatch(JSON.stringify(payload), /token/i);
  });
});

test('Manager rejects unsupported instance providers and incomplete Business API requests', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';
    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();
    const headers = { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken };

    const unsupported = await request('/instances', {
      body: JSON.stringify({ instanceName: 'unsupported-provider', integration: 'NOVA_ERA' }),
      headers,
      method: 'POST',
    });
    assert.equal(unsupported.status, 400);

    const incompleteBusiness = await request('/instances', {
      body: JSON.stringify({
        instanceName: 'business-provider',
        integration: 'WHATSAPP-BUSINESS',
        number: '5512981993942',
      }),
      headers,
      method: 'POST',
    });
    assert.equal(incompleteBusiness.status, 400);

    const unsafeName = await request('/instances', {
      body: JSON.stringify({ instanceName: 'unsafe name', integration: 'WHATSAPP-BAILEYS' }),
      headers,
      method: 'POST',
    });
    assert.equal(unsafeName.status, 400);
  });
});

test('Manager reads and updates instance settings without exposing protected WhatsApp credentials', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const current = await request('/instances/support/settings', { headers: { Cookie: cookie } });
    assert.equal(current.status, 200);
    assert.deepEqual(await current.json(), {
      settings: {
        alwaysOnline: false,
        groupsIgnore: false,
        msgCall: '',
        readMessages: false,
        readStatus: false,
        rejectCall: false,
        syncFullHistory: false,
      },
    });

    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();
    const updated = await request('/instances/support/settings', {
      body: JSON.stringify({ alwaysOnline: true, wavoipToken: 'browser-supplied-secret' }),
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    assert.equal(updated.status, 400);

    const accepted = await request('/instances/support/settings', {
      body: JSON.stringify({ alwaysOnline: true }),
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), {
      settings: {
        alwaysOnline: true,
        groupsIgnore: false,
        msgCall: '',
        readMessages: false,
        readStatus: false,
        rejectCall: false,
        syncFullHistory: false,
      },
    });
  });
});

test('Manager configures webhooks without disclosing existing custom headers', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const current = await request('/instances/support/webhook', { headers: { Cookie: cookie } });
    assert.equal(current.status, 200);
    const currentPayload = await current.json();
    assert.deepEqual(currentPayload, {
      webhook: {
        base64: false,
        byEvents: true,
        enabled: true,
        events: ['MESSAGES_UPSERT'],
        hasCustomHeaders: true,
        url: 'https://hooks.example.test/messages',
      },
    });
    assert.doesNotMatch(JSON.stringify(currentPayload), /existing-webhook-secret/);

    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();
    const headers = { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken };
    const updated = await request('/instances/support/webhook', {
      body: JSON.stringify({
        base64: false,
        byEvents: true,
        enabled: true,
        events: ['MESSAGES_UPSERT'],
        url: 'https://hooks.example.test/messages',
      }),
      headers,
      method: 'PUT',
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(await updated.json(), {
      webhook: {
        base64: false,
        byEvents: true,
        enabled: true,
        events: ['MESSAGES_UPSERT'],
        hasCustomHeaders: false,
        url: 'https://hooks.example.test/messages',
      },
    });

    const invalidEvent = await request('/instances/support/webhook', {
      body: JSON.stringify({
        base64: false,
        byEvents: false,
        enabled: true,
        events: ['NOT_A_REAL_EVENT'],
        url: 'https://hooks.example.test/messages',
      }),
      headers,
      method: 'PUT',
    });
    assert.equal(invalidEvent.status, 400);
  });
});

test('Manager configures a proxy without disclosing or accepting proxy credentials', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const current = await request('/instances/support/proxy', { headers: { Cookie: cookie } });
    assert.equal(current.status, 200);
    const currentPayload = await current.json();
    assert.deepEqual(currentPayload, {
      proxy: {
        enabled: true,
        hasCredentials: true,
        host: 'proxy.example.test',
        port: '8080',
        protocol: 'http',
      },
    });
    assert.doesNotMatch(JSON.stringify(currentPayload), /existing-proxy-(secret|user)/);

    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();
    const headers = { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken };
    const updated = await request('/instances/support/proxy', {
      body: JSON.stringify({ enabled: true, host: 'proxy.example.test', port: '8080', protocol: 'http' }),
      headers,
      method: 'PUT',
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(await updated.json(), {
      proxy: {
        enabled: true,
        hasCredentials: true,
        host: 'proxy.example.test',
        port: '8080',
        protocol: 'http',
      },
    });

    const unsafeCredentialInput = await request('/instances/support/proxy', {
      body: JSON.stringify({
        enabled: true,
        host: 'proxy.example.test',
        password: 'browser-secret',
        port: '8080',
        protocol: 'http',
      }),
      headers,
      method: 'PUT',
    });
    assert.equal(unsafeCredentialInput.status, 400);
  });
});

test('Manager returns redacted Chatwoot configuration and accepts an explicit credential update', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const current = await request('/instances/support/chatwoot', { headers: { Cookie: cookie } });
    assert.equal(current.status, 200);
    const currentPayload = await current.json();
    assert.deepEqual(currentPayload, {
      chatwoot: {
        accountId: '1',
        enabled: true,
        hasToken: true,
        url: 'https://chatwoot.example.test',
        webhookUrl: 'https://api.example.test/chatwoot/webhook/support',
      },
    });
    assert.doesNotMatch(JSON.stringify(currentPayload), /stored-chatwoot-token/);

    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();
    const updated = await request('/instances/support/chatwoot', {
      body: JSON.stringify({
        accountId: '1',
        enabled: true,
        token: 'submitted-chatwoot-token',
        url: 'https://chatwoot.example.test',
      }),
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    assert.equal(updated.status, 200);
    const updatedPayload = await updated.json();
    assert.equal(updatedPayload.chatwoot.hasToken, true);
    assert.doesNotMatch(JSON.stringify(updatedPayload), /submitted-chatwoot-token/);

    const preservedCredential = await request('/instances/support/chatwoot', {
      body: JSON.stringify({
        accountId: '1',
        enabled: true,
        url: 'https://chatwoot.example.test',
      }),
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    assert.equal(preservedCredential.status, 200);
    assert.equal((await preservedCredential.json()).chatwoot.hasToken, true);
  });
});

test('Manager requires CSRF confirmation for destructive instance actions', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';
    const sessionInfo = await request('/session', { headers: { Cookie: cookie } });
    const { csrfToken } = await sessionInfo.json();

    const missingCsrf = await request('/instances/support/logout', {
      headers: { Cookie: cookie },
      method: 'POST',
    });
    assert.equal(missingCsrf.status, 403);

    const logout = await request('/instances/support/logout', {
      headers: { Cookie: cookie, 'X-Manager-CSRF': csrfToken },
      method: 'POST',
    });
    assert.equal(logout.status, 200);
    assert.deepEqual(await logout.json(), { loggedOut: 'support' });
  });
});

test('Manager expiry removes the server session and rejects future requests', async () => {
  await withManagerApp(async ({ request }) => {
    const session = await request('/session', {
      body: JSON.stringify({ apiKey: GLOBAL_API_KEY }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const cookie = session.headers.get('set-cookie')?.split(';')[0] || '';

    const signedOut = await request('/session', { headers: { Cookie: cookie }, method: 'DELETE' });
    assert.equal(signedOut.status, 204);

    const inventory = await request('/instances', { headers: { Cookie: cookie } });
    assert.equal(inventory.status, 401);
  });
});
