import type { InstanceController } from '@api/controllers/instance.controller';
import type { ProxyController } from '@api/controllers/proxy.controller';
import type { SettingsController } from '@api/controllers/settings.controller';
import { InstanceDto } from '@api/dto/instance.dto';
import { ProxyDto } from '@api/dto/proxy.dto';
import { SettingsDto } from '@api/dto/settings.dto';
import { EventController } from '@api/integrations/event/event.controller';
import type { EventManager } from '@api/integrations/event/event.manager';
import { CacheService } from '@api/services/cache.service';
import { Auth, ConfigService, Manager } from '@config/env.config';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@exceptions';
import { randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response, Router } from 'express';

const COOKIE_NAME = 'nova_era_manager_session';
const SESSION_PREFIX = 'manager-session';
const CSRF_HEADER_NAME = 'x-manager-csrf';
const API_KEY_MAX_LENGTH = 512;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const INSTANCE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;

type ManagerSession = {
  csrfToken: string;
};

type ManagerSettings = Omit<SettingsDto, 'wavoipToken'>;

type ManagerWebhook = {
  base64: boolean;
  byEvents: boolean;
  enabled: boolean;
  events: string[];
  hasCustomHeaders: boolean;
  url: string;
};

type ManagerProxy = Pick<ProxyDto, 'enabled' | 'host' | 'port' | 'protocol'> & { hasCredentials: boolean };

type LoginAttempt = {
  count: number;
  resetAt: number;
};

type ManagerDependencies = {
  cache: Pick<CacheService, 'delete' | 'get' | 'set'>;
  configService: Pick<ConfigService, 'get'>;
  eventManager: Pick<EventManager, 'webhook'>;
  instanceController: Pick<
    InstanceController,
    | 'connectToWhatsapp'
    | 'connectionState'
    | 'createInstance'
    | 'deleteInstance'
    | 'fetchInstances'
    | 'logout'
    | 'restartInstance'
  >;
  managerEnabled: boolean;
  proxyController: Pick<ProxyController, 'createProxy' | 'findProxy'>;
  settingsController: Pick<SettingsController, 'createSettings' | 'findSettings'>;
};

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.get('cookie');
  if (!cookieHeader) return;

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function redactInstance(instance: any) {
  return {
    connectionStatus: instance.connectionStatus,
    counts: {
      chats: instance._count?.Chat ?? 0,
      contacts: instance._count?.Contact ?? 0,
      messages: instance._count?.Message ?? 0,
    },
    id: instance.id,
    integration: instance.integration,
    name: instance.name,
  };
}

export class ManagerRouter {
  public readonly router: Router = Router();
  private readonly loginAttempts = new Map<string, LoginAttempt>();

  constructor(private readonly dependencies: ManagerDependencies) {
    if (!dependencies.managerEnabled) {
      return;
    }

    this.router
      .post('/session', async (request, response) => this.createSession(request, response))
      .get('/session', async (request, response) => this.getSession(request, response))
      .delete('/session', async (request, response) => this.deleteSession(request, response))
      .get('/instances', async (request, response) => this.listInstances(request, response))
      .post('/instances', async (request, response) => this.createInstance(request, response))
      .get('/instances/:instanceName/settings', async (request, response) =>
        this.getInstanceSettings(request, response),
      )
      .put('/instances/:instanceName/settings', async (request, response) =>
        this.updateInstanceSettings(request, response),
      )
      .get('/instances/:instanceName/webhook', async (request, response) => this.getInstanceWebhook(request, response))
      .put('/instances/:instanceName/webhook', async (request, response) =>
        this.updateInstanceWebhook(request, response),
      )
      .get('/instances/:instanceName/proxy', async (request, response) => this.getInstanceProxy(request, response))
      .put('/instances/:instanceName/proxy', async (request, response) => this.updateInstanceProxy(request, response))
      .get('/instances/:instanceName/state', async (request, response) => this.getInstanceState(request, response))
      .post('/instances/:instanceName/connect', async (request, response) => this.connectInstance(request, response))
      .post('/instances/:instanceName/restart', async (request, response) => this.restartInstance(request, response))
      .post('/instances/:instanceName/logout', async (request, response) => this.logoutInstance(request, response))
      .delete('/instances/:instanceName', async (request, response) => this.deleteInstance(request, response));
  }

