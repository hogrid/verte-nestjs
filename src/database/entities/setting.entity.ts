import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Setting Entity
 * Mapeia para a tabela 'settings' existente do Laravel
 * Armazena configurações globais do sistema (key-value)
 *
 * IMPORTANTE: A coluna deleted_at JÁ EXISTE no banco de dados Laravel original.
 * Ver docs/migration/database-schema.md linha 624 para schema completo.
 * NUNCA modifique a estrutura da tabela - use o schema existente.
 */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'varchar', length: 50, default: 'string' })
  type: string; // string, integer, boolean, json

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}
