import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { BaseEmailProvider } from '../base/base-email-provider';
import {
  SendEmailPayload,
  SendEmailResult,
  QuotaInfo,
  WebhookEvent,
} from '../base/email-provider.interface';

@Injectable()
export class SMTPProvider extends BaseEmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(credentials: Record<string, any>, config: Record<string, any> = {}) {
    super(credentials, config);
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.credentials.host,
      port: this.credentials.port || 587,
      secure: this.credentials.secure || false,
      auth: {
        user: this.credentials.user,
        pass: this.credentials.password,
      },
    });
  }

  getName(): string {
    return 'smtp';
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const mailOptions = {
        from: payload.from,
        to: payload.to.join(', '),
        cc: payload.cc?.join(', '),
        bcc: payload.bcc?.join(', '),
        subject: payload.subject,
        html: payload.htmlBody,
        text: payload.textBody,
        attachments: payload.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      return this.createSuccessResult(info.messageId, {
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } catch (error) {
      return this.handleError(error, 'sendEmail');
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Failed to verify SMTP credentials', error);
      return false;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    // SMTP quota depends on the provider
    const dailyLimit = this.config.dailyLimit || 500;

    return {
      daily: dailyLimit,
      hourly: Math.floor(dailyLimit / 24),
      used: 0,
      remaining: dailyLimit,
      resetAt: this.getNextMidnight(),
    };
  }

  parseWebhook(payload: any): WebhookEvent {
    // SMTP doesn't typically have webhooks
    // This is a placeholder for compatibility
    return {
      type: 'unknown',
      messageId: '',
      timestamp: new Date(),
      data: payload,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // SMTP doesn't support webhooks
    return false;
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
