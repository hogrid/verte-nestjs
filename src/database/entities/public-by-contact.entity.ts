import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Public } from './public.entity';
import { Contact } from './contact.entity';

/**
 * PublicByContact Entity
 * Maps to existing Laravel 'public_by_contacts' table
 * Represents the relationship between publics and contacts with campaign metrics
 * Tracks blocking, sending, reading, and interaction status
 * NEVER modify table structure - use existing schema
 */
@Entity('public_by_contacts')
export class PublicByContact {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true })
  public_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  campaign_id: number | null;

  @Column({ type: 'bigint', unsigned: true })
  contact_id: number;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  is_blocked: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  read: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  send: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  not_receive: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  interactions: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  has_error: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Public)
  @JoinColumn({ name: 'public_id' })
  public: Public;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;
}
