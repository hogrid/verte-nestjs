import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('simplified_public')
export class SimplifiedPublic {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'number_id', type: 'bigint', unsigned: true, nullable: true })
  number_id: number | null;

  @Column({
    name: 'campaign_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  campaign_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uuid: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  contacts: string | null;

  @Column({ name: 'total_contacts', type: 'int', nullable: true, default: 0 })
  total_contacts: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  status: number | null;

  @Column({ type: 'text', nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
