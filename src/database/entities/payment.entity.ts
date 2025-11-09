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
import { Plan } from './plan.entity';

/**
 * Payment Entity
 * Maps to existing Laravel 'payments' table (se existir) ou cria nova
 * Registra transações de pagamento (Stripe)
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  plan_id: number | null;

  @Column({ type: 'varchar', length: 50 })
  provider: string; // 'stripe'

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_payment_id: string | null; // Stripe Payment Intent ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_session_id: string | null; // Stripe Checkout Session ID

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'BRL' })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  status: string; // pending, succeeded, failed, canceled

  @Column({ type: 'text', nullable: true })
  metadata: string | null; // JSON com dados extras

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
