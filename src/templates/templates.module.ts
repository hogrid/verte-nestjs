import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from '../database/entities/message-template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

/**
 * TemplatesModule
 *
 * Módulo de gerenciamento de templates de mensagens reutilizáveis
 * Permite criação de templates com variáveis dinâmicas para campanhas
 *
 * Total: 4 endpoints CRUD
 */
@Module({
  imports: [TypeOrmModule.forFeature([MessageTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService], // Exportar para uso em outros módulos (ex: Campaigns)
})
export class TemplatesModule {}
