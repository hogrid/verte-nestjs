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
 * SimplifiedPublic Entity
 * Maps to existing Laravel 'simplified_public' table
 * Represents simplified campaign publics
 * NEVER modify table structure - use existing schema
 */
@Entity('simplified_public')
export class SimplifiedPublic {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  number_id: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  progress: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uuid: string | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  status: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

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

  @ManyToOne(() => Number, { nullable: true })
  @JoinColumn({ name: 'number_id' })
  number: Number | null;
}