  private async createSession(request: Request, response: Response) {
    const clientId = request.ip;
    const attempt = this.loginAttempts.get(clientId);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      response.setHeader('Retry-After', Math.ceil((attempt.resetAt - Date.now()) / 1000));
      return response.status(429).json({ error: 'Too many authentication attempts' });
    }

    const apiKey = request.body?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey || apiKey.length > API_KEY_MAX_LENGTH) {
      this.recordFailedAttempt(clientId);
      throw new UnauthorizedException();
    }

    const configuredApiKey = this.dependencies.configService.get<Auth>('AUTHENTICATION').API_KEY.KEY;
    if (!configuredApiKey || !this.keysMatch(apiKey, configuredApiKey)) {
      this.recordFailedAttempt(clientId);
      throw new UnauthorizedException();
    }

    this.loginAttempts.delete(clientId);
    const sessionId = randomBytes(32).toString('base64url');
    const session: ManagerSession = { csrfToken: randomBytes(32).toString('base64url') };
    const managerConfig = this.getManagerConfig();

    await this.dependencies.cache.set(this.sessionKey(sessionId), session, managerConfig.SESSION_TTL_SECONDS);
    response.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      maxAge: managerConfig.SESSION_TTL_SECONDS * 1000,
      sameSite: 'strict',
      secure: managerConfig.COOKIE_SECURE,
    });
    return response.status(204).send();
  }

  private async getSession(request: Request, response: Response) {
    const session = await this.requireSession(request);
    return response.status(200).json({ csrfToken: session.csrfToken });
  }

  private async deleteSession(request: Request, response: Response) {
    const sessionId = getCookie(request, COOKIE_NAME);
    if (sessionId) {
      await this.dependencies.cache.delete(this.sessionKey(sessionId));
    }

    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.getManagerConfig().COOKIE_SECURE,
    });
    return response.status(204).send();
  }

  private async listInstances(request: Request, response: Response) {
    await this.requireSession(request);
    const apiKey = this.dependencies.configService.get<Auth>('AUTHENTICATION').API_KEY.KEY;
    const instances = await this.dependencies.instanceController.fetchInstances({} as InstanceDto, apiKey);
    return response.status(200).json({ instances: instances.map(redactInstance) });
  }

  private async createInstance(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const instance = this.getInstanceCreateInput(request.body);
    const result = await this.dependencies.instanceController.createInstance(instance);

    return response.status(201).json({
      instance: {
        instanceId: result.instance?.instanceId,
        instanceName: result.instance?.instanceName,
        integration: result.instance?.integration,
        status: result.instance?.status,
      },
      qrcode: 'qrcode' in result ? result.qrcode : undefined,
    });
  }

  private async getInstanceSettings(request: Request, response: Response) {
    await this.requireSession(request);
    const settings = await this.dependencies.settingsController.findSettings({
      instanceName: this.getInstanceName(request),
    });
    return response.status(200).json({ settings: this.redactSettings(settings) });
  }

  private async updateInstanceSettings(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const instanceName = this.getInstanceName(request);
    const changes = this.getSettingsInput(request.body);
    const currentSettings = (await this.dependencies.settingsController.findSettings({ instanceName })) || {};
    const settings = { ...currentSettings, ...changes };
    await this.dependencies.settingsController.createSettings({ instanceName }, settings);
    return response.status(200).json({ settings: this.redactSettings(settings) });
  }

  private async getInstanceWebhook(request: Request, response: Response) {
    await this.requireSession(request);
    const webhook = await this.dependencies.eventManager.webhook.get(this.getInstanceName(request));
    return response.status(200).json({ webhook: this.redactWebhook(webhook) });
  }

  private async updateInstanceWebhook(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const webhook = this.getWebhookInput(request.body);
    const instanceName = this.getInstanceName(request);
    const result = await this.dependencies.eventManager.webhook.set(instanceName, { webhook });
    return response.status(200).json({ webhook: this.redactWebhook(result) });
  }

  private async getInstanceProxy(request: Request, response: Response) {
    await this.requireSession(request);
    const proxy = await this.dependencies.proxyController.findProxy({ instanceName: this.getInstanceName(request) });
    return response.status(200).json({ proxy: this.redactProxy(proxy) });
  }

  private async updateInstanceProxy(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const instanceName = this.getInstanceName(request);
    const changes = this.getProxyInput(request.body);
    const currentProxy = (await this.dependencies.proxyController.findProxy({ instanceName })) || {};
    const proxy = changes.enabled ? { ...currentProxy, ...changes } : changes;
    const result = await this.dependencies.proxyController.createProxy({ instanceName }, proxy);
    return response.status(200).json({ proxy: this.redactProxy(result.proxy) });
  }

  private async getInstanceState(request: Request, response: Response) {
    await this.requireSession(request);
    const instanceName = this.getInstanceName(request);
    const result = await this.dependencies.instanceController.connectionState({ instanceName });
    return response.status(200).json(result);
  }

  private async connectInstance(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const instanceName = this.getInstanceName(request);
    const number = typeof request.body?.number === 'string' ? request.body.number : undefined;
    const result = await this.dependencies.instanceController.connectToWhatsapp({ instanceName, number });
    return response.status(200).json(result);
  }

  private async restartInstance(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const result = await this.dependencies.instanceController.restartInstance({
      instanceName: this.getInstanceName(request),
    });
    return response.status(200).json(result);
  }

  private async logoutInstance(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const result = await this.dependencies.instanceController.logout({ instanceName: this.getInstanceName(request) });
    return response.status(200).json(result);
  }

  private async deleteInstance(request: Request, response: Response) {
    await this.requireCsrfSession(request);
    const result = await this.dependencies.instanceController.deleteInstance({
      instanceName: this.getInstanceName(request),
    });
    return response.status(200).json(result);
  }

  private async requireCsrfSession(request: Request) {
    const session = await this.requireSession(request);
    const csrfToken = request.get(CSRF_HEADER_NAME);
    if (!csrfToken || !this.keysMatch(csrfToken, session.csrfToken)) {
      throw new ForbiddenException('Invalid manager CSRF token');
    }

    return session;
  }

  private async requireSession(request: Request): Promise<ManagerSession> {
    const sessionId = getCookie(request, COOKIE_NAME);
    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const session = await this.dependencies.cache.get(this.sessionKey(sessionId));
    if (!session?.csrfToken) {
      throw new UnauthorizedException();
    }

    return session as ManagerSession;
  }

  private getInstanceName(request: Request) {
    const instanceName = request.params.instanceName;
    if (!instanceName || instanceName.length > 255) {
      throw new BadRequestException('instanceName is required');
    }

    return instanceName;
  }

  private getInstanceCreateInput(body: unknown): InstanceDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('A valid instance payload is required');
    }

    const data = body as Record<string, unknown>;
    const instanceName = this.getTrimmedString(data.instanceName);
    const integration = data.integration;
    const number = this.getTrimmedString(data.number);
    const businessId = this.getTrimmedString(data.businessId);

    if (!instanceName || !INSTANCE_NAME_PATTERN.test(instanceName)) {
      throw new BadRequestException('instanceName must contain 3 to 64 letters, numbers, hyphens, or underscores');
    }

    if (integration !== 'WHATSAPP-BAILEYS' && integration !== 'WHATSAPP-BUSINESS') {
      throw new BadRequestException('integration must be WHATSAPP-BAILEYS or WHATSAPP-BUSINESS');
    }

    if (number && !/^\d{7,20}$/.test(number)) {
      throw new BadRequestException('number must use an international digits-only format');
    }

    if (integration === 'WHATSAPP-BUSINESS' && !number) {
      throw new BadRequestException('number is required for WHATSAPP-BUSINESS');
    }

    if (integration === 'WHATSAPP-BUSINESS' && !businessId) {
      throw new BadRequestException('businessId is required for WHATSAPP-BUSINESS');
    }

    return {
      businessId: businessId || undefined,
      instanceName,
      integration,
      number: number || undefined,
      qrcode: integration === 'WHATSAPP-BAILEYS',
    };
  }

  private getTrimmedString(value: unknown) {
    return typeof value === 'string' ? value.trim() : undefined;
  }

  private getSettingsInput(body: unknown): ManagerSettings {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('A valid settings payload is required');
    }

    const data = body as Record<string, unknown>;
    if ('wavoipToken' in data) {
      throw new BadRequestException('wavoipToken cannot be managed from the Manager');
    }

    const settings: ManagerSettings = {};
    const booleanFields = [
      'alwaysOnline',
      'groupsIgnore',
      'readMessages',
      'readStatus',
      'rejectCall',
      'syncFullHistory',
    ] as const;

    for (const field of booleanFields) {
      if (field in data) {
        if (typeof data[field] !== 'boolean') {
          throw new BadRequestException(`${field} must be a boolean`);
        }
        settings[field] = data[field];
      }
    }

    if ('msgCall' in data) {
      if (typeof data.msgCall !== 'string' || data.msgCall.length > 2048) {
        throw new BadRequestException('msgCall must be a string with at most 2048 characters');
      }
      settings.msgCall = data.msgCall;
    }

    if (Object.keys(settings).length === 0) {
      throw new BadRequestException('At least one setting is required');
    }

    return settings;
  }

  private redactSettings(settings: SettingsDto | null | undefined): ManagerSettings | null {
    if (!settings) {
      return null;
    }

    const redactedSettings = { ...settings };
    delete redactedSettings.wavoipToken;
    return redactedSettings;
  }

  private getWebhookInput(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('A valid webhook payload is required');
    }

    const data = body as Record<string, unknown>;
    if ('headers' in data) {
      throw new BadRequestException('Webhook headers cannot be managed from the Manager');
    }

    if (typeof data.enabled !== 'boolean' || typeof data.byEvents !== 'boolean' || typeof data.base64 !== 'boolean') {
      throw new BadRequestException('enabled, byEvents, and base64 must be booleans');
    }

    const url = this.getTrimmedString(data.url);
    if (!url || !/^https?:\/\//.test(url)) {
      throw new BadRequestException('url must use the http or https protocol');
    }

    if (
      !Array.isArray(data.events) ||
      !data.events.every((event) => typeof event === 'string' && EventController.events.includes(event))
    ) {
      throw new BadRequestException('events must contain only supported event names');
    }

    return {
      base64: data.base64,
      byEvents: data.byEvents,
      enabled: data.enabled,
      events: data.events,
      url,
    };
  }

  private redactWebhook(webhook: any): ManagerWebhook | null {
    if (!webhook) {
      return null;
    }

    return {
      base64: webhook.webhookBase64 === true || webhook.base64 === true,
      byEvents: webhook.webhookByEvents === true || webhook.byEvents === true,
      enabled: webhook.enabled === true,
      events: Array.isArray(webhook.events) ? webhook.events : [],
      hasCustomHeaders: !!webhook.headers && Object.keys(webhook.headers).length > 0,
      url: webhook.url || '',
    };
  }

  private getProxyInput(body: unknown): Omit<ProxyDto, 'password' | 'username'> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('A valid proxy payload is required');
    }

    const data = body as Record<string, unknown>;
    if ('password' in data || 'username' in data) {
      throw new BadRequestException('Proxy credentials cannot be managed from the Manager');
    }

    if (typeof data.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }

    if (!data.enabled) {
      return { enabled: false, host: '', port: '', protocol: '' };
    }

    const host = this.getTrimmedString(data.host);
    const port = this.getTrimmedString(data.port);
    const protocol = this.getTrimmedString(data.protocol)?.toLowerCase();
    if (
      !host ||
      host.length > 253 ||
      !port ||
      !/^\d{1,5}$/.test(port) ||
      !['http', 'https', 'socks4', 'socks5'].includes(protocol || '')
    ) {
      throw new BadRequestException('A valid proxy host, port, and protocol are required');
    }

    return { enabled: true, host, port, protocol };
  }

  private redactProxy(proxy: any): ManagerProxy | null {
    if (!proxy) {
      return null;
    }

    return {
      enabled: proxy.enabled === true,
      hasCredentials: !!proxy.username || !!proxy.password,
      host: proxy.host || '',
      port: proxy.port || '',
      protocol: proxy.protocol || '',
    };
  }

  private getManagerConfig(): Manager {
    return (
      this.dependencies.configService.get<Manager>('MANAGER') || {
        COOKIE_SECURE: process.env.NODE_ENV === 'production',
        SESSION_TTL_SECONDS: 900,
      }
    );
  }

  private keysMatch(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private sessionKey(sessionId: string) {
    return `${SESSION_PREFIX}:${sessionId}`;
  }

  private recordFailedAttempt(clientId: string) {
    const current = this.loginAttempts.get(clientId);
    if (!current || current.resetAt <= Date.now()) {
      this.loginAttempts.set(clientId, { count: 1, resetAt: Date.now() + LOGIN_RATE_LIMIT_WINDOW_MS });
      return;
    }

    current.count += 1;
  }
}
