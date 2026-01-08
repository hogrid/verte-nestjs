import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Payment } from '../database/entities/payment.entity';
import { Setting } from '../database/entities/setting.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { SeederModule } from '../seeder/seeder.module';

/**
 * AdminModule
 *
 * Módulo de administração do sistema
 * Gerenciamento de clientes, dashboard, configurações globais
 * Requer perfil 'administrator' para acessar endpoints
 *
 * Total: 11 endpoints
 */
@Module({
  imports: [
    UsersModule,
    SeederModule,
    TypeOrmModule.forFeature([
      User,
      Plan,
      WhatsAppNumber,
      Campaign,
      Contact,
      Payment,
      Setting,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
