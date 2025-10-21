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

/**
 * Number Entity (WhatsApp instances)
 * Maps to existing Laravel 'numbers' table
 * NEVER modify table structure - use existing schema
 */
@Entity('numbers')
export class Number {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  server_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  instance: string;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  status: number; // 1 = Ativo; 0 = Inativo

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  status_connection: number; // 1 = Conectado; 0 = Desconectado

  @Column({ type: 'varchar', length: 255, nullable: true })
  cel: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo: string | null;

  @Column({ type: 'text', nullable: true })
  extra: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  token_wpp: string | null;

  @Column({ type: 'timestamp', nullable: true })
  token_wpp_expiresin: Date | null;

  @Column({ type: 'date', nullable: true })
  last_sync: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_code: string | null;

  @Column({ type: 'date', nullable: true })
  canceled_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Relationships (matching Laravel Eloquent)
  @ManyToOne(() => User, (user) => user.numbers)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
