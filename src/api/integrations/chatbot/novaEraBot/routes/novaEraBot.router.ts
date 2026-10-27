import { RouterBroker } from '@api/abstract/abstract.router';
import { IgnoreJidDto } from '@api/dto/chatbot.dto';
import { InstanceDto } from '@api/dto/instance.dto';
import { HttpStatus } from '@api/http-status';
import { instanceSchema } from '@validate/instance.schema';
import { RequestHandler, Router } from 'express';

import { NovaEraBotDto, NovaEraBotSettingDto } from '../dto/novaEraBot.dto';
import {
  novaEraBotIgnoreJidSchema,
  novaEraBotSchema,
  novaEraBotSettingSchema,
  novaEraBotStatusSchema,
} from '../validate/novaEraBot.schema';

export type NovaEraBotRouterController = {
  createBot(instance: InstanceDto, data: NovaEraBotDto): Promise<any>;
  findBot(instance: InstanceDto): Promise<any>;
  fetchBot(instance: InstanceDto, botId: string): Promise<any>;
  updateBot(instance: InstanceDto, botId: string, data: NovaEraBotDto): Promise<any>;
  deleteBot(instance: InstanceDto, botId: string): Promise<any>;
  settings(instance: InstanceDto, data: NovaEraBotSettingDto): Promise<any>;
  fetchSettings(instance: InstanceDto): Promise<any>;
  changeStatus(instance: InstanceDto, data: InstanceDto): Promise<any>;
  fetchSessions(instance: InstanceDto, botId: string): Promise<any>;
  ignoreJid(instance: InstanceDto, data: IgnoreJidDto): Promise<any>;
};

export class NovaEraBotRouter extends RouterBroker {
  constructor(
    private readonly controller: NovaEraBotRouterController,
    ...guards: RequestHandler[]
  ) {
    super();
    this.router
      .post(this.routerPath('create'), ...guards, async (req, res) => {
        const response = await this.dataValidate<NovaEraBotDto>({
          request: req,
          schema: novaEraBotSchema,
          ClassRef: NovaEraBotDto,
          execute: (instance, data) => this.controller.createBot(instance, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.findBot(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('fetch/:novaEraBotId'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.fetchBot(instance, req.params.novaEraBotId),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .put(this.routerPath('update/:novaEraBotId'), ...guards, async (req, res) => {
        const response = await this.dataValidate<NovaEraBotDto>({
          request: req,
          schema: novaEraBotSchema,
          ClassRef: NovaEraBotDto,
          execute: (instance, data) => this.controller.updateBot(instance, req.params.novaEraBotId, data),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('delete/:novaEraBotId'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.deleteBot(instance, req.params.novaEraBotId),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('settings'), ...guards, async (req, res) => {
        const response = await this.dataValidate<NovaEraBotSettingDto>({
          request: req,
          schema: novaEraBotSettingSchema,
          ClassRef: NovaEraBotSettingDto,
          execute: (instance, data) => this.controller.settings(instance, data),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('fetchSettings'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.fetchSettings(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('changeStatus'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: novaEraBotStatusSchema,
          ClassRef: InstanceDto,
          execute: (instance, data) => this.controller.changeStatus(instance, data),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('fetchSessions/:novaEraBotId'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => this.controller.fetchSessions(instance, req.params.novaEraBotId),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('ignoreJid'), ...guards, async (req, res) => {
        const response = await this.dataValidate<IgnoreJidDto>({
          request: req,
          schema: novaEraBotIgnoreJidSchema,
          ClassRef: IgnoreJidDto,
          execute: (instance, data) => this.controller.ignoreJid(instance, data),
        });

        res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
