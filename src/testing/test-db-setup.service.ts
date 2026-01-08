import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TestDbSetupService implements OnModuleInit {
  private readonly logger = new Logger(TestDbSetupService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (process.env.ALLOW_TEST_TABLE_SETUP !== '1') {
      return;
    }

    try {
      await this.cleanupTestData();
      await this.ensureMessageTemplatesTable();
      await this.ensureFilesTable();
      await this.ensureSystemSettingsTable();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao preparar tabelas de teste: ${msg}`);
    }
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const db = this.dataSource.options.database as string;
    const result = await this.dataSource.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
      [db, tableName],
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async ensureMessageTemplatesTable() {
    const exists = await this.tableExists('message_templates');
    if (exists) return;
    this.logger.log(
      'Criando tabela ausente: message_templates (somente em testes)',
    );

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NULL,
        variables JSON NULL,
        active TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.dataSource
      .query(
        'CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id)',
      )
      .catch(() => void 0);
  }

  private async ensureFilesTable() {
    const exists = await this.tableExists('files');
    if (exists) return;
    this.logger.log('Criando tabela ausente: files (somente em testes)');

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS files (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        filename VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        mimetype VARCHAR(100) NOT NULL,
        size BIGINT UNSIGNED NOT NULL,
        type VARCHAR(50) NULL,
        url VARCHAR(255) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.dataSource
      .query('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)')
      .catch(() => void 0);
  }

  /**
   * Em alguns ambientes, a tabela `settings` existente não é key/value.
   * Para os testes E2E que salvam chaves arbitrárias, criamos uma
   * tabela dedicada `system_settings` somente quando habilitado.
   */
  private async ensureSystemSettingsTable() {
    const exists = await this.tableExists('system_settings');
    if (exists) return;
    this.logger.log(
      'Criando tabela ausente: system_settings (somente em testes)',
    );

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'string',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.dataSource
      .query(
        'CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(`key`)',
      )
      .catch(() => void 0);
  }

  /**
   * Remove registros residuais que atrapalham reexecuções dos E2E
   * (duplicidades de email, FKs em cascata etc.).
   * Executa apenas em ambiente de teste.
   */
  private async cleanupTestData() {
    const emails = [
      'export-test@verte.com',
      'files-test@verte.com',
      'template-test@verte.com',
      'webhook-test@verte.com',
      'whatsapp-test@verte.com',
      'profile-test@verte.com',
      'publics.test@example.com',
      'campaign.test@example.com',
      'dashboard-test@verte.com',
      'utilities-test@verte.com',
      'extractor-test@verte.com',
      'admin-test@verte.com',
      'user-test@verte.com',
      'labelstest@verte.com',
      'contactstest@verte.com',
      'tempuser@test.com',
      'test@verte.com',
      'inactive@verte.com',
      'newuser@verte.com',
      'test@test.com',
      'novo-cliente@verte.com',
    ];

    const ids = await this.dataSource.query(
      `SELECT id, email FROM users WHERE email IN (${emails
        .map(() => '?')
        .join(',')})`,
      emails,
    );

    if (!Array.isArray(ids) || ids.length === 0) return;

    const userIds: number[] = ids.map((r: any) => Number(r.id)).filter(Boolean);
    if (userIds.length === 0) return;

    const inList = userIds.join(',');

    // Remover tabelas filhas antes
    const queries: string[] = [
      `DELETE FROM public_by_contacts WHERE user_id IN (${inList})`,
      `DELETE FROM message_by_contacts WHERE user_id IN (${inList})`,
      `DELETE FROM messages WHERE user_id IN (${inList})`,
      `DELETE FROM campaigns WHERE user_id IN (${inList})`,
      // simplified_public (singular)
      `DELETE FROM simplified_public WHERE user_id IN (${inList})`,
      `DELETE FROM custom_publics WHERE user_id IN (${inList})`,
      `DELETE FROM files WHERE user_id IN (${inList})`,
      `DELETE FROM message_templates WHERE user_id IN (${inList})`,
      `DELETE FROM payments WHERE user_id IN (${inList})`,
      `DELETE FROM configurations WHERE user_id IN (${inList})`,
      `DELETE FROM webhooks_log WHERE user_id IN (${inList})`,
      `DELETE FROM block_contacts WHERE user_id IN (${inList})`,
      `DELETE FROM labels WHERE user_id IN (${inList})`,
      `DELETE FROM publics WHERE user_id IN (${inList})`,
      `DELETE FROM contacts WHERE user_id IN (${inList})`,
      `DELETE FROM numbers WHERE user_id IN (${inList})`,
    ];

    for (const q of queries) {
      try {
        await this.dataSource.query(q);
      } catch (e) {
        console.error('cleanupTestData query failed:', q, e);
      }
    }

    // Tabela com email direto
    try {
      await this.dataSource.query(
        `DELETE FROM password_resets WHERE email IN (${emails
          .map(() => '?')
          .join(',')})`,
        emails,
      );
    } catch (e) {
      // noop
    }

    // Finalmente, remover usuários
    try {
      await this.dataSource.query(`DELETE FROM users WHERE id IN (${inList})`);
    } catch (e) {
      // noop
    }

    this.logger.log(
      `Cleanup de testes executado para ${userIds.length} usuário(s).`,
    );
  }
}
