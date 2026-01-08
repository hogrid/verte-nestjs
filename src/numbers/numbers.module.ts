import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { Plan } from '../database/entities/plan.entity';
import { NumbersController } from './numbers.controller';
import { NumbersService } from './numbers.service';

/**
 * NumbersModule
 *
 * Módulo de gerenciamento de números/instâncias WhatsApp
 * CRUD de números e números extras
 *
 * Total: 6 endpoints
 */
@Module({
  imports: [TypeOrmModule.forFeature([WhatsAppNumber, Plan])],
  controllers: [NumbersController],
  providers: [NumbersService],
  exports: [NumbersService],
})
export class NumbersModule {}
