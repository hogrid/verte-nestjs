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
import { Campaign } from './campaign.entity';

/**
 * Message Entity
 * Mapeia para a tabela 'messages' existente do Laravel
 * Representa mensagens dentro de uma campanha
 *
 * IMPORTANTE: A coluna deleted_at JÁ EXISTE no banco de dados Laravel original.
 * Ver docs/migration/database-schema.md linha 366 para schema completo.
 * NUNCA modifique a estrutura da tabela - use o schema existente.
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

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
