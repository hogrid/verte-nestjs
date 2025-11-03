import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Plan } from './plan.entity';
import { Number as NumberEntity } from './number.entity';
import { Configuration } from './configuration.entity';
import { Contact } from './contact.entity';

export enum UserStatus {
  ACTIVED = 'actived',
  INACTIVED = 'inactived',
}

export enum UserProfile {
  ADMINISTRATOR = 'administrator',
  USER = 'user',
}

/**
 * User Entity
 * Maps to existing Laravel 'users' table
 * NEVER modify table structure - use existing schema
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_id: string | null;

  @Column({ type: 'int', nullable: true })
  plan_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cel: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cpfCnpj: string | null;

  @Column({ type: 'varchar', length: 255 })
  @Exclude() // Never expose password in responses
  password: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVED,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: UserProfile,
    default: UserProfile.USER,
  })
  profile: UserProfile;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo: string | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  confirmed_mail: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_code_verication: string | null;

  @Column({ type: 'timestamp', nullable: true })
  email_verified_at: Date | null;

  @Column({ type: 'tinyint', nullable: true, default: 1 })
  active: number;

  @Column({ type: 'date', nullable: true })
  canceled_at: Date | null;

  @Column({ type: 'date', nullable: true })
  due_access_at: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Exclude() // Never expose remember_token
  remember_token: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  created_at: Date | null;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updated_at: Date | null;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Relationships (matching Laravel Eloquent)
  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToMany(() => NumberEntity, (number) => number.user)
  numbers: NumberEntity[];

  @OneToOne(() => Configuration, (config) => config.user)
  config: Configuration;

  @OneToMany(() => Contact, (contact) => contact.user)
  contacts: Contact[];
}
