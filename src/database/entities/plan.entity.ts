import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';
import type { Payment } from './payment.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'code_mp', type: 'varchar', length: 255, nullable: true })
  code_mp: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'float', precision: 8, scale: 2, default: 0 })
  value: number;

  @Column({
    name: 'value_promotion',
    type: 'float',
    precision: 8,
    scale: 2,
    default: 0,
  })
  value_promotion: number;

  @Column({ type: 'tinyint', default: 0 })
  unlimited: number;

  @Column({ type: 'tinyint', default: 0 })
  medias: number;

  @Column({ type: 'tinyint', default: 0 })
  reports: number;

  @Column({ type: 'tinyint', default: 0 })
  schedule: number;

  @Column({ type: 'tinyint', default: 0 })
  popular: number;

  @Column({ name: 'code_product', type: 'varchar', length: 255, nullable: true })
  code_product: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @OneToMany('User', 'plan')
  users: Relation<User[]>;

  @OneToMany('Payment', 'plan')
  payments: Relation<Payment[]>;
}
