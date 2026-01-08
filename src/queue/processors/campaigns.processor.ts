import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../../database/entities';

export interface CampaignJob {
  campaignId: number;
  userId: number;
}

@Processor('campaigns')
export class CampaignsProcessor {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
  ) {}

  @Process()
  async handleCampaign(job: Job<CampaignJob>) {
    this.logger.log(`Processing campaign job ${job.id}`);
    const { campaignId } = job.data;

    try {
      // Update campaign status to processing
      await this.campaignRepository.update(campaignId, { status: 1 });

      // Campaign processing logic would go here
      this.logger.log(`Campaign ${campaignId} processed successfully`);

      return { success: true, campaignId };
    } catch (error) {
      this.logger.error(`Failed to process campaign ${campaignId}`, error);
      throw error;
    }
  }
}
