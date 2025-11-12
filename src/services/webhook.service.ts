import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailWebhook, WebhookEventType } from '../entities/email-webhook.entity';
import { EmailLog, EmailStatus } from '../entities/email-log.entity';
import { EmailProviderFactory } from '../providers/provider.factory';
import { EmailProvider } from '../entities/email-account.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(EmailWebhook)
    private readonly webhookRepo: Repository<EmailWebhook>,
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
    private readonly providerFactory: EmailProviderFactory,
  ) {}

  /**
   * Process webhook from email provider
   */
  async processWebhook(
    provider: EmailProvider,
    payload: any,
    signature?: string,
  ): Promise<void> {
    this.logger.log(`Processing webhook from ${provider}`);

    try {
      // Create provider instance to parse webhook
      const providerInstance = this.providerFactory.createProvider(provider, {});

      // Verify signature if provided
      if (signature && !providerInstance.verifyWebhookSignature(payload, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // Parse webhook event
      const event = providerInstance.parseWebhook(payload);

      // Find email log by message ID
      const emailLog = await this.emailLogRepo.findOne({
        where: { messageId: event.messageId },
      });

      if (!emailLog) {
        this.logger.warn(`Email log not found for message ID: ${event.messageId}`);
        return;
      }

      // Create webhook record
      await this.webhookRepo.save({
        emailLogId: emailLog.id,
        provider,
        eventType: this.mapEventType(event.type),
        eventData: event.data,
        processedAt: new Date(),
      });

      // Update email log based on event type
      await this.updateEmailLog(emailLog, event.type, event.data);

      this.logger.log(`Webhook processed successfully for ${event.messageId}`);
    } catch (error) {
      this.logger.error('Failed to process webhook', error.stack);
      throw error;
    }
  }

  /**
   * Get webhooks for email log
   */
  async getWebhooksForEmail(emailLogId: string): Promise<EmailWebhook[]> {
    return this.webhookRepo.find({
      where: { emailLogId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Map provider event type to our enum
   */
  private mapEventType(eventType: string): WebhookEventType {
    const normalized = eventType.toLowerCase();

    if (normalized.includes('deliver')) return WebhookEventType.DELIVERED;
    if (normalized.includes('open')) return WebhookEventType.OPENED;
    if (normalized.includes('click')) return WebhookEventType.CLICKED;
    if (normalized.includes('bounce')) return WebhookEventType.BOUNCED;
    if (normalized.includes('complain') || normalized.includes('spam'))
      return WebhookEventType.COMPLAINED;
    if (normalized.includes('unsubscribe')) return WebhookEventType.UNSUBSCRIBED;

    return WebhookEventType.DELIVERED;
  }

  /**
   * Update email log based on webhook event
   */
  private async updateEmailLog(
    emailLog: EmailLog,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    const updates: Partial<EmailLog> = {};

    switch (this.mapEventType(eventType)) {
      case WebhookEventType.DELIVERED:
        updates.status = EmailStatus.DELIVERED;
        updates.deliveredAt = new Date();
        break;

      case WebhookEventType.OPENED:
        if (emailLog.status === EmailStatus.DELIVERED || emailLog.status === EmailStatus.SENT) {
          updates.status = EmailStatus.OPENED;
        }
        updates.openedAt = updates.openedAt || new Date();
        updates.opens = (emailLog.opens || 0) + 1;
        updates.ipAddress = eventData.ip || emailLog.ipAddress;
        updates.userAgent = eventData.userAgent || emailLog.userAgent;
        break;

      case WebhookEventType.CLICKED:
        updates.status = EmailStatus.CLICKED;
        updates.clickedAt = updates.clickedAt || new Date();
        updates.clicks = (emailLog.clicks || 0) + 1;
        break;

      case WebhookEventType.BOUNCED:
        updates.status = EmailStatus.BOUNCED;
        updates.bouncedAt = new Date();
        updates.bounceReason = eventData.reason || eventData.description;
        break;

      case WebhookEventType.COMPLAINED:
        updates.status = EmailStatus.COMPLAINED;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.emailLogRepo.update(emailLog.id, updates);
    }
  }
}
