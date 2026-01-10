import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimplifiedPublic } from '../../database/entities';

export interface SimplifiedPublicJob {
  publicId: number;
  userId: number;
}

@Processor('simplified-public')
export class SimplifiedPublicProcessor {
  private readonly logger = new Logger(SimplifiedPublicProcessor.name);

  constructor(
    @InjectRepository(SimplifiedPublic)
    private readonly simplifiedPublicRepository: Repository<SimplifiedPublic>,
  ) {}

  @Process()
  async handleSimplifiedPublic(job: Job<SimplifiedPublicJob>) {
    this.logger.log(`Processing simplified public job ${job.id}`);
    const { publicId } = job.data;

    try {
      // Update status to processing
      await this.simplifiedPublicRepository.update(publicId, { status: 1 });

      // Processing logic would go here
      this.logger.log(`Simplified public ${publicId} processed successfully`);

      return { success: true, publicId };
    } catch (error) {
      this.logger.error(
        `Failed to process simplified public ${publicId}`,
        error,
      );
      throw error;
    }
  }
}
