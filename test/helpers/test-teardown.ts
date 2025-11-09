import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Helper para fechar todas as conexões após os testes E2E
 * Garante que o Jest possa sair corretamente sem conexões abertas
 */
export async function closeTestConnections(
  app: INestApplication,
  dataSource?: DataSource,
): Promise<void> {
  try {
    // Fechar DataSource explicitamente se fornecido
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    // Fechar aplicação NestJS (fecha todas as conexões internas)
    if (app) {
      await app.close();
    }
  } catch (error) {
    // Ignorar erros durante o fechamento para não mascarar erros dos testes
    console.warn('Warning during test teardown:', error.message);
  }
}

