import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * MessageByContact Entity
 * Maps to existing Laravel 'message_by_contacts' table
 * Tracks message status per contact
 * NEVER modify table structure - use existing schema
 */
@Entity('message_by_contacts')
export class MessageByContact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  user_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  campaign_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  message_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  contact_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  number: string | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  send: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  read: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  delivered: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
