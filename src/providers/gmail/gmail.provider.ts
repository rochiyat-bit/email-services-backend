import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class GmailProvider extends BaseEmailProvider {
  private gmail: any;
  private oauth2Client: any;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    this.initializeClient();
  }

  private initializeClient() {
    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri,
    );

    this.oauth2Client.setCredentials({
      access_token: this.credentials.accessToken,
      refresh_token: this.credentials.refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  getName(): string {
    return 'gmail';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const message = this.createMimeMessage(payload);
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return this.createSuccessResult(response.data.id, {
        threadId: response.data.threadId,
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      this.logger.error('Failed to verify Gmail credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // Gmail has a limit of 500 emails per day for free accounts
    // 2000 for paid GSuite accounts
    const dailyLimit = this.config.dailyLimit || 500;

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0, // Would need to track this separately
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    // Gmail uses Cloud Pub/Sub for webhooks
    const data = Buffer.from(payload.message.data, 'base64').toString();
    const parsed = JSON.parse(data);

    return {
      type: 'notification',
      messageId: parsed.historyId,
      timestamp: new Date(payload.message.publishTime),
      data: parsed,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Gmail webhooks are verified through Google Cloud Pub/Sub
    // Verification happens at the infrastructure level
    return true;
  }

  private createMimeMessage(payload: SendEmailPayload): string {
    const boundary = '----=_Part_' + Date.now();
    let message = '';

    // Headers
    message += `From: ${payload.from}\r\n`;
    message += `To: ${payload.to.join(', ')}\r\n`;

    if (payload.cc && payload.cc.length > 0) {
      message += `Cc: ${payload.cc.join(', ')}\r\n`;
    }

    if (payload.bcc && payload.bcc.length > 0) {
      message += `Bcc: ${payload.bcc.join(', ')}\r\n`;
    }

    message += `Subject: ${payload.subject}\r\n`;
    message += 'MIME-Version: 1.0\r\n';
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;

    // Text body
    if (payload.textBody) {
      message += `--${boundary}\r\n`;
      message += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n';
      message += `${payload.textBody}\r\n\r\n`;
    }

    // HTML body
    message += `--${boundary}\r\n`;
    message += 'Content-Type: text/html; charset="UTF-8"\r\n\r\n';
    message += `${payload.htmlBody}\r\n\r\n`;

    message += `--${boundary}--`;

    return message;
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
