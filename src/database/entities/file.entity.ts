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

/**
 * File Entity
 * Maps to existing Laravel 'files' table (se existir) ou cria nova
 * Armazena metadados de arquivos uploadados (imagens, vídeos, áudios)
 */
@Entity('files')
export class File {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 255 })
  filename: string; // Nome original do arquivo

  @Column({ type: 'varchar', length: 255 })
  path: string; // Caminho do arquivo no sistema

  @Column({ type: 'varchar', length: 100 })
  mimetype: string; // image/jpeg, video/mp4, audio/mpeg

  @Column({ type: 'bigint', unsigned: true })
  size: number; // Tamanho em bytes

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string | null; // image, video, audio, document

  @Column({ type: 'varchar', length: 255, nullable: true })
  url: string | null; // URL pública do arquivo

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
}
