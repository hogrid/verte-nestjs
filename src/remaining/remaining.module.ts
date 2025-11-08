import { Module } from '@nestjs/common';
import { RemainingController } from './remaining.controller';
import { RemainingService } from './remaining.service';

/**
 * RemainingModule
 *
 * Módulo com endpoints finais para completar migração 100%
 * Inclui integrações, webhooks, CORS options e placeholders
 *
 * Total: 18 endpoints
 */
@Module({
  controllers: [RemainingController],
  providers: [RemainingService],
  exports: [RemainingService],
})
export class RemainingModule {}
