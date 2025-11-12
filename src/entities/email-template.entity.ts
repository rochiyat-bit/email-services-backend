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
} from 'typeorm';
import { EmailAccount } from './email-account.entity';
import { EmailQueue } from './email-queue.entity';

@Entity('email_templates')
@Index(['accountId', 'name'])
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  accountId: string;

  @Column()
  name: string;

  @Column()
  subject: string;

  @Column('text')
  htmlBody: string;

  @Column('text', { nullable: true })
  textBody: string;

  // Array of variable names used in the template
  // e.g., ['name', 'company', 'verificationLink']
  @Column('simple-array', { nullable: true })
  variables: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailAccount, (account) => account.templates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: EmailAccount;

  @OneToMany(() => EmailQueue, (queue) => queue.template)
  queues: EmailQueue[];
}
