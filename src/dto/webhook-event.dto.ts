import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { WebhookEventType } from '../entities/email-webhook.entity';

export class WebhookEventDto {
  @IsEnum(WebhookEventType)
  eventType: WebhookEventType;

  @IsString()
  messageId: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsObject()
  eventData: Record<string, any>;
}
