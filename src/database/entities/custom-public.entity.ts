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
import { Number } from './number.entity';

/**
 * CustomPublic Entity
 * Mapeia para a tabela 'custom_publics' existente do Laravel
 * Representa públicos customizados de campanha com upload de arquivos
 *
 * IMPORTANTE: A coluna deleted_at JÁ EXISTE no banco de dados Laravel original.
 * Ver docs/migration/database-schema.md linha 682 para schema completo.
 * NUNCA modifique a estrutura da tabela - use o schema existente.
 */
@Entity('custom_publics')
export class CustomPublic {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  number_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file: string | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  progress: number | null;

  @Column({ type: 'tinyint', default: 0, nullable: true })
  status: number | null;

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

  @ManyToOne(() => Number, { nullable: true })
  @JoinColumn({ name: 'number_id' })
  number: Number | null;
}
