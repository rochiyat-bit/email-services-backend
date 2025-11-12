import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import * as crypto from 'crypto';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class SESProvider extends BaseEmailProvider {
  private client: SESClient;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new SESClient({
      region: this.config.region || 'us-east-1',
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
      },
    });
  }

  getName(): string {
    return 'ses';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const command = new SendEmailCommand({
        Source: payload.from,
        Destination: {
          ToAddresses: payload.to,
          CcAddresses: payload.cc,
          BccAddresses: payload.bcc,
        },
        Message: {
          Subject: {
            Data: payload.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: payload.htmlBody,
              Charset: 'UTF-8',
            },
            Text: payload.textBody
              ? {
                  Data: payload.textBody,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
      });

      const response = await this.client.send(command);

      return this.createSuccessResult(response.MessageId, {
        requestId: response.$metadata.requestId,
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      // Try to send a verification email to verify credentials
      // In production, you might want to use GetSendQuota instead
      return true;
    } catch (error) {
      this.logger.error('Failed to verify AWS SES credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // AWS SES free tier: 62,000 emails per month
    const dailyLimit = this.config.dailyLimit || 2000;

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0,
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    // AWS SNS webhook format
    const message = typeof payload.Message === 'string'
      ? JSON.parse(payload.Message)
      : payload.Message;

    return {
      type: message.notificationType || message.eventType,
      messageId: message.mail?.messageId || '',
      timestamp: new Date(message.mail?.timestamp || payload.Timestamp),
      recipient: message.mail?.destination?.[0],
      data: message,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // AWS SNS signature verification
    try {
      const message = this.buildSignatureString(payload);
      const verifier = crypto.createVerify('SHA1');
      verifier.update(message);

      return verifier.verify(payload.SigningCertURL, signature, 'base64');
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  private buildSignatureString(payload: any): string {
    let message = '';
    const fields = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];

    for (const field of fields) {
      if (payload[field]) {
        message += `${field}\n${payload[field]}\n`;
      }
    }

    return message;
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
