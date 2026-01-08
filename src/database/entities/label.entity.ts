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
import type { Number } from './number.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'number_id', type: 'bigint', unsigned: true })
  number_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'labels')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Number', 'labels')
  @JoinColumn({ name: 'number_id' })
  number: Relation<Number>;
}
