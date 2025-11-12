import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { EmailAccount } from './email-account.entity';
import { EmailTemplate } from './email-template.entity';
import { EmailAttachment } from './email-attachment.entity';
import { EmailLog } from './email-log.entity';

export enum EmailQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EmailPriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface AttachmentData {
  filename: string;
  content?: string; // Base64 encoded
  path?: string; // File path or URL
  contentType?: string;
}

@Entity('email_queue')
@Index(['accountId', 'status'])
@Index(['scheduledAt'])
@Index(['status', 'createdAt'])
export class EmailQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  accountId: string;

  @Column('uuid', { nullable: true })
  templateId: string;

  @Column('simple-array')
  to: string[];

  @Column('simple-array', { nullable: true })
  cc: string[];

  @Column('simple-array', { nullable: true })
  bcc: string[];

  @Column()
  subject: string;

  @Column('text')
  htmlBody: string;

  @Column('text', { nullable: true })
  textBody: string;

  @Column('jsonb', { nullable: true })
  attachments: AttachmentData[];

  @Column({
    type: 'enum',
    enum: EmailPriority,
    default: EmailPriority.NORMAL,
  })
  priority: EmailPriority;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({
    type: 'enum',
    enum: EmailQueueStatus,
    default: EmailQueueStatus.PENDING,
  })
  @Index()
  status: EmailQueueStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column('text', { nullable: true })
  error: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailAccount, (account) => account.queues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: EmailAccount;

  @ManyToOne(() => EmailTemplate, (template) => template.queues, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;

  @OneToMany(() => EmailAttachment, (attachment) => attachment.queue)
  attachmentFiles: EmailAttachment[];

  @OneToOne(() => EmailLog, (log) => log.queue)
  log: EmailLog;
}
