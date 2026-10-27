import { EventConfigController, EventConfigRouter } from '@api/integrations/event/event-config-router';
import { eventManager } from '@api/server.module';
import { RequestHandler } from 'express';

export class NatsRouter extends EventConfigRouter {
  constructor(controller: EventConfigController = eventManager.nats, ...guards: RequestHandler[]) {
    super(controller, ...guards);
  }
}
