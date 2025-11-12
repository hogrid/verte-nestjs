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
 * Mapeia para a tabela 'payments' existente do Laravel
 * Registra transações de pagamento (Stripe, MercadoPago)
 *
 * Schema Laravel Real (CreatePaymentsTable migration):
 * - id, user_id, plan_id, status, payment_id, from, amount, extra_number
 * - timestamps, soft deletes
 *
 * IMPORTANTE: Usar APENAS as colunas que existem no Laravel!
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  plan_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  status: string | null; // Laravel: string with default 0

  @Column({ type: 'varchar', length: 150, nullable: true })
  payment_id: string | null; // Stripe session/payment ID

  @Column({ type: 'varchar', length: 80, nullable: true })
  from: string | null; // Payment provider (stripe, mercadopago, etc)

  @Column({ type: 'float', precision: 8, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  extra_number: number | null; // Additional number flag

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
