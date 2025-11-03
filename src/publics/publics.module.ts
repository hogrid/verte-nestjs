import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicsController } from './publics.controller';
import { PublicsService } from './publics.service';
import { Public } from '../database/entities/public.entity';
import { Contact } from '../database/entities/contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import { Number } from '../database/entities/number.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Public, Contact, PublicByContact, Number]),
  ],
  controllers: [PublicsController],
  providers: [PublicsService],
  exports: [PublicsService],
})
export class PublicsModule {}
