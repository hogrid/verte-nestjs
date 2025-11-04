import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

// Campaign entities
import { Campaign } from '../database/entities/campaign.entity';
import { Message } from '../database/entities/message.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { SimplifiedPublic } from '../database/entities/simplified-public.entity';
import { CustomPublic } from '../database/entities/custom-public.entity';

// Related entities
import { Number } from '../database/entities/number.entity';
import { Contact } from '../database/entities/contact.entity';
import { Public } from '../database/entities/public.entity';
import { Plan } from '../database/entities/plan.entity';
import { User } from '../database/entities/user.entity';

/**
 * CampaignsModule
 * FASE 1: CRUD básico (4 endpoints)
 * - GET /api/v1/campaigns - List campaigns
 * - POST /api/v1/campaigns - Create campaign
 * - GET /api/v1/campaigns/:id - Show campaign
 * - POST /api/v1/campaigns/:id/cancel - Cancel campaign
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Campaign entities
      Campaign,
      Message,
      MessageByContact,
      SimplifiedPublic,
      CustomPublic,

      // Related entities
      Number,
      Contact,
      Public,
      Plan,
      User,
    ]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
