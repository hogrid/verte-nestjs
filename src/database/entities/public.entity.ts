import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Number } from './number.entity';
import { Contact } from './contact.entity';
import { PublicByContact } from './public-by-contact.entity';

/**
 * Public Entity
 * Maps to existing Laravel 'publics' table
 * Represents target audiences/públicos for campaigns
 * NEVER modify table structure - use existing schema
 */
@Entity('publics')
export class Public {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'int', nullable: true })
  number_id: number | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo: string | null;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  from_chat: number | null;

  @Column({ type: 'int', nullable: true })
  from_tag: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  number: string | null;

  @Column({ type: 'text', nullable: true })
  labels: string | null;

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

  @ManyToOne(() => Number)
  @JoinColumn({ name: 'number_id' })
  numberInstance: Number;

  @OneToMany(() => Contact, (contact) => contact.public)
  contacts: Contact[];

  @OneToMany(() => PublicByContact, (pbc) => pbc.public)
  publicByContacts: PublicByContact[];
}
