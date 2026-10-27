import { RouterBroker } from '@api/abstract/abstract.router';
import { ConfigService } from '@config/env.config';
import { Router } from 'express';

export type NovaEraWebhookController = {
  receiveWebhook(data: any): Promise<any>;
};

export class NovaEraRouter extends RouterBroker {
  constructor(
    readonly configService: ConfigService,
    private readonly controller: NovaEraWebhookController,
  ) {
    super();
    this.router.post(this.routerPath('webhook/nova-era', false), async (req, res) => {
      const { body } = req;
      const response = await this.controller.receiveWebhook(body);

      return res.status(200).json(response);
    });
  }

  public readonly router: Router = Router();
}
