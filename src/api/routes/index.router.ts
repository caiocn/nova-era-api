import { authGuard } from '@api/guards/auth.guard';
import { instanceExistsGuard, instanceLoggedGuard } from '@api/guards/instance.guard';
import Telemetry from '@api/guards/telemetry.guard';
import { HttpStatus } from '@api/http-status';
import { ChannelRouter } from '@api/integrations/channel/channel.router';
import { ChatbotRouter } from '@api/integrations/chatbot/chatbot.router';
import { EventRouter } from '@api/integrations/event/event.router';
import { StorageRouter } from '@api/integrations/storage/storage.router';
import { ManagerRouter } from '@api/manager/manager.router';
import { createHealthResponse } from '@api/routes/health';
import {
  cache,
  eventManager,
  instanceController,
  novaEraBotController,
  novaEraController,
  proxyController,
  sendMessageController,
  settingsController,
  waMonitor,
} from '@api/server.module';
import { configService, Database, Facebook, HttpServer } from '@config/env.config';
import { ROOT_DIR } from '@config/path.config';
import { fetchLatestWaWebVersion } from '@utils/fetchLatestWaWebVersion';
import express, { NextFunction, Request, Response, Router } from 'express';
import fs from 'fs';
import { join } from 'path';

import { BusinessRouter } from './business.router';
import { CallRouter } from './call.router';
import { ChatRouter } from './chat.router';
import { GroupRouter } from './group.router';
import { InstanceRouter } from './instance.router';
import { LabelRouter } from './label.router';
import { ProxyRouter } from './proxy.router';
import { MessageRouter } from './sendMessage.router';
import { SettingsRouter } from './settings.router';
import { TemplateRouter } from './template.router';

// Modified by Nova Era API Community, 2026. See NOTICE for upstream attribution.
const router: Router = Router();
const serverConfig = configService.get('SERVER');
const managerConfig = configService.get<HttpServer>('SERVER');
const databaseConfig = configService.get<Database>('DATABASE');
const guards = [instanceExistsGuard, instanceLoggedGuard, authGuard['apikey']];

const telemetry = new Telemetry();

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// Middleware for metrics IP whitelist
const metricsIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const metricsConfig = configService.get('METRICS');
  const allowedIPs = metricsConfig.ALLOWED_IPS?.split(',').map((ip) => ip.trim()) || ['127.0.0.1'];
  const clientIPs = [
    req.ip,
    req.connection.remoteAddress,
    req.socket.remoteAddress,
    req.headers['x-forwarded-for'],
  ].filter((ip) => ip !== undefined);

  if (allowedIPs.filter((ip) => clientIPs.includes(ip)) === 0) {
    return res.status(403).send('Forbidden: IP not allowed');
  }

  next();
};

