import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailQueue } from './email-queue.entity';

@Entity('email_attachments')
@Index(['queueId'])
export class EmailAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  queueId: string;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column()
  storageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EmailQueue, (queue) => queue.attachmentFiles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'queueId' })
  queue: EmailQueue;
}
