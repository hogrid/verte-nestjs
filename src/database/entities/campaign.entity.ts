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
} from 'typeorm';
import { User } from './user.entity';
import { Public } from './public.entity';
import { Number } from './number.entity';

/**
 * Campaign Entity
 * Maps to existing Laravel 'campaigns' table
 * Represents marketing campaigns sent via WhatsApp
 * NEVER modify table structure - use existing schema
 */
@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  public_id: number | null;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  number_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @Column({ type: 'tinyint', default: 1 })
  type: number; // 1 = Simplificada, 2 = Manual

  @Column({ type: 'timestamp', nullable: true })
  schedule_date: Date | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_interactions: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_read: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_delivered: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_sent: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  status: number | null; // 0 = Pendente, 1 = Em andamento, 2 = Concluída

  @Column({ type: 'timestamp', nullable: true })
  date_finished: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  date_end: Date | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  progress: number | null; // 0-100

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  paused: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  canceled: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  processed_contacts: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_send: Date | null;

  @Column({ type: 'text', nullable: true })
  labels: string | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total_contacts: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  call: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Public, { nullable: true })
  @JoinColumn({ name: 'public_id' })
  public: Public;

  @ManyToOne(() => Number)
  @JoinColumn({ name: 'number_id' })
  number: Number;

  // messages relationship will be added when Message entity is created
}
