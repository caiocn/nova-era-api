import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';

export type ChatwootAPIConfig = {
  basePath: string;
  credentials?: 'include' | 'omit' | 'same-origin';
  mergeBrazilContacts?: boolean;
  nameInbox?: string;
  token?: string;
  with_credentials?: boolean;
};

type ChatwootRequest = {
  body?: unknown;
  formData?: FormData;
  method: AxiosRequestConfig['method'];
  path: string;
  query?: Record<string, string | number | undefined>;
};

export type generic_id = { id?: number };
export type inbox = generic_id & { inbox_identifier?: string; name?: string; [key: string]: any };
export type contact = generic_id & { identifier?: string; name?: string; phone_number?: string; [key: string]: any };
export type contact_inboxes = { source_id?: string; [key: string]: any };
export type conversation = generic_id & { inbox_id?: number; status?: string; [key: string]: any };
export type conversation_show = conversation & { meta?: { sender?: contact } };

export type ChatwootRequestOptions = {
  body?: unknown;
  method: AxiosRequestConfig['method'];
  query?: Record<string, string | number | undefined>;
  url: string;
};

type ChatwootClientConstructor = {
  config: ChatwootAPIConfig;
};

type CreateContactInput = {
  accountId: number;
  data: Record<string, unknown>;
};

type CreateMessageInput = {
  accountId: number;
  conversationId: number;
  data: {
    attachments?: { content: unknown; encoding: string; filename: string }[];
    [key: string]: unknown;
  };
};

export class ChatwootApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly url: string,
    message = 'Chatwoot request failed',
  ) {
    super(message);
    this.name = 'ChatwootApiError';
  }
}

export class ChatwootClient {
  constructor({ config }: ChatwootClientConstructor) {
    this.config = config;
  }

  private readonly config: ChatwootAPIConfig;

  public readonly contact = {
    getContactable: async ({ accountId, id }: { accountId: number; id: number }) =>
      this.request({
        method: 'GET',
        path: `/api/v1/accounts/${accountId}/contacts/${id}/contactable_inboxes`,
      }),
  };

  public readonly contacts = {
    create: async ({ accountId, data }: CreateContactInput): Promise<any> =>
      this.request({
        body: data,
        method: 'POST',
        path: `/api/v1/accounts/${accountId}/contacts`,
      }),
    listConversations: async ({ accountId, id }: { accountId: number; id: number }): Promise<any> =>
      this.request({
        method: 'GET',
        path: `/api/v1/accounts/${accountId}/contacts/${id}/conversations`,
      }),
    search: async ({ accountId, q }: { accountId: number; q?: string }): Promise<any> =>
      this.request({
        method: 'GET',
        path: `/api/v1/accounts/${accountId}/contacts/search`,
        query: { q },
      }),
    update: async ({
      accountId,
      data,
      id,
    }: {
      accountId: number;
      data: Record<string, unknown>;
      id: number;
    }): Promise<any> =>
      this.request({
        body: data,
        method: 'PUT',
        path: `/api/v1/accounts/${accountId}/contacts/${id}`,
      }),
  };

  public readonly conversations = {
    create: async ({ accountId, data }: { accountId: number; data: Record<string, unknown> }): Promise<any> =>
      this.request({
        body: data,
        method: 'POST',
        path: `/api/v1/accounts/${accountId}/conversations`,
      }),
    get: async ({ accountId, conversationId }: { accountId: number; conversationId: number }): Promise<any> =>
      this.request({
        method: 'GET',
        path: `/api/v1/accounts/${accountId}/conversations/${conversationId}`,
      }),
    toggleStatus: async ({
      accountId,
      conversationId,
      data,
    }: {
      accountId: number;
      conversationId: number;
      data: Record<string, unknown>;
    }): Promise<any> =>
      this.request({
        body: data,
        method: 'POST',
        path: `/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`,
      }),
  };

  public readonly inboxes = {
    create: async ({ accountId, data }: { accountId: number; data: Record<string, unknown> }): Promise<any> =>
      this.request({
        body: data,
        method: 'POST',
        path: `/api/v1/accounts/${accountId}/inboxes`,
      }),
    list: async ({ accountId }: { accountId: number }): Promise<any> =>
      this.request({
        method: 'GET',
        path: `/api/v1/accounts/${accountId}/inboxes`,
      }),
  };

  public readonly messages = {
    create: async ({ accountId, conversationId, data }: CreateMessageInput): Promise<any> => {
      const { attachments, ...message } = data;
      const formData = new FormData();

      for (const [key, value] of Object.entries(message)) {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      }
      for (const attachment of attachments ?? []) {
        formData.append(
          'attachments[]',
          Buffer.from(attachment.content as any, attachment.encoding as BufferEncoding),
          {
            filename: attachment.filename,
          },
        );
      }

      return this.request({
        formData,
        method: 'POST',
        path: `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      });
    },
    delete: async ({
      accountId,
      conversationId,
      messageId,
    }: {
      accountId: number;
      conversationId: number;
      messageId: number;
    }): Promise<any> =>
      this.request({
        method: 'DELETE',
        path: `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`,
      }),
  };

  public async request<T>({ body, formData, method, path, query }: ChatwootRequest): Promise<T> {
    const url = this.resolveUrl(path, query);
    const headers = {
      Accept: 'application/json',
      ...(formData?.getHeaders() ?? {}),
      ...(formData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(this.config.token
        ? {
            Authorization: `Bearer ${this.config.token}`,
            api_access_token: this.config.token,
          }
        : {}),
    };

    try {
      const response = await axios.request<T>({
        data: formData ?? body,
        headers,
        maxRedirects: 0,
        method,
        url,
        validateStatus: () => true,
      });

      return this.unwrap(response);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) return this.unwrap(error.response as AxiosResponse<T>);
      throw error;
    }
  }

  private unwrap<T>(response: AxiosResponse<T>): T {
    if (response.status >= 200 && response.status < 300) return response.data;

    throw new ChatwootApiError(response.status, response.data, response.config.url ?? '');
  }

  private resolveUrl(path: string, query?: ChatwootRequest['query']) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) {
      throw new TypeError('Chatwoot request paths must be relative');
    }

    const base = new URL(this.config.basePath);
    const relative = new URL(path, base.origin);
    const url = new URL(base.origin);
    const basePath = base.pathname.replace(/\/$/, '');

    url.pathname = `${basePath}/${relative.pathname.replace(/^\//, '')}`.replace(/\/{2,}/g, '/');
    url.search = relative.search;
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    return url.toString();
  }
}

export function request<T>(config: ChatwootAPIConfig, options: ChatwootRequestOptions): Promise<T> {
  return new ChatwootClient({ config }).request({
    body: options.body,
    method: options.method,
    path: options.url,
    query: options.query,
  });
}

export default ChatwootClient;
