import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Plan } from '../database/entities/plan.entity';

/**
 * Plans Module
 * Manages subscription plans (CRUD)
 * Compatible with Laravel PlansController
 */
@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService], // Export for use in other modules
})
export class PlansModule {}
