import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './base/email-provider.interface';
import { GmailProvider } from './gmail/gmail.provider';
import { OutlookProvider } from './outlook/outlook.provider';
import { SendGridProvider } from './sendgrid/sendgrid.provider';
import { SESProvider } from './ses/ses.provider';
import { MailgunProvider } from './mailgun/mailgun.provider';
import { SMTPProvider } from './smtp/smtp.provider';
import { EmailProvider } from '../entities/email-account.entity';

@Injectable()
export class EmailProviderFactory {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Create an email provider instance based on provider type and credentials
   */
  createProvider(
    providerType: EmailProvider,
    credentials: Record<string, any>,
    config?: Record<string, any>,
  ): IEmailProvider {
    const providerConfig = this.getProviderConfig(providerType, config);

    switch (providerType) {
      case EmailProvider.GMAIL:
        return new GmailProvider(credentials, providerConfig);

      case EmailProvider.OUTLOOK:
        return new OutlookProvider(credentials, providerConfig);

      case EmailProvider.SENDGRID:
        return new SendGridProvider(credentials, providerConfig);

      case EmailProvider.SES:
        return new SESProvider(credentials, providerConfig);

      case EmailProvider.MAILGUN:
        return new MailgunProvider(credentials, providerConfig);

      case EmailProvider.SMTP:
        return new SMTPProvider(credentials, providerConfig);

      default:
        throw new BadRequestException(`Unsupported email provider: ${providerType}`);
    }
  }

  /**
   * Get provider-specific configuration from environment variables
   */
  private getProviderConfig(
    providerType: EmailProvider,
    customConfig?: Record<string, any>,
  ): Record<string, any> {
    const baseConfig = customConfig || {};

    switch (providerType) {
      case EmailProvider.GMAIL:
        return {
          ...baseConfig,
          clientId: this.configService.get('GMAIL_CLIENT_ID'),
          clientSecret: this.configService.get('GMAIL_CLIENT_SECRET'),
          redirectUri: this.configService.get('GMAIL_REDIRECT_URI'),
        };

      case EmailProvider.OUTLOOK:
        return {
          ...baseConfig,
          clientId: this.configService.get('MICROSOFT_CLIENT_ID'),
          clientSecret: this.configService.get('MICROSOFT_CLIENT_SECRET'),
          tenantId: this.configService.get('MICROSOFT_TENANT_ID'),
          redirectUri: this.configService.get('MICROSOFT_REDIRECT_URI'),
        };

      case EmailProvider.SENDGRID:
        return {
          ...baseConfig,
          webhookPublicKey: this.configService.get('SENDGRID_WEBHOOK_PUBLIC_KEY'),
        };

      case EmailProvider.SES:
        return {
          ...baseConfig,
          region: this.configService.get('AWS_REGION'),
        };

      case EmailProvider.MAILGUN:
        return {
          ...baseConfig,
          host: this.configService.get('MAILGUN_HOST'),
          webhookSigningKey: this.configService.get('MAILGUN_WEBHOOK_SIGNING_KEY'),
        };

      case EmailProvider.SMTP:
        return baseConfig;

      default:
        return baseConfig;
    }
  }

  /**
   * Validate provider credentials before creating instance
   */
  validateCredentials(providerType: EmailProvider, credentials: Record<string, any>): boolean {
    switch (providerType) {
      case EmailProvider.GMAIL:
        return !!(credentials.accessToken && credentials.refreshToken);

      case EmailProvider.OUTLOOK:
        return !!(credentials.accessToken && credentials.refreshToken);

      case EmailProvider.SENDGRID:
        return !!credentials.apiKey;

      case EmailProvider.SES:
        return !!(credentials.accessKeyId && credentials.secretAccessKey);

      case EmailProvider.MAILGUN:
        return !!(credentials.apiKey && credentials.domain);

      case EmailProvider.SMTP:
        return !!(credentials.host && credentials.user && credentials.password);

      default:
        return false;
    }
  }
}
