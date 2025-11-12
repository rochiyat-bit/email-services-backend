import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EmailPriority } from '../entities/email-queue.entity';

export interface EmailJob {
  queueId: string;
  accountId: string;
  priority: EmailPriority;
}

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue<EmailJob>,
  ) {}

  /**
   * Add email to queue for processing
   */
  async addEmailToQueue(
    queueId: string,
    accountId: string,
    priority: EmailPriority = EmailPriority.NORMAL,
    delay: number = 0,
  ): Promise<void> {
    const jobPriority = this.getPriorityValue(priority);

    await this.emailQueue.add(
      'send-email',
      {
        queueId,
        accountId,
        priority,
      },
      {
        priority: jobPriority,
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
        },
      },
    );
  }

  /**
   * Add bulk emails to queue
   */
  async addBulkEmailsToQueue(
    jobs: Array<{
      queueId: string;
      accountId: string;
      priority?: EmailPriority;
      delay?: number;
    }>,
  ): Promise<void> {
    const bulkJobs = jobs.map((job) => ({
      name: 'send-email',
      data: {
        queueId: job.queueId,
        accountId: job.accountId,
        priority: job.priority || EmailPriority.NORMAL,
      },
      opts: {
        priority: this.getPriorityValue(job.priority || EmailPriority.NORMAL),
        delay: job.delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 2000,
        },
      },
    }));

    await this.emailQueue.addBulk(bulkJobs);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(): Promise<void> {
    await this.emailQueue.pause();
  }

  /**
   * Resume queue
   */
  async resumeQueue(): Promise<void> {
    await this.emailQueue.resume();
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(grace: number = 24 * 3600 * 1000): Promise<void> {
    await this.emailQueue.clean(grace, 1000, 'completed');
    await this.emailQueue.clean(grace * 7, 1000, 'failed');
  }

  /**
   * Convert priority enum to numeric value
   */
  private getPriorityValue(priority: EmailPriority): number {
    switch (priority) {
      case EmailPriority.HIGH:
        return 1;
      case EmailPriority.NORMAL:
        return 2;
      case EmailPriority.LOW:
        return 3;
      default:
        return 2;
    }
  }
}
