import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { HttpStatus } from '@api/http-status';
import { EventDto } from '@api/integrations/event/event.dto';
import { eventSchema, instanceSchema } from '@validate/validate.schema';
import { RequestHandler, Router } from 'express';

export type EventConfigController = {
  get: (instanceName: string) => Promise<unknown>;
  set: (instanceName: string, data: EventDto) => Promise<unknown>;
};

export class EventConfigRouter extends RouterBroker {
  constructor(
    private readonly controller: EventConfigController,
    ...guards: RequestHandler[]
  ) {
    super();
    this.router
      .post(this.routerPath('set'), ...guards, async (req, res) => {
        const response = await this.dataValidate<EventDto>({
          request: req,
          schema: eventSchema,
          ClassRef: EventDto,
          execute: (instance, data) => this.controller.set(instance.instanceName, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.get(instance.instanceName),
        });

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
