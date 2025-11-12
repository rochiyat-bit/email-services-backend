import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'email_services',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    migrationsRun: process.env.NODE_ENV === 'production',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  }),
);
