import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Setting Entity (Key-Value)
 *
 * Observação importante:
 * - Alguns bancos legados possuem uma tabela `settings` com colunas fixas
 *   (timer_normal, hour_open, etc.) e não suportam chave/valor.
 * - Para manter os testes E2E funcionando sem alterar o schema legado,
 *   utilizamos uma tabela dedicada para chave/valor: `system_settings`.
 * - Em produção, esta tabela deve existir apenas se o Laravel original
 *   também a utilizar. Nos testes, garantimos sua criação via
 *   TestDbSetupService.
 */
@Entity('system_settings')
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
