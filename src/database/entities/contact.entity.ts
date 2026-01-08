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
import type { Publics } from './publics.entity';
import type { Number } from './number.entity';
import { PublicByContact } from './public-by-contact.entity';
import { MessageByContact } from './message-by-contact.entity';
import { BlockContact } from './block-contact.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'public_id', type: 'int', nullable: true })
  public_id: number | null;

  @Column({ name: 'number_id', type: 'int', nullable: true })
  number_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255 })
  number: string;

  @Column({ name: 'cel_owner', type: 'varchar', length: 60, nullable: true })
  cel_owner: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'variable_1', type: 'varchar', length: 250, nullable: true })
  variable_1: string | null;

  @Column({ name: 'variable_2', type: 'varchar', length: 250, nullable: true })
  variable_2: string | null;

  @Column({ name: 'variable_3', type: 'varchar', length: 250, nullable: true })
  variable_3: string | null;

  @Column({ type: 'tinyint', nullable: true, default: 1 })
  type: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 1 })
  status: number | null;

  @Column({ type: 'longtext', nullable: true })
  labels: string | null;

  @Column({ type: 'text', nullable: true })
  labelsName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'contacts')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Publics', 'contacts', { nullable: true })
  @JoinColumn({ name: 'public_id' })
  public: Relation<Publics>;

  @ManyToOne('Number', 'contacts', { nullable: true })
  @JoinColumn({ name: 'number_id' })
  numberEntity: Relation<Number>;

  @OneToMany(() => PublicByContact, (pbc) => pbc.contact)
  publicByContacts: PublicByContact[];

  @OneToMany(() => MessageByContact, (mbc) => mbc.contact)
  messageByContacts: MessageByContact[];

  @OneToMany(() => BlockContact, (bc) => bc.contact)
  blockedInCampaigns: BlockContact[];
}
