import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { Payment } from '../database/entities/payment.entity';
import { User } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';

/**
 * PaymentsModule
 *
 * Módulo de pagamentos via Stripe
 * Total: 4 endpoints implementados
 *
 * Endpoints:
 * - POST /api/v1/create-checkout-session - Criar sessão de checkout
 * - POST /api/v1/stripe/webhook - Webhook Stripe
 * - GET /api/v1/payment-success - Callback sucesso
 * - GET /api/v1/payment-cancel - Callback cancelamento
 */
@Module({
  imports: [
    ConfigModule, // Para acessar STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET
    TypeOrmModule.forFeature([Payment, User, Plan]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
