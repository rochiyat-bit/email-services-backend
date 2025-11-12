import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as crypto from 'crypto';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class SendGridProvider extends BaseEmailProvider {
  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    sgMail.setApiKey(this.credentials.apiKey);
  }

  getName(): string {
    return 'sendgrid';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const message: any = {
        from: payload.from,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
        attachments: payload.attachments?.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment',
        })),
      };

      const [response] = await sgMail.send(message);

      return this.createSuccessResult(response.headers['x-message-id'], {
        statusCode: response.statusCode,
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async sendBulkEmail(payloads: SendEmailPayload[]): Promise<SendEmailResult[]> {
    try {
      const messages = payloads.map((payload) => ({
        from: payload.from,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
      }));

      const response = await sgMail.send(messages as any);

      return response.map((res, index) =>
        this.createSuccessResult(res.headers['x-message-id'], {
          statusCode: res.statusCode,
          index,
        }),
      );
    } catch (error) {
      this.logger.error('Bulk send failed', error);
      return payloads.map(() => ({
        success: false,
        provider: this.getName(),
        error: error.message,
      }));
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      // SendGrid doesn't have a dedicated verify endpoint
      // We can check API key validity by fetching account details
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      this.logger.error('Failed to verify SendGrid credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // Would need to call SendGrid stats API
    const dailyLimit = this.config.dailyLimit || 100; // Free tier

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0,
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    // SendGrid Event Webhook format
    const event = Array.isArray(payload) ? payload[0] : payload;

    return {
      type: event.event,
      messageId: event.sg_message_id,
      timestamp: new Date(event.timestamp * 1000),
      recipient: event.email,
      data: event,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // SendGrid webhook signature verification
    const publicKey = this.config.webhookPublicKey;
    if (!publicKey) {
      this.logger.warn('No webhook public key configured for SendGrid');
      return false;
    }

    try {
      const verify = crypto.createVerify('sha256');
      verify.update(JSON.stringify(payload));
      return verify.verify(publicKey, signature, 'base64');
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
