import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { EmailAccount } from './email-account.entity';
import { EmailQueue } from './email-queue.entity';
import { EmailWebhook } from './email-webhook.entity';

export enum EmailStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
}

@Entity('email_logs')
@Index(['accountId', 'status'])
@Index(['messageId'])
@Index(['sentAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  queueId: string;

  @Column('uuid')
  @Index()
  accountId: string;

  @Column()
  provider: string;

  @Column({ unique: true })
  messageId: string;

  @Column('simple-array')
  to: string[];

  @Column('simple-array', { nullable: true })
  cc: string[];

  @Column('simple-array', { nullable: true })
  bcc: string[];

  @Column()
  subject: string;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.SENT,
  })
  status: EmailStatus;

  @Column({ type: 'timestamp' })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  bouncedAt: Date;

  @Column('text', { nullable: true })
  bounceReason: string;

  @Column({ default: 0 })
  opens: number;

  @Column({ default: 0 })
  clicks: number;

  @Column({ nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToOne(() => EmailQueue, (queue) => queue.log, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'queueId' })
  queue: EmailQueue;

  @ManyToOne(() => EmailAccount, (account) => account.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: EmailAccount;

  @OneToMany(() => EmailWebhook, (webhook) => webhook.emailLog)
  webhooks: EmailWebhook[];
}
