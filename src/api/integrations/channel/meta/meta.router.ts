import { RouterBroker } from '@api/abstract/abstract.router';
import { HttpStatus } from '@api/http-status';
import { ChannelControllerInterface } from '@api/integrations/channel/channel.controller';
import { metaController } from '@api/server.module';
import { ConfigService, WaBusiness } from '@config/env.config';
import { Router } from 'express';

export class MetaRouter extends RouterBroker {
  constructor(
    readonly configService: ConfigService,
    private readonly controller: Pick<ChannelControllerInterface, 'receiveWebhook'> = metaController,
  ) {
    super();
    this.router
      .get(this.routerPath('webhook/meta', false), async (req, res) => {
        const token = configService.get<WaBusiness>('WA_BUSINESS').TOKEN_WEBHOOK;
        if (!token || req.query['hub.verify_token'] !== token) {
          return res.status(HttpStatus.FORBIDDEN).send('Error, wrong validation token');
        }

        return res.status(HttpStatus.OK).send(req.query['hub.challenge']);
      })
      .post(this.routerPath('webhook/meta', false), async (req, res) => {
        const { body } = req;
        const response = await this.controller.receiveWebhook(body);

        return res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
