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
import type { Campaign } from './campaign.entity';
import type { Contact } from './contact.entity';
import { PublicByContact } from './public-by-contact.entity';

@Entity('publics')
export class Publics {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'number_id', type: 'bigint', unsigned: true, nullable: true })
  number_id: number | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo: string | null;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'from_chat', type: 'tinyint', nullable: true, default: 0 })
  from_chat: number | null;

  @Column({ name: 'from_tag', type: 'tinyint', nullable: true, default: 0 })
  from_tag: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  number: string | null;

  @Column({ type: 'text', nullable: true })
  labels: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('User', 'publics')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Number', { nullable: true })
  @JoinColumn({ name: 'number_id' })
  numberEntity: Relation<Number>;

  @OneToMany('Campaign', 'public')
  campaigns: Relation<Campaign[]>;

  @OneToMany('Contact', 'public')
  contacts: Relation<Contact[]>;

  @OneToMany(() => PublicByContact, (pbc) => pbc.public)
  publicByContacts: PublicByContact[];
}