// Middleware for metrics Basic Authentication
const metricsBasicAuth = (req: Request, res: Response, next: NextFunction) => {
  const metricsConfig = configService.get('METRICS');
  const metricsUser = metricsConfig.USER;
  const metricsPass = metricsConfig.PASSWORD;

  if (!metricsUser || !metricsPass) {
    return res.status(500).send('Metrics authentication not configured');
  }

  const auth = req.get('Authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Nova Era API Metrics"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  const [user, pass] = credentials.split(':');

  if (user !== metricsUser || pass !== metricsPass) {
    return res.status(401).send('Invalid credentials');
  }

  next();
};

// Expose Prometheus metrics when enabled by env flag
const metricsConfig = configService.get('METRICS');
if (metricsConfig.ENABLED) {
  const metricsMiddleware = [];

  // Add IP whitelist if configured
  if (metricsConfig.ALLOWED_IPS) {
    metricsMiddleware.push(metricsIPWhitelist);
  }

  // Add Basic Auth if required
  if (metricsConfig.AUTH_REQUIRED) {
    metricsMiddleware.push(metricsBasicAuth);
  }

  router.get('/metrics', ...metricsMiddleware, async (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    const escapeLabel = (value: unknown) =>
      String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '\\"');

    const lines: string[] = [];

    const clientName = databaseConfig.CONNECTION.CLIENT_NAME || 'unknown';
    const serverUrl = serverConfig.URL || '';

    // environment info
    lines.push('# HELP nova_era_api_environment_info Environment information');
    lines.push('# TYPE nova_era_api_environment_info gauge');
    lines.push(
      `nova_era_api_environment_info{version="${escapeLabel(packageJson.version)}",clientName="${escapeLabel(
        clientName,
      )}",serverUrl="${escapeLabel(serverUrl)}"} 1`,
    );

    const instances = (waMonitor && waMonitor.waInstances) || {};
    const instanceEntries = Object.entries(instances);

    // total instances
    lines.push('# HELP nova_era_api_instances_total Total number of instances');
    lines.push('# TYPE nova_era_api_instances_total gauge');
    lines.push(`nova_era_api_instances_total ${instanceEntries.length}`);

    // per-instance status
    lines.push('# HELP nova_era_api_instance_up 1 if instance state is open, else 0');
    lines.push('# TYPE nova_era_api_instance_up gauge');
    lines.push('# HELP nova_era_api_instance_state Instance state as a labelled metric');
    lines.push('# TYPE nova_era_api_instance_state gauge');

    for (const [name, instance] of instanceEntries) {
      const state = instance?.connectionStatus?.state || 'unknown';
      const integration = instance?.integration || '';
      const up = state === 'open' ? 1 : 0;

      lines.push(
        `nova_era_api_instance_up{instance="${escapeLabel(name)}",integration="${escapeLabel(integration)}"} ${up}`,
      );
      lines.push(
        `nova_era_api_instance_state{instance="${escapeLabel(name)}",integration="${escapeLabel(
          integration,
        )}",state="${escapeLabel(state)}"} 1`,
      );
    }

    res.send(lines.join('\n') + '\n');
  });
}

router.get('/health', (_req, res) => {
  res.status(HttpStatus.OK).json(createHealthResponse(packageJson.version));
});

if (!managerConfig.DISABLE_MANAGER) {
  router.use('/manager', express.static(join(ROOT_DIR, 'manager')));
  router.get(['/manager', '/manager/*'], (_req, res) => {
    res.sendFile(join(ROOT_DIR, 'manager', 'index.html'));
  });
}

router
  .use((req, res, next) => telemetry.collectTelemetry(req, res, next))

  .get('/', async (req, res) => {
    res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      message: 'Welcome to Nova Era API, it is working!',
      version: packageJson.version,
      clientName: databaseConfig.CONNECTION.CLIENT_NAME,
      documentation: 'https://github.com/caiocn/nova-era-api#readme',
      whatsappWebVersion: (await fetchLatestWaWebVersion({})).version.join('.'),
    });
  })
  .post('/verify-creds', authGuard['apikey'], async (req, res) => {
    const facebookConfig = configService.get<Facebook>('FACEBOOK');
    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      message: 'Credentials are valid',
      facebookAppId: facebookConfig.APP_ID,
      facebookConfigId: facebookConfig.CONFIG_ID,
      facebookUserToken: facebookConfig.USER_TOKEN,
    });
  })
  .use(
    '/manager-api',
    new ManagerRouter({
      cache,
      configService,
      eventManager,
      instanceController,
      managerEnabled: !managerConfig.DISABLE_MANAGER,
      proxyController,
      settingsController,
    }).router,
  )
  .use('/instance', new InstanceRouter(configService, instanceController, ...guards).router)
  .use('/message', new MessageRouter(sendMessageController, ...guards).router)
  .use('/call', new CallRouter(...guards).router)
  .use('/chat', new ChatRouter(...guards).router)
  .use('/business', new BusinessRouter(...guards).router)
  .use('/group', new GroupRouter(...guards).router)
  .use('/template', new TemplateRouter(configService, ...guards).router)
  .use('/settings', new SettingsRouter(...guards).router)
  .use('/proxy', new ProxyRouter(...guards).router)
  .use('/label', new LabelRouter(...guards).router)
  .use('', new ChannelRouter(configService, novaEraController, ...guards).router)
  .use('', new EventRouter(configService, eventManager, ...guards).router)
  .use('', new ChatbotRouter(novaEraBotController, ...guards).router)
  .use('', new StorageRouter(...guards).router);

export { HttpStatus, router };
