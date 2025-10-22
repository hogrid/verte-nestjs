import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Configuration Entity
 * Maps to existing Laravel 'configurations' table
 * NEVER modify table structure - use existing schema
 */
@Entity('configurations')
export class Configuration {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'int', default: 30 })
  timer_delay: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Relationships (matching Laravel Eloquent)
  @OneToOne(() => User, (user) => user.config)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
