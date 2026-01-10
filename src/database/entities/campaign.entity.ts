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
import type { Number } from './number.entity';
import type { Publics } from './publics.entity';
import type { Message } from './message.entity';
import { PublicByContact } from './public-by-contact.entity';
import { BlockContact } from './block-contact.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'public_id', type: 'bigint', unsigned: true, nullable: true })
  public_id: number | null;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'number_id', type: 'bigint', unsigned: true })
  number_id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @Column({ type: 'tinyint', default: 1 })
  type: number;

  @Column({ name: 'schedule_date', type: 'timestamp', nullable: true })
  schedule_date: Date | null;

  @Column({
    name: 'total_interactions',
    type: 'int',
    nullable: true,
    default: 0,
  })
  total_interactions: number | null;

  @Column({ name: 'total_read', type: 'int', nullable: true, default: 0 })
  total_read: number | null;

  @Column({ name: 'total_delivered', type: 'int', nullable: true, default: 0 })
  total_delivered: number | null;

  @Column({ name: 'total_sent', type: 'int', nullable: true, default: 0 })
  total_sent: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  status: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  progress: number | null;

  @Column({ name: 'date_finished', type: 'timestamp', nullable: true })
  date_finished: Date | null;

  @Column({ name: 'date_end', type: 'timestamp', nullable: true })
  date_end: Date | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  paused: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  canceled: number | null;

  @Column({
    name: 'processed_contacts',
    type: 'int',
    nullable: true,
    default: 0,
  })
  processed_contacts: number | null;

  @Column({ type: 'text', nullable: true })
  labels: string | null;

  @Column({ name: 'total_contacts', type: 'int', nullable: true, default: 0 })
  total_contacts: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  call: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'campaigns')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Number', 'campaigns')
  @JoinColumn({ name: 'number_id' })
  number: Relation<Number>;

  @ManyToOne('Publics', 'campaigns', { nullable: true })
  @JoinColumn({ name: 'public_id' })
  public: Relation<Publics>;

  @OneToMany('Message', 'campaign')
  messages: Relation<Message[]>;

  @OneToMany(() => PublicByContact, (pbc) => pbc.campaign)
  publicByContacts: PublicByContact[];

  @OneToMany(() => BlockContact, (bc) => bc.campaign)
  blockedContacts: BlockContact[];
}
