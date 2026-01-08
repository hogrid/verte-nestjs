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
import type { Number } from './number.entity';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 250 })
  ip: string;

  @Column({ type: 'int', nullable: true, default: 15 })
  limit: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  total: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  type: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @OneToMany('Number', 'server')
  numbers: Relation<Number[]>;
}
