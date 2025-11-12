import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailLog } from './email-log.entity';

export enum WebhookEventType {
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
}

@Entity('email_webhooks')
@Index(['emailLogId', 'eventType'])
@Index(['provider', 'createdAt'])
export class EmailWebhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  emailLogId: string;

  @Column()
  provider: string;

  @Column({
    type: 'enum',
    enum: WebhookEventType,
  })
  eventType: WebhookEventType;

  @Column('jsonb')
  eventData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EmailLog, (log) => log.webhooks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emailLogId' })
  emailLog: EmailLog;
}
