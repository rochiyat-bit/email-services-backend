import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailQueue, EmailQueueStatus } from '../entities/email-queue.entity';
import { EmailLog, EmailStatus } from '../entities/email-log.entity';
import { EmailAccount } from '../entities/email-account.entity';
import { EmailProviderFactory } from '../providers/provider.factory';
import { EncryptionUtil } from '../utils/encryption.util';
import { EmailJob } from './email.queue';

@Processor('email', {
  concurrency: 5,
})
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepo: Repository<EmailQueue>,
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
    @InjectRepository(EmailAccount)
    private readonly emailAccountRepo: Repository<EmailAccount>,
    private readonly providerFactory: EmailProviderFactory,
    private readonly encryptionUtil: EncryptionUtil,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<any> {
    const { queueId, accountId } = job.data;

    this.logger.log(`Processing email job ${job.id} for queue ${queueId}`);

    try {
      // Get queue item from database
      const queueItem = await this.emailQueueRepo.findOne({
        where: { id: queueId },
        relations: ['account'],
      });

      if (!queueItem) {
        throw new Error(`Queue item ${queueId} not found`);
      }

      // Update status to processing
      await this.emailQueueRepo.update(queueId, {
        status: EmailQueueStatus.PROCESSING,
      });

      // Get account details
      const account = await this.emailAccountRepo.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Check quota
      if (!this.checkQuota(account)) {
        throw new Error('Email quota exceeded');
      }

      // Decrypt credentials
      const credentials = this.encryptionUtil.decrypt(account.credentials as any);

      // Create provider instance
      const provider = this.providerFactory.createProvider(
        account.provider,
        credentials,
      );

      // Send email
      const result = await provider.sendEmail({
        from: account.email,
        to: queueItem.to,
        cc: queueItem.cc,
        bcc: queueItem.bcc,
        subject: queueItem.subject,
        htmlBody: queueItem.htmlBody,
        textBody: queueItem.textBody,
        attachments: queueItem.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Update queue status
      await this.emailQueueRepo.update(queueId, {
        status: EmailQueueStatus.SENT,
      });

      // Create email log
      await this.emailLogRepo.save({
        queueId: queueItem.id,
        accountId: account.id,
        provider: account.provider,
        messageId: result.messageId,
        to: queueItem.to,
        cc: queueItem.cc,
        bcc: queueItem.bcc,
        subject: queueItem.subject,
        status: EmailStatus.SENT,
        sentAt: new Date(),
        metadata: result.metadata,
      });

      // Update quota
      await this.updateQuota(account);

      this.logger.log(`Successfully sent email ${result.messageId}`);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, error.stack);

      // Update queue item with error
      await this.emailQueueRepo.update(queueId, {
        status: EmailQueueStatus.FAILED,
        error: error.message,
        retryCount: () => 'retry_count + 1',
      });

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJob>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJob>, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EmailJob>) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  /**
   * Check if account has available quota
   */
  private checkQuota(account: EmailAccount): boolean {
    const { used, daily } = account.quota;
    return used < daily;
  }

  /**
   * Update account quota
   */
  private async updateQuota(account: EmailAccount): Promise<void> {
    const quota = account.quota;
    quota.used += 1;

    await this.emailAccountRepo.update(account.id, {
      quota,
    });
  }
}
