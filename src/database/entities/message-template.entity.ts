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
 * MessageTemplate Entity
 * Templates de mensagens reutilizáveis para campanhas
 * Suporta variáveis dinâmicas (ex: {{nome}}, {{empresa}})
 */
@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Nome do template

  @Column({ type: 'text' })
  content: string; // Conteúdo do template com variáveis

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null; // marketing, support, notification, etc

  @Column({ type: 'json', nullable: true })
  variables: string | null; // Lista de variáveis disponíveis

  @Column({ type: 'tinyint', default: 1 })
  active: number; // 1 = ativo, 0 = inativo

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
