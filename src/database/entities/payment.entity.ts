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
import type { User } from './user.entity';
import type { Plan } from './plan.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'plan_id', type: 'bigint', unsigned: true })
  plan_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true, default: '0' })
  status: string | null;

  @Column({ name: 'payment_id', type: 'varchar', length: 150, nullable: true })
  payment_id: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  from: string | null;

  @Column({ type: 'float', precision: 8, scale: 2, default: 0 })
  amount: number;

  @Column({
    name: 'extra_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  extra_number: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'payments')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Plan', 'payments')
  @JoinColumn({ name: 'plan_id' })
  plan: Relation<Plan>;
}
