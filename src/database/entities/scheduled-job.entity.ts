import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('scheduled_jobs')
export class ScheduledJob {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({
    name: 'campaign_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  campaign_id: number | null;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  user_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  type: string | null;

  @Column({ type: 'text', nullable: true })
  payload: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduled_at: Date | null;

  @Column({ name: 'executed_at', type: 'timestamp', nullable: true })
  executed_at: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'pending' })
  status: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
