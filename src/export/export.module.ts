import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../database/entities/contact.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Message } from '../database/entities/message.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

/**
 * ExportModule
 *
 * Módulo de exportação de dados em CSV/XLSX
 * Permite download de contatos e relatórios de campanhas
 *
 * Total: 2 endpoints
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contact, Campaign, Message])],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
