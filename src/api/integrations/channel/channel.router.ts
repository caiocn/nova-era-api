import { Router } from 'express';

import { MetaRouter } from './meta/meta.router';
import { NovaEraRouter, NovaEraWebhookController } from './nova-era/nova-era.router';
import { BaileysRouter } from './whatsapp/baileys.router';

export class ChannelRouter {
  public readonly router: Router;

  constructor(configService: any, novaEraController: NovaEraWebhookController, ...guards: any[]) {
    this.router = Router();

    this.router.use('/', new NovaEraRouter(configService, novaEraController).router);
    this.router.use('/', new MetaRouter(configService).router);
    this.router.use('/baileys', new BaileysRouter(...guards).router);
  }
}
