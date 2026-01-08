import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomPublic } from '../../database/entities';

export interface CustomPublicJob {
  publicId: number;
  userId: number;
}

@Processor('custom-public')
export class CustomPublicProcessor {
  private readonly logger = new Logger(CustomPublicProcessor.name);

  constructor(
    @InjectRepository(CustomPublic)
    private readonly customPublicRepository: Repository<CustomPublic>,
  ) {}

  @Process()
  async handleCustomPublic(job: Job<CustomPublicJob>) {
    this.logger.log(`Processing custom public job ${job.id}`);
    const { publicId } = job.data;

    try {
      // Update status to processing
      await this.customPublicRepository.update(publicId, { status: 1 });

      // Processing logic would go here
      this.logger.log(`Custom public ${publicId} processed successfully`);

      return { success: true, publicId };
    } catch (error) {
      this.logger.error(`Failed to process custom public ${publicId}`, error);
      throw error;
    }
  }
}
