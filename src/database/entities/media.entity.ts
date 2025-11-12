import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Media Entity
 * Mapeia a tabela existente do Laravel: 'media'
 * Usada para compatibilidade com testes/cleanup e integrações legadas.
 */
@Entity('media')
export class Media {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimetype: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  size: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  url: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date | null;
}

