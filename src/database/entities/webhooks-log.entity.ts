import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('webhooks_log')
export class WebhooksLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  event: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string | null;

  @Column({ type: 'longtext', nullable: true })
  payload: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  status: string | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
