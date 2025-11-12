import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailQueue, EmailQueueStatus, EmailPriority } from '../entities/email-queue.entity';
import { EmailAccount, AccountStatus } from '../entities/email-account.entity';
import { EmailQueueService } from '../queues/email.queue';
import { SendEmailDto, SendTemplateEmailDto } from '../dto';
import { TemplateService } from './template.service';
import { ValidatorUtil } from '../utils/validator.util';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepo: Repository<EmailQueue>,
    @InjectRepository(EmailAccount)
    private readonly emailAccountRepo: Repository<EmailAccount>,
    private readonly queueService: EmailQueueService,
    private readonly templateService: TemplateService,
    private readonly validatorUtil: ValidatorUtil,
  ) {}

  /**
   * Send email - adds to queue for async processing
   */
  async sendEmail(dto: SendEmailDto): Promise<{ queueId: string; status: string }> {
    // Validate email addresses
    if (!this.validatorUtil.areValidEmails(dto.to)) {
      throw new BadRequestException('Invalid recipient email addresses');
    }

    // Get account
    const account = await this.getActiveAccount(dto.accountId);

    // Check quota
    this.checkQuota(account);

    // Create queue item
    const queueItem = this.emailQueueRepo.create({
      accountId: dto.accountId,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      htmlBody: dto.htmlBody,
      textBody: dto.textBody,
      attachments: dto.attachments as any,
      priority: dto.priority || EmailPriority.NORMAL,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      status: EmailQueueStatus.PENDING,
      metadata: dto.metadata,
    });

    const saved = await this.emailQueueRepo.save(queueItem);

    // Add to queue
    const delay = dto.scheduledAt
      ? new Date(dto.scheduledAt).getTime() - Date.now()
      : 0;

    await this.queueService.addEmailToQueue(
      saved.id,
      dto.accountId,
      dto.priority,
      delay > 0 ? delay : 0,
    );

    return {
      queueId: saved.id,
      status: 'queued',
    };
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(dto: SendTemplateEmailDto): Promise<{ queueId: string; status: string }> {
    // Validate email addresses
    if (!this.validatorUtil.areValidEmails(dto.to)) {
      throw new BadRequestException('Invalid recipient email addresses');
    }

    // Get account
    const account = await this.getActiveAccount(dto.accountId);

    // Check quota
    this.checkQuota(account);

    // Render template
    const rendered = await this.templateService.renderTemplate(dto.templateId, dto.variables);

    // Create queue item
    const queueItem = this.emailQueueRepo.create({
      accountId: dto.accountId,
      templateId: dto.templateId,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      priority: dto.priority || EmailPriority.NORMAL,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      status: EmailQueueStatus.PENDING,
      metadata: dto.metadata,
    });

    const saved = await this.emailQueueRepo.save(queueItem);

    // Add to queue
    const delay = dto.scheduledAt
      ? new Date(dto.scheduledAt).getTime() - Date.now()
      : 0;

    await this.queueService.addEmailToQueue(
      saved.id,
      dto.accountId,
      dto.priority,
      delay > 0 ? delay : 0,
    );

    return {
      queueId: saved.id,
      status: 'queued',
    };
  }

  /**
   * Get email queue status
   */
  async getQueueStatus(queueId: string) {
    const queueItem = await this.emailQueueRepo.findOne({
      where: { id: queueId },
      relations: ['log'],
    });

    if (!queueItem) {
      throw new NotFoundException('Queue item not found');
    }

    return {
      id: queueItem.id,
      status: queueItem.status,
      to: queueItem.to,
      subject: queueItem.subject,
      priority: queueItem.priority,
      scheduledAt: queueItem.scheduledAt,
      retryCount: queueItem.retryCount,
      error: queueItem.error,
      createdAt: queueItem.createdAt,
      log: queueItem.log
        ? {
            messageId: queueItem.log.messageId,
            status: queueItem.log.status,
            sentAt: queueItem.log.sentAt,
            deliveredAt: queueItem.log.deliveredAt,
            openedAt: queueItem.log.openedAt,
          }
        : null,
    };
  }

  /**
   * Cancel queued email
   */
  async cancelEmail(queueId: string): Promise<void> {
    const queueItem = await this.emailQueueRepo.findOne({
      where: { id: queueId },
    });

    if (!queueItem) {
      throw new NotFoundException('Queue item not found');
    }

    if (queueItem.status !== EmailQueueStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending emails');
    }

    await this.emailQueueRepo.update(queueId, {
      status: EmailQueueStatus.CANCELLED,
    });
  }

  /**
   * Get active account and validate
   */
  private async getActiveAccount(accountId: string): Promise<EmailAccount> {
    const account = await this.emailAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Email account not found');
    }

    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(`Account is ${account.status}`);
    }

    return account;
  }

  /**
   * Check if account has available quota
   */
  private checkQuota(account: EmailAccount): void {
    const { used, daily } = account.quota;

    if (used >= daily) {
      throw new BadRequestException('Daily email quota exceeded');
    }
  }
}
