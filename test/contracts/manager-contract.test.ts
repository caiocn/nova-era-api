import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';

import 'express-async-errors';

import { ManagerRouter } from '../../src/api/manager/manager.router';
import express from 'express';

const GLOBAL_API_KEY = 'manager-global-api-key';

type ContractApp = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  close: () => Promise<void>;
};

async function withManagerApp(execute: (app: ContractApp) => Promise<void>): Promise<void> {
  const sessions = new Map<string, any>();
  const app = express();
  app.use(express.json());
  app.use(
    '/manager-api',
    new ManagerRouter({
      cache: {
        delete: async (key: string) => sessions.delete(key),
        get: async (key: string) => sessions.get(key),
        set: async (key: string, value: any) => sessions.set(key, value),
      } as any,
      configService: {
        get: (key: string) => {
          if (key === 'AUTHENTICATION') return { API_KEY: { KEY: GLOBAL_API_KEY } };
          if (key === 'MANAGER') return { COOKIE_SECURE: false, SESSION_TTL_SECONDS: 900 };
          return {};
        },
      } as any,
      instanceController: {
        connectToWhatsapp: async ({ instanceName }: any) => ({ qrcode: { pairingCode: instanceName } }),
        connectionState: async ({ instanceName }: any) => ({ instance: { instanceName, state: 'open' } }),
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
      managerEnabled: true,
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
