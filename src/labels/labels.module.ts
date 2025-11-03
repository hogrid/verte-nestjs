import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { Label } from '../database/entities/label.entity';
import { Number } from '../database/entities/number.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Label, Number]),
  ],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
