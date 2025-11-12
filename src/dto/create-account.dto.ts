import { IsString, IsEnum, IsEmail, IsObject, IsOptional } from 'class-validator';
import { EmailProvider } from '../entities/email-account.entity';

export class CreateAccountDto {
  @IsString()
  userId: string;

  @IsEnum(EmailProvider)
  provider: EmailProvider;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsObject()
  credentials: Record<string, any>;

  @IsOptional()
  @IsObject()
  quota?: {
    daily: number;
    hourly: number;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsObject()
  quota?: {
    daily: number;
    hourly: number;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
