import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  accountId: string;

  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  htmlBody: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
