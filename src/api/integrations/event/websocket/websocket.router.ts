import { EventConfigController, EventConfigRouter } from '@api/integrations/event/event-config-router';
import { eventManager } from '@api/server.module';
import { RequestHandler } from 'express';

export class WebsocketRouter extends EventConfigRouter {
  constructor(controller: EventConfigController = eventManager.websocket, ...guards: RequestHandler[]) {
    super(controller, ...guards);
  }
}
