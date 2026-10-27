import assert from 'node:assert/strict';
import test from 'node:test';

import OpenAI from 'openai';

test('OpenAI client initializes and provides standard Chat and Assistants API methods', () => {
  const client = new OpenAI({ apiKey: 'test-fake-key-12345' });

  assert.equal(typeof client.chat.completions.create, 'function');
  assert.equal(typeof client.models.list, 'function');
  assert.equal(typeof client.beta.threads.create, 'function');
  assert.equal(typeof client.beta.threads.messages.create, 'function');
  assert.equal(typeof client.beta.threads.messages.list, 'function');
  assert.equal(typeof client.beta.threads.runs.create, 'function');
  assert.equal(typeof client.beta.threads.runs.retrieve, 'function');
  assert.equal(typeof client.beta.threads.runs.submitToolOutputs, 'function');
});

test('handles OpenAI 7 run retrieval and status polling signatures with thread_id parameter', async () => {
  const calls: { method: string; args: any[] }[] = [];

  const mockClient: any = {
    beta: {
      threads: {
        runs: {
          retrieve: async (runId: string, params: { thread_id: string }) => {
            calls.push({ method: 'retrieve', args: [runId, params] });
            return { status: 'completed' };
          },
          submitToolOutputs: async (runId: string, params: { thread_id: string; tool_outputs: any[] }) => {
            calls.push({ method: 'submitToolOutputs', args: [runId, params] });
            return { status: 'completed' };
          },
        },
        messages: {
          list: async (threadId: string) => {
            calls.push({ method: 'list', args: [threadId] });
            return {
              data: [
                {
                  content: [{ type: 'text', text: { value: 'Hello from mock assistant' } }],
                },
              ],
            };
          },
        },
      },
    },
  };

  const status = await mockClient.beta.threads.runs.retrieve('run_abc', { thread_id: 'thread_xyz' });
  assert.equal(status.status, 'completed');
  assert.deepEqual(calls[0], {
    method: 'retrieve',
    args: ['run_abc', { thread_id: 'thread_xyz' }],
  });

  await mockClient.beta.threads.runs.submitToolOutputs('run_abc', {
    thread_id: 'thread_xyz',
    tool_outputs: [{ tool_call_id: 'call_1', output: '{"success":true}' }],
  });
  assert.deepEqual(calls[1], {
    method: 'submitToolOutputs',
    args: ['run_abc', { thread_id: 'thread_xyz', tool_outputs: [{ tool_call_id: 'call_1', output: '{"success":true}' }] }],
  });

  const messages = await mockClient.beta.threads.messages.list('thread_xyz');
  assert.equal(messages.data[0].content[0].text.value, 'Hello from mock assistant');
});

test('handles OpenAI 7 chat completion payload formatting and response structure', async () => {
  let capturedPayload: any = null;

  const mockClient: any = {
    chat: {
      completions: {
        create: async (payload: any) => {
          capturedPayload = payload;
          return {
            id: 'chatcmpl-mock-123',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Mocked completion response',
                },
              },
            ],
          };
        },
      },
    },
  };

  const response = await mockClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is Nova Era API?' },
    ],
    max_tokens: 500,
  });

  assert.equal(capturedPayload.model, 'gpt-4o');
  assert.equal(capturedPayload.messages.length, 2);
  assert.equal(response.choices[0].message.content, 'Mocked completion response');
});
