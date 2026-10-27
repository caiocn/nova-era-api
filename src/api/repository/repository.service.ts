import { ConfigService, Database } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export class Query<T> {
  where?: T;
  sort?: 'asc' | 'desc';
  page?: number;
  offset?: number;
}

function createPrismaAdapter(connectionString: string, provider: string) {
  if (provider === 'mysql') {
    return new PrismaMariaDb(connectionString);
  }
  return new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 300000,
  });
}

export class PrismaRepository extends PrismaClient {
  constructor(private readonly configService: ConfigService) {
    const dbConfig = configService?.get<Database>('DATABASE');
    const uri = dbConfig?.CONNECTION?.URI || process.env.DATABASE_CONNECTION_URI || '';
    const provider = (dbConfig?.PROVIDER || process.env.DATABASE_PROVIDER || 'postgresql').toLowerCase();
    super({ adapter: createPrismaAdapter(uri, provider) });
  }

  private readonly logger = new Logger('PrismaRepository');

  public async onModuleInit() {
    await this.$connect();
    this.logger.info('Repository:Prisma - ON');
  }

  public async onModuleDestroy() {
    await this.$disconnect();
    this.logger.warn('Repository:Prisma - OFF');
  }
}
