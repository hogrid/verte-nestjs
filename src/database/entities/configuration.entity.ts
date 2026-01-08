import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';

@Entity('configurations')
export class Configuration {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'timer_delay', type: 'int', default: 30 })
  timer_delay: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @OneToOne('User', 'configuration')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
