import assert from 'node:assert/strict';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';

import {
  ChatwootApiError,
  ChatwootClient,
  request as chatwootRequest,
} from '../../src/api/integrations/chatbot/chatwoot/libs/chatwoot.client';

type RecordedRequest = {
  body: string;
  headers: IncomingMessage['headers'];
  method: string | undefined;
  url: string | undefined;
};

async function withServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  execute: (basePath: string) => Promise<void>,
) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  assert.notEqual(typeof address, 'string');

  try {
    await execute(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('uses the direct patched HTTP client for Chatwoot JSON and multipart requests', async () => {
  const requests: RecordedRequest[] = [];

  await withServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      requests.push({ body, headers: request.headers, method: request.method, url: request.url });
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ id: requests.length }));
    });
  }, async (basePath) => {
    const client = new ChatwootClient({ config: { basePath, token: 'test-token' } });

    await client.contacts.create({
      accountId: 42,
      data: { inbox_id: 7, name: 'Authorized test contact' },
    });
    await client.messages.create({
      accountId: 42,
      conversationId: 24,
      data: {
        attachments: [{ content: Buffer.from('test attachment'), encoding: 'utf8', filename: 'test.txt' }],
        content: 'A test message',
        message_type: 'incoming',
      },
    });
  });

  assert.equal(requests.length, 2);
  assert.deepEqual(
    {
      apiToken: requests[0].headers.api_access_token,
      authorization: requests[0].headers.authorization,
      method: requests[0].method,
      url: requests[0].url,
    },
    {
      apiToken: 'test-token',
      authorization: 'Bearer test-token',
      method: 'POST',
      url: '/api/v1/accounts/42/contacts',
    },
  );
  assert.deepEqual(JSON.parse(requests[0].body), { inbox_id: 7, name: 'Authorized test contact' });
  assert.match(requests[0].headers['content-type'] || '', /^application\/json/);
  assert.match(requests[1].headers['content-type'] || '', /^multipart\/form-data; boundary=/);
  assert.match(requests[1].body, /name="attachments\[\]"/);
  assert.match(requests[1].body, /filename="test.txt"/);
  assert.match(requests[1].body, /A test message/);
  assert.equal(requests[1].url, '/api/v1/accounts/42/conversations/24/messages');
});

test('maps Chatwoot HTTP failures to an error with a status and response body', async () => {
  await withServer((_, response) => {
    response.writeHead(422, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Invalid contact' }));
  }, async (basePath) => {
    const client = new ChatwootClient({ config: { basePath, token: 'test-token' } });

    await assert.rejects(
      () => client.contacts.create({ accountId: 42, data: { name: 'Invalid' } }),
      (error: ChatwootApiError) =>
        error instanceof ChatwootApiError && error.status === 422 && error.body.error === 'Invalid contact',
    );
  });
});

test('keeps custom Chatwoot API calls on the configured host and does not follow redirects', async () => {
  const requests: RecordedRequest[] = [];

  await withServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      requests.push({ body, headers: request.headers, method: request.method, url: request.url });

      if (request.url === '/chatwoot/redirect') {
        response.writeHead(302, { Location: 'http://example.test/should-not-be-requested' });
        response.end();
        return;
      }

      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ payload: [] }));
    });
  }, async (basePath) => {
    const config = { basePath: `${basePath}/chatwoot`, token: 'test-token' };
    const result = await chatwootRequest<{ payload: unknown[] }>(config, {
      body: { payload: [{ attribute_key: 'phone_number' }] },
      method: 'POST',
      url: '/api/v1/accounts/42/contacts/filter',
    });

    assert.deepEqual(result, { payload: [] });
    await assert.rejects(
      () => chatwootRequest(config, { method: 'GET', url: '/redirect' }),
      (error: ChatwootApiError) => error instanceof ChatwootApiError && error.status === 302,
    );
    await assert.rejects(
      () => chatwootRequest(config, { method: 'GET', url: 'http://example.test/metadata' }),
      /paths must be relative/,
    );
  });

  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, '/chatwoot/api/v1/accounts/42/contacts/filter');
  assert.deepEqual(JSON.parse(requests[0].body), { payload: [{ attribute_key: 'phone_number' }] });
});
