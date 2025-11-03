import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersProfileController } from './users-profile.controller';
import { ConfigurationController } from './configuration.controller';
import { UsersService } from './users.service';
import { User } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import { Number } from '../database/entities/number.entity';
import { Configuration } from '../database/entities/configuration.entity';

/**
 * Users Module
 * Handles user/customer management endpoints
 * Compatible with Laravel UserController
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Plan, Number, Configuration])],
  controllers: [UsersController, UsersProfileController, ConfigurationController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
