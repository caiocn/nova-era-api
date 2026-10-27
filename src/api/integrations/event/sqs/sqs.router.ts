import { EventConfigController, EventConfigRouter } from '@api/integrations/event/event-config-router';
import { eventManager } from '@api/server.module';
import { RequestHandler } from 'express';

export class SqsRouter extends EventConfigRouter {
  constructor(controller: EventConfigController = eventManager.sqs, ...guards: RequestHandler[]) {
    super(controller, ...guards);
  }
}
