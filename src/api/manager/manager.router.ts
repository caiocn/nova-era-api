import type { InstanceController } from '@api/controllers/instance.controller';
import { InstanceDto } from '@api/dto/instance.dto';
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

type LoginAttempt = {
  count: number;
  resetAt: number;
};

type ManagerDependencies = {
  cache: Pick<CacheService, 'delete' | 'get' | 'set'>;
  configService: Pick<ConfigService, 'get'>;
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
