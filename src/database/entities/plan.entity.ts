import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Plan Entity
 * Maps to existing Laravel 'plans' table
 * NEVER modify table structure - use existing schema
 */
@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  code_mp: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'float', precision: 8, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'float', precision: 8, scale: 2, default: 0 })
  value_promotion: number;

  @Column({ type: 'tinyint', default: 0 })
  unlimited: boolean;

  @Column({ type: 'tinyint', default: 0 })
  medias: boolean;

  @Column({ type: 'tinyint', default: 0 })
  reports: boolean;

  @Column({ type: 'tinyint', default: 0 })
  schedule: boolean;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  popular: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  code_product: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;
}
