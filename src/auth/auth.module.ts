import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ContactsModule } from '../contacts/contacts.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  User,
  Plan,
  Number as NumberEntity,
  Configuration,
  PasswordReset,
} from '../database/entities';
import { IsUniqueConstraint } from '../common/validators/is-unique.validator';

/**
 * Auth Module
 * Handles authentication, registration, and password reset
 * Compatible with Laravel 8 AuthController
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Plan,
      NumberEntity,
      Configuration,
      PasswordReset,
    ]),
    PassportModule,
    ContactsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(
            configService.get<string>('JWT_EXPIRATION', '3600'),
            10,
          ),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, IsUniqueConstraint],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
