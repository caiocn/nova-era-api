import { InstanceDto } from '@api/dto/instance.dto';
import { cache, prismaRepository, waMonitor } from '@api/server.module';
import { CacheConf, configService } from '@config/env.config';
import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@exceptions';
import { NextFunction, Request, Response } from 'express';

type InstanceGuardDependencies = {
  cache: typeof cache;
  configService: typeof configService;
  prismaRepository: typeof prismaRepository;
  waMonitor: typeof waMonitor;
};

async function getInstance(dependencies: InstanceGuardDependencies, instanceName: string) {
  const { cache, configService: config, prismaRepository, waMonitor } = dependencies;
  try {
    const cacheConf = config.get<CacheConf>('CACHE');

    const exists = !!waMonitor.waInstances[instanceName];

    if (cacheConf.REDIS.ENABLED && cacheConf.REDIS.SAVE_INSTANCES) {
      const keyExists = await cache.has(instanceName);

      return exists || keyExists;
    }

    return exists || (await prismaRepository.instance.findMany({ where: { name: instanceName } })).length > 0;
  } catch (error) {
    throw new InternalServerErrorException(error?.toString());
  }
}

export function createInstanceExistsGuard(dependencies: InstanceGuardDependencies) {
  return async function instanceExistsGuard(req: Request, _: Response, next: NextFunction) {
    if (req.originalUrl.includes('/instance/create') || req.originalUrl.includes('/instance/fetchInstances')) {
      return next();
    }

    const param = req.params as unknown as InstanceDto;
    if (!param?.instanceName) {
      throw new BadRequestException('"instanceName" not provided.');
    }

    if (!(await getInstance(dependencies, param.instanceName))) {
      throw new NotFoundException(`The "${param.instanceName}" instance does not exist`);
    }

    next();
  };
}

export function createInstanceLoggedGuard(dependencies: InstanceGuardDependencies) {
  return async function instanceLoggedGuard(req: Request, _: Response, next: NextFunction) {
    const { waMonitor } = dependencies;
    if (req.originalUrl.includes('/instance/create')) {
      const instance = req.body as InstanceDto;
      if (await getInstance(dependencies, instance.instanceName)) {
        throw new ForbiddenException(`This name "${instance.instanceName}" is already in use.`);
      }

      if (waMonitor.waInstances[instance.instanceName]) {
        delete waMonitor.waInstances[instance.instanceName];
      }
    }

    next();
  };
}

const liveDependencies = { cache, configService, prismaRepository, waMonitor };

export const instanceExistsGuard = createInstanceExistsGuard(liveDependencies);
export const instanceLoggedGuard = createInstanceLoggedGuard(liveDependencies);
