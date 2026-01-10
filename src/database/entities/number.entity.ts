import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';
import type { Server } from './server.entity';
import type { Campaign } from './campaign.entity';
import type { Label } from './label.entity';
import type { Contact } from './contact.entity';

@Entity('numbers')
export class Number {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'server_id', type: 'bigint', unsigned: true, nullable: true })
  server_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cel: string | null;

  @Column({ type: 'text', nullable: true })
  photo: string | null;

  @Column({ type: 'varchar', length: 255 })
  instance: string;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  status: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  extra: number | null;

  @Column({ name: 'chat_sync', type: 'int', nullable: true, default: 0 })
  chat_sync: number | null;

  @Column({
    name: 'status_connection',
    type: 'tinyint',
    nullable: true,
    default: 0,
  })
  status_connection: number | null;

  @Column({ type: 'text', nullable: true })
  qrcode: string | null;

  @Column({ name: 'token_wpp', type: 'varchar', length: 250, nullable: true })
  token_wpp: string | null;

  @Column({ name: 'token_wpp_expiresin', type: 'datetime', nullable: true })
  token_wpp_expiresin: Date | null;

  @Column({ name: 'canceled_at', type: 'date', nullable: true })
  canceled_at: Date | null;

  @Column({
    name: 'labels_active',
    type: 'tinyint',
    nullable: true,
    default: 0,
  })
  labels_active: number | null;

  @Column({ name: 'last_sync', type: 'timestamp', nullable: true })
  last_sync: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'numbers')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Server', 'numbers', { nullable: true })
  @JoinColumn({ name: 'server_id' })
  server: Relation<Server>;

  @OneToMany('Campaign', 'number')
  campaigns: Relation<Campaign[]>;

  @OneToMany('Label', 'number')
  labels: Relation<Label[]>;

  @OneToMany('Contact', 'number')
  contacts: Relation<Contact[]>;
}
