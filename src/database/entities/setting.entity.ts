import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  key: string | null;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null;

  @Column({ name: 'timer_normal', type: 'int', nullable: true })
  timer_normal: number | null;

  @Column({ name: 'timer_fast', type: 'int', nullable: true })
  timer_fast: number | null;

  @Column({
    name: 'number_value',
    type: 'float',
    precision: 8,
    scale: 2,
    nullable: true,
    default: 0,
  })
  number_value: number | null;

  @Column({ name: 'limit_campaign', type: 'int', nullable: true })
  limit_campaign: number | null;

  @Column({ name: 'hour_open', type: 'varchar', length: 255, nullable: true })
  hour_open: string | null;

  @Column({ name: 'hour_close', type: 'varchar', length: 255, nullable: true })
  hour_close: string | null;

  @Column({ name: 'token_wpp', type: 'varchar', length: 255, nullable: true })
  token_wpp: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
