import { IsString, IsArray, IsOptional, IsEnum, IsObject, IsEmail, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailPriority } from '../entities/email-queue.entity';

export class AttachmentDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  content?: string; // Base64 encoded

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  @IsString()
  accountId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  to: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsString()
  subject: string;

  @IsString()
  htmlBody: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendTemplateEmailDto {
  @IsString()
  accountId: string;

  @IsString()
  templateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  to: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsObject()
  variables: Record<string, any>;

  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
