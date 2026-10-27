import type { EventManager } from '@api/integrations/event/event.manager';
import { KafkaRouter } from '@api/integrations/event/kafka/kafka.router';
import { NatsRouter } from '@api/integrations/event/nats/nats.router';
import { PusherRouter } from '@api/integrations/event/pusher/pusher.router';
import { RabbitmqRouter } from '@api/integrations/event/rabbitmq/rabbitmq.router';
import { SqsRouter } from '@api/integrations/event/sqs/sqs.router';
import { WebhookRouter } from '@api/integrations/event/webhook/webhook.router';
import { WebsocketRouter } from '@api/integrations/event/websocket/websocket.router';
import { Router } from 'express';

export class EventRouter {
  public readonly router: Router;

  constructor(configService: any, eventManager: EventManager, ...guards: any[]) {
    this.router = Router();

    this.router.use('/webhook', new WebhookRouter(configService, eventManager, ...guards).router);
    this.router.use('/websocket', new WebsocketRouter(eventManager.websocket, ...guards).router);
    this.router.use('/rabbitmq', new RabbitmqRouter(eventManager.rabbitmq, ...guards).router);
    this.router.use('/nats', new NatsRouter(eventManager.nats, ...guards).router);
    this.router.use('/pusher', new PusherRouter(eventManager.pusher, ...guards).router);
    this.router.use('/sqs', new SqsRouter(eventManager.sqs, ...guards).router);
    this.router.use('/kafka', new KafkaRouter(eventManager.kafka, ...guards).router);
  }
}
