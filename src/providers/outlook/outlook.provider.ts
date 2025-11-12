import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class OutlookProvider extends BaseEmailProvider {
  private client: Client;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    this.initializeClient();
  }

  private initializeClient() {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.credentials.accessToken);
      },
    });
  }

  getName(): string {
    return 'outlook';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const message = {
        subject: payload.subject,
        body: {
          contentType: 'HTML',
          content: payload.htmlBody,
        },
        toRecipients: payload.to.map((email) => ({
          emailAddress: { address: email },
        })),
        ccRecipients: payload.cc?.map((email) => ({
          emailAddress: { address: email },
        })) || [],
        bccRecipients: payload.bcc?.map((email) => ({
          emailAddress: { address: email },
        })) || [],
      };

      const response = await this.client.api('/me/sendMail').post({
        message,
        saveToSentItems: true,
      });

      // Microsoft Graph doesn't return message ID directly
      // We need to query sent items to get the message ID
      return this.createSuccessResult(`outlook-${Date.now()}`, {
        provider: 'outlook',
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.client.api('/me').get();
      return true;
    } catch (error) {
      this.logger.error('Failed to verify Outlook credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // Microsoft 365 quotas vary by license type
    // Standard limit is around 10,000 per day for Exchange Online
    const dailyLimit = this.config.dailyLimit || 10000;

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0,
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    // Microsoft Graph webhooks
    return {
      type: payload.changeType,
      messageId: payload.resourceData?.id || '',
      timestamp: new Date(payload.subscriptionExpirationDateTime),
      data: payload.resourceData,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Microsoft Graph webhook validation
    if (payload.validationToken) {
      return true;
    }
    return false;
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
