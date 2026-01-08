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
import type { Contact } from './contact.entity';
import type { User } from './user.entity';

@Entity('block_contacts')
export class BlockContact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'campaign_id', type: 'bigint', unsigned: true, nullable: true })
  campaign_id: number | null;

  @Column({ name: 'contact_id', type: 'bigint', unsigned: true })
  contact_id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  user_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne('Campaign', 'blockedContacts', { nullable: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Relation<Campaign>;

  @ManyToOne('Contact', 'blockedInCampaigns')
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<Contact>;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
