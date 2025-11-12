import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmailLog, EmailStatus } from '../entities/email-log.entity';
import { EmailQueue, EmailQueueStatus } from '../entities/email-queue.entity';

export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepo: Repository<EmailLog>,
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepo: Repository<EmailQueue>,
  ) {}

  /**
   * Get email analytics for an account
   */
  async getAccountAnalytics(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EmailAnalytics> {
    const whereClause: any = { accountId };

    if (startDate && endDate) {
      whereClause.sentAt = Between(startDate, endDate);
    }

    const logs = await this.emailLogRepo.find({ where: whereClause });

    return this.calculateAnalytics(logs);
  }

  /**
   * Get analytics for specific time period
   */
  async getAnalyticsByPeriod(
    accountId: string,
    period: 'day' | 'week' | 'month',
  ): Promise<EmailAnalytics> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    return this.getAccountAnalytics(accountId, startDate, endDate);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(accountId?: string) {
    const whereClause: any = {};
    if (accountId) {
      whereClause.accountId = accountId;
    }

    const [pending, processing, sent, failed, cancelled] = await Promise.all([
      this.emailQueueRepo.count({
        where: { ...whereClause, status: EmailQueueStatus.PENDING },
      }),
      this.emailQueueRepo.count({
        where: { ...whereClause, status: EmailQueueStatus.PROCESSING },
      }),
      this.emailQueueRepo.count({
        where: { ...whereClause, status: EmailQueueStatus.SENT },
      }),
      this.emailQueueRepo.count({
        where: { ...whereClause, status: EmailQueueStatus.FAILED },
      }),
      this.emailQueueRepo.count({
        where: { ...whereClause, status: EmailQueueStatus.CANCELLED },
      }),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      cancelled,
      total: pending + processing + sent + failed + cancelled,
    };
  }

  /**
   * Get top performing templates
   */
  async getTopTemplates(accountId: string, limit: number = 10) {
    const query = this.emailLogRepo
      .createQueryBuilder('log')
      .leftJoin('log.queue', 'queue')
      .select('queue.templateId', 'templateId')
      .addSelect('COUNT(*)', 'sent')
      .addSelect('SUM(CASE WHEN log.status = :opened THEN 1 ELSE 0 END)', 'opens')
      .addSelect('SUM(CASE WHEN log.status = :clicked THEN 1 ELSE 0 END)', 'clicks')
      .where('log.accountId = :accountId', { accountId })
      .andWhere('queue.templateId IS NOT NULL')
      .setParameter('opened', EmailStatus.OPENED)
      .setParameter('clicked', EmailStatus.CLICKED)
      .groupBy('queue.templateId')
      .orderBy('opens', 'DESC')
      .limit(limit);

    return query.getRawMany();
  }

  /**
   * Calculate analytics from logs
   */
  private calculateAnalytics(logs: EmailLog[]): EmailAnalytics {
    const totalSent = logs.length;
    const totalDelivered = logs.filter((l) => l.deliveredAt !== null).length;
    const totalOpened = logs.filter((l) => l.openedAt !== null).length;
    const totalClicked = logs.filter((l) => l.clickedAt !== null).length;
    const totalBounced = logs.filter((l) => l.status === EmailStatus.BOUNCED).length;
    const totalComplained = logs.filter((l) => l.status === EmailStatus.COMPLAINED).length;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplained,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
    };
  }
}
