import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../database/entities/payment.entity';
import { User } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type Stripe from 'stripe';

/**
 * PaymentsService
 *
 * Serviço de gerenciamento de pagamentos
 * Mantém 100% de compatibilidade com Laravel PaymentsController
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Create checkout session
   * Laravel: PaymentsController@createCheckoutSession
   */
  async createCheckoutSession(userId: number, dto: CreateCheckoutSessionDto) {
    try {
      // Find plan
      const plan = await this.planRepository.findOne({
        where: { id: dto.plan_id },
      });

      if (!plan) {
        throw new NotFoundException('Plano não encontrado');
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Default URLs
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const successUrl =
        dto.success_url ||
        `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = dto.cancel_url || `${frontendUrl}/payment-cancel`;

      // Create Stripe checkout session
      const session = await this.stripeService.createCheckoutSession({
        planName: plan.name,
        planPrice: Number(plan.value),
        currency: 'BRL',
        userId,
        planId: plan.id,
        successUrl,
        cancelUrl,
      });

      // Create payment record (pending)
      // Laravel schema: user_id, plan_id, status, payment_id, from, amount, extra_number
      const payment = this.paymentRepository.create({
        user_id: userId,
        plan_id: plan.id,
        status: 'pending',
        payment_id: session.id, // Stripe session ID
        from: 'stripe', // Payment provider
        amount: Number(plan.value),
        extra_number: 0,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      const result = {
        session_id: session.id,
        url: session.url,
        payment_id: savedPayment.id,
      };

      return result;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   * Laravel: PaymentsController@stripeWebhook
   */
  async handleStripeWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
      }

      return { received: true };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    try {
      // Find payment by session ID (stored in payment_id)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: session.id },
      });

      if (!payment) {
        return;
      }

      // Update payment status
      await this.paymentRepository.update(payment.id, {
        status: session.payment_status === 'paid' ? 'succeeded' : 'pending',
      });

      // If paid, update user plan
      if (session.payment_status === 'paid' && payment.plan_id) {
        await this.userRepository.update(payment.user_id, {
          plan_id: payment.plan_id,
          active: 1,
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Handle payment intent succeeded
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    try {
      // Find payment by payment intent ID (stored in payment_id if available)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: paymentIntent.id },
      });

      if (!payment) {
        return;
      }

      // Update payment status
      await this.paymentRepository.update(payment.id, {
        status: 'succeeded',
      });
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Handle payment intent failed
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Find payment by payment intent ID (stored in payment_id if available)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: paymentIntent.id },
      });

      if (!payment) {
        return;
      }

      // Update payment status
      await this.paymentRepository.update(payment.id, {
        status: 'failed',
      });
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Payment success callback
   * Laravel: PaymentsController@paymentSuccess
   */
  async handlePaymentSuccess(sessionId: string) {
    try {
      // Retrieve session from Stripe
      const session =
        await this.stripeService.retrieveCheckoutSession(sessionId);

      // Find payment by session ID (stored in payment_id)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: sessionId },
        relations: ['user', 'plan'],
      });

      if (!payment) {
        throw new NotFoundException('Pagamento não encontrado');
      }

      return {
        success: true,
        payment_status: session.payment_status,
        payment_id: payment.id,
        plan: payment.plan
          ? {
              id: payment.plan.id,
              name: payment.plan.name,
              price: payment.plan.value,
            }
          : null,
      };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Payment cancel callback
   * Laravel: PaymentsController@paymentCancel
   */
  async handlePaymentCancel(sessionId?: string) {
    try {
      if (sessionId) {
        // Find and update payment by session ID (stored in payment_id)
        const payment = await this.paymentRepository.findOne({
          where: { payment_id: sessionId },
        });

        if (payment) {
          await this.paymentRepository.update(payment.id, {
            status: 'canceled',
          });
        }
      }

      return {
        success: false,
        message: 'Pagamento cancelado pelo usuário',
      };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Create direct payment with Stripe Elements
   * Processa pagamento direto com cartão (Stripe Elements)
   * Compatível com frontend PaymentPage.jsx
   */
  async createDirectPayment(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // Find plan
      const plan = await this.planRepository.findOne({
        where: { id: dto.plan_id },
      });

      if (!plan) {
        throw new NotFoundException('Plano não encontrado');
      }

      // Find user (use userId from JWT if not provided)
      const targetUserId = dto.user_id || userId;
      const user = await this.userRepository.findOne({
        where: { id: targetUserId },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Determinar valor final (valor promocional ou normal)
      const finalAmount =
        plan.value_promotion && plan.value_promotion > 0
          ? plan.value_promotion
          : Number(plan.value);

      // Criar PaymentIntent com o PaymentMethod do Stripe Elements
      const paymentIntent =
        await this.stripeService.createPaymentWithMethod({
          amount: finalAmount,
          currency: 'BRL',
          paymentMethodId: dto.cardToken,
          userId: targetUserId,
          planId: plan.id,
          email: dto.email,
          name: dto.name,
        });

      // Verificar status do pagamento
      const paymentSuccess =
        paymentIntent.status === 'succeeded' ||
        paymentIntent.status === 'processing';

      // Criar registro de pagamento
      const payment = this.paymentRepository.create({
        user_id: targetUserId,
        plan_id: plan.id,
        status:
          paymentIntent.status === 'succeeded'
            ? 'succeeded'
            : paymentIntent.status === 'processing'
              ? 'processing'
              : 'pending',
        payment_id: paymentIntent.id,
        from: 'stripe',
        amount: finalAmount,
        extra_number: 0,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      // Se pagamento bem sucedido, atualizar usuário
      if (paymentSuccess) {
        await this.userRepository.update(targetUserId, {
          plan_id: plan.id,
          active: 1,
        });

        return {
          success: true,
          data: {
            id: savedPayment.id,
            payment_intent_id: paymentIntent.id,
            status: paymentIntent.status,
            plan: {
              id: plan.id,
              name: plan.name,
              value: finalAmount,
            },
          },
        };
      }

      // Pagamento requer ação adicional (ex: 3D Secure)
      if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          message: 'Pagamento requer autenticação adicional',
          data: {
            requires_action: true,
            payment_intent_id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
          },
        };
      }

      // Pagamento falhou
      return {
        success: false,
        message: paymentIntent.last_payment_error?.message || 'Pagamento não aprovado',
        data: {
          status: paymentIntent.status,
        },
      };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
