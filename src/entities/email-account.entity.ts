import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { EmailQueue } from './email-queue.entity';
import { EmailLog } from './email-log.entity';
import { EmailTemplate } from './email-template.entity';

export enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  SENDGRID = 'sendgrid',
  SES = 'ses',
  MAILGUN = 'mailgun',
  SMTP = 'smtp',
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FAILED = 'failed',
}

export interface QuotaInfo {
  daily: number;
  hourly: number;
  used: number;
  resetAt?: Date;
}

@Entity('email_accounts')
@Index(['userId', 'provider'])
@Index(['email'], { unique: true })
export class EmailAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: EmailProvider,
  })
  provider: EmailProvider;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  // Encrypted JSON containing provider-specific credentials
  // Gmail: { accessToken, refreshToken }
  // Outlook: { accessToken, refreshToken }
  // SendGrid: { apiKey }
  // SES: { accessKeyId, secretAccessKey }
  // Mailgun: { apiKey, domain }
  // SMTP: { host, port, user, password }
  @Column('jsonb')
  credentials: Record<string, any>;

  @Column('jsonb', { default: { daily: 500, hourly: 50, used: 0 } })
  quota: QuotaInfo;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => EmailQueue, (queue) => queue.account)
  queues: EmailQueue[];

  @OneToMany(() => EmailLog, (log) => log.account)
  logs: EmailLog[];

  @OneToMany(() => EmailTemplate, (template) => template.account)
  templates: EmailTemplate[];
}
