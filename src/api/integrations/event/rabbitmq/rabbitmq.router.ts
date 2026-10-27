import { EventConfigController, EventConfigRouter } from '@api/integrations/event/event-config-router';
import { eventManager } from '@api/server.module';
import { RequestHandler } from 'express';

export class RabbitmqRouter extends EventConfigRouter {
  constructor(controller: EventConfigController = eventManager.rabbitmq, ...guards: RequestHandler[]) {
    super(controller, ...guards);
  }
}
