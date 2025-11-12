import { Logger } from '@nestjs/common';
import {
  IEmailProvider,
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from './email-provider.interface';

export abstract class BaseEmailProvider implements IEmailProvider {
  protected readonly logger: Logger;
  protected credentials: Record<string, any>;
  protected config: Record<string, any>;

  constructor(
    credentials: Record<string, any>,
    config: Record<string, any> = {},
  ) {
    this.credentials = credentials;
    this.config = config;
    this.logger = new Logger(this.constructor.name);
  }

  abstract getName(): string;

  abstract sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;

  abstract verifyCredentials(): Promise<boolean>;

  abstract getQuota(): Promise<QuotaInfo>;

  abstract parseWebhook(payload: any): WebhookEvent;

  abstract verifyWebhookSignature(payload: any, signature: string): boolean;

  /**
   * Default implementation for bulk email sending
   * Providers can override this for better performance
   */
  async sendBulkEmail(payloads: SendEmailPayload[]): Promise<SendEmailResult[]> {
    const results: SendEmailResult[] = [];

    for (const payload of payloads) {
      try {
        const result = await this.sendEmail(payload);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          provider: this.getName(),
          error: error.message,
        });
      }
    }

    return results;
  }

  getConfig(): Record<string, any> {
    return this.config;
  }

  protected handleError(error: any, context: string): SendEmailResult {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);
    return {
      success: false,
      provider: this.getName(),
      error: error.message,
      metadata: {
        context,
        timestamp: new Date().toISOString(),
      },
    };
  }

  protected createSuccessResult(messageId: string, metadata?: Record<string, any>): SendEmailResult {
    return {
      success: true,
      messageId,
      provider: this.getName(),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
