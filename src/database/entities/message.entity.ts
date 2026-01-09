import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';
import type { Campaign } from './campaign.entity';
import { MessageByContact } from './message-by-contact.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'campaign_id', type: 'bigint', unsigned: true })
  campaign_id: number;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  type: number | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'int', nullable: true })
  order: number | null;

  @Column({ type: 'text', nullable: true })
  media: string | null;

  @Column({ name: 'media_type', type: 'tinyint', nullable: true })
  media_type: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Campaign', 'messages')
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<Campaign>;

  @OneToMany(() => MessageByContact, (mbc) => mbc.message)
  messageByContacts: MessageByContact[];
}
