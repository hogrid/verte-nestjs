import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { Message } from './message.entity';
import type { Contact } from './contact.entity';
import type { User } from './user.entity';

@Entity('message_by_contacts')
export class MessageByContact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'message_id', type: 'bigint', unsigned: true })
  message_id: number;

  @Column({ name: 'contact_id', type: 'bigint', unsigned: true })
  contact_id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  user_id: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  read: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  send: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  delivered: number | null;

  @Column({ name: 'has_error', type: 'tinyint', nullable: true, default: 0 })
  has_error: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('Message', 'messageByContacts')
  @JoinColumn({ name: 'message_id' })
  message: Relation<Message>;

  @ManyToOne('Contact', 'messageByContacts')
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<Contact>;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
