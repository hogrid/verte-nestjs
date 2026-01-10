import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import type { Plan } from './plan.entity';
import type { Number } from './number.entity';
import type { Campaign } from './campaign.entity';
import type { Contact } from './contact.entity';
import type { Payment } from './payment.entity';
import type { Publics } from './publics.entity';
import type { Label } from './label.entity';
import type { Configuration } from './configuration.entity';
import type { Log } from './log.entity';

export type UserStatus = 'actived' | 'inactived';
export type UserProfile = 'administrator' | 'user';

// Enum-like objects for use as values
export const UserStatus = {
  ACTIVED: 'actived' as const,
  INACTIVED: 'inactived' as const,
};

export const UserProfile = {
  ADMINISTRATOR: 'administrator' as const,
  USER: 'user' as const,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'stripe_id', type: 'varchar', length: 255, nullable: true })
  stripe_id: string | null;

  @Column({ name: 'plan_id', type: 'bigint', unsigned: true, nullable: true })
  plan_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cel: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cpfCnpj: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: ['actived', 'inactived'],
    default: 'actived',
  })
  status: 'actived' | 'inactived';

  @Column({
    type: 'enum',
    enum: ['administrator', 'user'],
    default: 'user',
  })
  profile: 'administrator' | 'user';

  @Column({ type: 'tinyint', nullable: true, default: 1 })
  active: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo: string | null;

  @Column({ name: 'confirmed_mail', type: 'int', nullable: true, default: 0 })
  confirmed_mail: number | null;

  @Exclude()
  @Column({
    name: 'email_code_verication',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email_code_verication: string | null;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  email_verified_at: Date | null;

  @Exclude()
  @Column({
    name: 'remember_token',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  remember_token: string | null;

  @Column({ name: 'canceled_at', type: 'timestamp', nullable: true })
  canceled_at: Date | null;

  @Column({ name: 'due_access_at', type: 'timestamp', nullable: true })
  due_access_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('Plan', 'users', { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Relation<Plan>;

  @OneToMany('Number', 'user')
  numbers: Relation<Number[]>;

  @OneToMany('Campaign', 'user')
  campaigns: Relation<Campaign[]>;

  @OneToMany('Contact', 'user')
  contacts: Relation<Contact[]>;

  @OneToMany('Payment', 'user')
  payments: Relation<Payment[]>;

  @OneToMany('Publics', 'user')
  publics: Relation<Publics[]>;

  @OneToMany('Label', 'user')
  labels: Relation<Label[]>;

  @OneToOne('Configuration', 'user')
  configuration: Relation<Configuration>;

  @OneToMany('Log', 'user')
  logs: Relation<Log[]>;
}
