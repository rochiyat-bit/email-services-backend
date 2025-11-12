import { Controller, Post, Get, Param, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from '../services/webhook.service';
import { EmailProvider } from '../entities/email-account.entity';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('sendgrid')
  async handleSendGridWebhook(
    @Body() payload: any,
    @Headers('x-twilio-email-event-webhook-signature') signature: string,
  ) {
    await this.webhookService.processWebhook(EmailProvider.SENDGRID, payload, signature);
    return { received: true };
  }

  @Post('ses')
  async handleSESWebhook(
    @Body() payload: any,
    @Headers('x-amz-sns-message-type') messageType: string,
  ) {
    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      // In production, you'd confirm the subscription here
      return { message: 'Subscription confirmed' };
    }

    await this.webhookService.processWebhook(EmailProvider.SES, payload);
    return { received: true };
  }

  @Post('mailgun')
  async handleMailgunWebhook(
    @Body() payload: any,
    @Headers('x-mailgun-signature') signature: string,
  ) {
    await this.webhookService.processWebhook(EmailProvider.MAILGUN, payload, signature);
    return { received: true };
  }

  @Post('gmail')
  async handleGmailWebhook(@Body() payload: any) {
    await this.webhookService.processWebhook(EmailProvider.GMAIL, payload);
    return { received: true };
  }

  @Post('outlook')
  async handleOutlookWebhook(
    @Body() payload: any,
    @Query('validationToken') validationToken: string,
  ) {
    // Handle Microsoft Graph webhook validation
    if (validationToken) {
      return validationToken;
    }

    await this.webhookService.processWebhook(EmailProvider.OUTLOOK, payload);
    return { received: true };
  }

  @Get('email/:emailLogId')
  async getWebhooksForEmail(@Param('emailLogId') emailLogId: string) {
    return this.webhookService.getWebhooksForEmail(emailLogId);
  }
}
