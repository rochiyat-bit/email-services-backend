import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';

// Config
import { databaseConfig, redisConfig, appConfig, queueConfig, jwtConfig } from './config';

// Entities
import {
  EmailAccount,
  EmailTemplate,
  EmailQueue,
  EmailLog,
  EmailWebhook,
  EmailAttachment,
} from './entities';

// Controllers
import {
  EmailController,
  TemplateController,
  WebhookController,
  AnalyticsController,
  AccountController,
} from './controllers';

// Services
import { EmailService, TemplateService, WebhookService, AnalyticsService } from './services';

// Providers
import { EmailProviderFactory } from './providers';

// Queues
import { EmailQueueService, EmailProcessor } from './queues';

// Utils
import { EncryptionUtil, TemplateEngineUtil, ValidatorUtil } from './utils';

// Middleware
import { LoggingMiddleware } from './middlewares/logging.middleware';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, appConfig, queueConfig, jwtConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database'),
    }),
    TypeOrmModule.forFeature([
      EmailAccount,
      EmailTemplate,
      EmailQueue,
      EmailLog,
      EmailWebhook,
      EmailAttachment,
    ]),

    // BullMQ
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: configService.get('queue.redis'),
      }),
    }),
    BullModule.registerQueue({
      name: 'email',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  controllers: [
    EmailController,
    TemplateController,
    WebhookController,
    AnalyticsController,
    AccountController,
  ],
  providers: [
    // Services
    EmailService,
    TemplateService,
    WebhookService,
    AnalyticsService,

    // Providers
    EmailProviderFactory,

    // Queues
    EmailQueueService,
    EmailProcessor,

    // Utils
    EncryptionUtil,
    TemplateEngineUtil,
    ValidatorUtil,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
