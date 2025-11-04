import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Campaign } from './campaign.entity';

/**
 * Message Entity
 * Maps to existing Laravel 'messages' table
 * Represents messages within a campaign
 * NEVER modify table structure - use existing schema
 */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  campaign_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'int', nullable: true })
  order: number | null;

  @Column({ type: 'text', nullable: true })
  media: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  media_type: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
