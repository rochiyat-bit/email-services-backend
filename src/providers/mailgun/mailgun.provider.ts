import { Injectable } from '@nestjs/common';
import Mailgun from 'mailgun.js';
import * as crypto from 'crypto';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class MailgunProvider extends BaseEmailProvider {
  private client: any;
  private domain: string;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    this.domain = this.credentials.domain;
    this.initializeClient();
  }

  private initializeClient() {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: 'api',
      key: this.credentials.apiKey,
      url: this.config.host || 'https://api.mailgun.net',
    });
  }

  getName(): string {
    return 'mailgun';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const message = {
        from: payload.from,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
        attachment: payload.attachments?.map((att) => ({
          filename: att.filename,
          data: att.content,
          contentType: att.contentType,
        })),
      };

      const response = await this.client.messages.create(this.domain, message);

      return this.createSuccessResult(response.id, {
        message: response.message,
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.client.domains.get(this.domain);
      return true;
    } catch (error) {
      this.logger.error('Failed to verify Mailgun credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // Mailgun free tier: 5,000 emails per month
    const dailyLimit = this.config.dailyLimit || 166; // ~5000/30 days

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0,
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    const eventData = payload['event-data'] || payload;

    return {
      type: eventData.event,
      messageId: eventData.message?.headers?.['message-id'] || '',
      timestamp: new Date(eventData.timestamp * 1000),
      recipient: eventData.recipient,
      data: eventData,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Mailgun webhook signature verification
    const signingKey = this.config.webhookSigningKey || this.credentials.apiKey;

    try {
      const eventData = payload['event-data'] || payload;
      const timestamp = eventData.timestamp;
      const token = eventData.token;

      const hmac = crypto.createHmac('sha256', signingKey);
      hmac.update(timestamp + token);
      const calculatedSignature = hmac.digest('hex');

      return calculatedSignature === signature;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
