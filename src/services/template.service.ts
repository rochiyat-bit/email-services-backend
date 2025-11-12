import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto';
import { TemplateEngineUtil } from '../utils/template-engine.util';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly templateEngine: TemplateEngineUtil,
  ) {}

  /**
   * Create new email template
   */
  async createTemplate(dto: CreateTemplateDto): Promise<EmailTemplate> {
    // Validate template syntax
    const subjectValidation = this.templateEngine.validateTemplate(dto.subject);
    if (!subjectValidation.valid) {
      throw new BadRequestException(`Invalid subject template: ${subjectValidation.error}`);
    }

    const htmlValidation = this.templateEngine.validateTemplate(dto.htmlBody);
    if (!htmlValidation.valid) {
      throw new BadRequestException(`Invalid HTML template: ${htmlValidation.error}`);
    }

    // Extract variables if not provided
    const variables =
      dto.variables ||
      Array.from(
        new Set([
          ...this.templateEngine.extractVariables(dto.subject),
          ...this.templateEngine.extractVariables(dto.htmlBody),
          ...(dto.textBody ? this.templateEngine.extractVariables(dto.textBody) : []),
        ]),
      );

    const template = this.templateRepo.create({
      ...dto,
      variables,
    });

    return this.templateRepo.save(template);
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Validate new templates if provided
    if (dto.subject) {
      const validation = this.templateEngine.validateTemplate(dto.subject);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid subject template: ${validation.error}`);
      }
    }

    if (dto.htmlBody) {
      const validation = this.templateEngine.validateTemplate(dto.htmlBody);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid HTML template: ${validation.error}`);
      }
    }

    // Update variables if template content changed
    if (dto.subject || dto.htmlBody || dto.textBody) {
      const subject = dto.subject || template.subject;
      const htmlBody = dto.htmlBody || template.htmlBody;
      const textBody = dto.textBody || template.textBody;

      dto.variables = Array.from(
        new Set([
          ...this.templateEngine.extractVariables(subject),
          ...this.templateEngine.extractVariables(htmlBody),
          ...(textBody ? this.templateEngine.extractVariables(textBody) : []),
        ]),
      );
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Get templates by account
   */
  async getTemplatesByAccount(accountId: string): Promise<EmailTemplate[]> {
    return this.templateRepo.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Template not found');
    }
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<{ subject: string; htmlBody: string; textBody?: string }> {
    const template = await this.getTemplate(templateId);

    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    // Check if all required variables are provided
    const missing = template.variables.filter((v) => !(v in variables));
    if (missing.length > 0) {
      throw new BadRequestException(`Missing template variables: ${missing.join(', ')}`);
    }

    return {
      subject: this.templateEngine.render(template.subject, variables),
      htmlBody: this.templateEngine.render(template.htmlBody, variables),
      textBody: template.textBody
        ? this.templateEngine.render(template.textBody, variables)
        : undefined,
    };
  }
}
