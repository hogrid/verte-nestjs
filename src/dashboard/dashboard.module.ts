import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Campaign, Contact, WhatsAppNumber]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
