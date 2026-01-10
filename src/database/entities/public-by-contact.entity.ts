import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { Campaign } from './campaign.entity';
import type { User } from './user.entity';
import type { Publics } from './publics.entity';
import type { Contact } from './contact.entity';

@Entity('public_by_contacts')
export class PublicByContact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'campaign_id', type: 'bigint', unsigned: true, nullable: true })
  campaign_id: number | null;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ name: 'public_id', type: 'bigint', unsigned: true })
  public_id: number;

  @Column({ name: 'contact_id', type: 'bigint', unsigned: true })
  contact_id: number;

  @Column({ name: 'is_blocked', type: 'tinyint', nullable: true, default: 0 })
  is_blocked: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  read: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  send: number | null;

  @Column({ name: 'not_receive', type: 'tinyint', nullable: true, default: 0 })
  not_receive: number | null;

  @Column({ type: 'tinyint', nullable: true, default: 0 })
  interactions: number | null;

  @Column({ name: 'has_error', type: 'tinyint', nullable: true, default: 0 })
  has_error: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('Campaign', 'publicByContacts', { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<Campaign>;

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne('Publics', 'publicByContacts')
  @JoinColumn({ name: 'public_id' })
  public: Relation<Publics>;

  @ManyToOne('Contact', 'publicByContacts')
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<Contact>;
}
