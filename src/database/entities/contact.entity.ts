import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Number } from './number.entity';

/**
 * Contact Entity
 * Maps to existing Laravel 'contacts' table
 * NEVER modify table structure - use existing schema
 */
@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'int', nullable: true })
  public_id: number | null;

  @Column({ type: 'int', nullable: true })
  number_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255 })
  number: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  cel_owner: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  variable_1: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  variable_2: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  variable_3: string | null;

  @Column({ type: 'tinyint', default: 1, nullable: true })
  type: number;

  @Column({ type: 'tinyint', default: 1, nullable: true })
  status: number;

  @Column({ type: 'longtext', nullable: true })
  labels: string | null;

  @Column({ type: 'text', nullable: true })
  labelsName: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Relationships (matching Laravel Eloquent)
  @ManyToOne(() => User, (user) => user.contacts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Number, { nullable: true })
  @JoinColumn({ name: 'number_id' })
  whatsappNumber: Number;
}
