import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../database/entities/plan.entity';
import { User } from '../database/entities/user.entity';
import { Server } from '../database/entities/server.entity';
import { Number } from '../database/entities/number.entity';
import { Configuration } from '../database/entities/configuration.entity';
import { Setting } from '../database/entities/setting.entity';
import { Label } from '../database/entities/label.entity';
import { Publics } from '../database/entities/publics.entity';
import { Contact } from '../database/entities/contact.entity';
import { MessageTemplate } from '../database/entities/message-template.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      User,
      Server,
      Number,
      Configuration,
      Setting,
      Label,
      Publics,
      Contact,
      MessageTemplate,
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
