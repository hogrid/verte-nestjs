import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../database/entities/payment.entity';
import { User } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
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
    this.logger.log('🛒 Criando sessão de checkout', {
      userId,
      planId: dto.plan_id,
    });

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

      this.logger.log('✅ Checkout session criada', {
        sessionId: session.id,
        paymentId: savedPayment.id,
      });

      const result = {
        session_id: session.id,
        url: session.url,
        payment_id: savedPayment.id,
      };

      this.logger.log('✅ Retornando resultado', result);
      return result;
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao criar checkout session', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   * Laravel: PaymentsController@stripeWebhook
   */
  async handleStripeWebhook(event: Stripe.Event) {
    this.logger.log('📥 Processando webhook Stripe', {
      type: event.type,
      id: event.id,
    });

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

        default:
          this.logger.debug(`🔔 Evento não tratado: ${event.type}`);
      }

      return { received: true };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar webhook', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    this.logger.log('✅ Checkout session completada', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    try {
      // Find payment by session ID (stored in payment_id)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: session.id },
      });

      if (!payment) {
        this.logger.warn('⚠️ Payment não encontrado para session', {
          sessionId: session.id,
        });
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

        this.logger.log('✅ Usuário atualizado com plano', {
          userId: payment.user_id,
          planId: payment.plan_id,
        });
      }
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar checkout completed', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
    }
  }

  /**
   * Handle payment intent succeeded
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    this.logger.log('✅ Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
    });

    try {
      // Find payment by payment intent ID (stored in payment_id if available)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn('⚠️ Payment não encontrado para payment intent', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      // Update payment status
      await this.paymentRepository.update(payment.id, {
        status: 'succeeded',
      });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar payment succeeded', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
    }
  }

  /**
   * Handle payment intent failed
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log('❌ Payment intent failed', {
      paymentIntentId: paymentIntent.id,
    });

    try {
      // Find payment by payment intent ID (stored in payment_id if available)
      const payment = await this.paymentRepository.findOne({
        where: { payment_id: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn('⚠️ Payment não encontrado para payment intent', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      // Update payment status
      await this.paymentRepository.update(payment.id, {
        status: 'failed',
      });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar payment failed', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
    }
  }

  /**
   * Payment success callback
   * Laravel: PaymentsController@paymentSuccess
   */
  async handlePaymentSuccess(sessionId: string) {
    this.logger.log('🎉 Processando payment success', { sessionId });

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
      this.logger.error('❌ Erro ao processar payment success', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
      throw error;
    }
  }

  /**
   * Payment cancel callback
   * Laravel: PaymentsController@paymentCancel
   */
  async handlePaymentCancel(sessionId?: string) {
    this.logger.log('❌ Processando payment cancel', { sessionId });

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
      this.logger.error('❌ Erro ao processar payment cancel', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
      });
      throw error;
    }
  }
}
