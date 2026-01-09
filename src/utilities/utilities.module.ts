import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Configuration } from '../database/entities/configuration.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { QueueModule } from '../queue/queue.module';
import { UtilitiesController } from './utilities.controller';
import { UtilitiesService } from './utilities.service';

/**
 * UtilitiesModule
 *
 * Módulo de utilitários do sistema
 * Endpoints de health, recovery, debug, sync
 *
 * Total: 20 endpoints (inclui queue status)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Contact, Configuration]),
    ContactsModule,
    QueueModule, // Import for queue status monitoring
  ],
  controllers: [UtilitiesController],
  providers: [UtilitiesService],
  exports: [UtilitiesService],
})
export class UtilitiesModule {}
