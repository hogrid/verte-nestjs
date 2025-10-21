import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * PasswordReset Entity
 * Maps to existing Laravel 'password_resets' table
 * NEVER modify table structure - use existing schema
 * Note: This table has no primary key in Laravel
 */
@Entity('password_resets')
export class PasswordReset {
  @Column({ type: 'varchar', length: 255, primary: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  token: string;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date | null;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}
