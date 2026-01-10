import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * StripeService
 *
 * Serviço de integração com Stripe API
 * Gerencia checkout sessions, webhooks e pagamentos
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly mockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.mockMode =
      !stripeSecretKey ||
      process.env.MOCK_STRIPE === '1' ||
      process.env.NODE_ENV === 'test';

    if (this.mockMode) {
      this.logger.warn(
        '⚠️ Stripe em modo de teste/mocado (sem chamadas externas)',
      );
      // Dummy client to satisfy types, won't be used
      this.stripe = new Stripe('sk_test_dummy', {
        apiVersion: '2025-10-29.clover',
      });
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-10-29.clover',
      });
    }
  }

  /**
   * Create checkout session
   * Cria sessão de checkout para pagamento
   */
  async createCheckoutSession(params: {
    planName: string;
    planPrice: number;
    currency: string;
    userId: number;
    planId: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {

    if (this.mockMode) {
      // Retorna sessão mockada (modo de teste)
      const mockSession = {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`,
        payment_status: 'unpaid',
      } as unknown as Stripe.Checkout.Session;
      return mockSession;
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: params.planName,
                description: `Plano ${params.planName} - Verte WhatsApp Marketing`,
              },
              unit_amount: Math.round(params.planPrice * 100), // Centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          user_id: params.userId.toString(),
          plan_id: params.planId.toString(),
        },
        client_reference_id: params.userId.toString(),
      });

      return session;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Construct webhook event
   * Valida e constrói evento de webhook do Stripe
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (this.mockMode) {
      // Em testes, apenas valida presença de assinatura/secret e retorna evento mockado
      if (!signature || !webhookSecret) {
        throw new Error('Invalid webhook signature');
      }

      const mockSession = {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        payment_status: 'paid',
      } as unknown as Stripe.Checkout.Session;

      const event = {
        id: 'evt_test',
        object: 'event',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: { object: mockSession },
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as unknown as Stripe.Event;
      return event;
    }

    if (!webhookSecret) {
      this.logger.warn(
        '⚠️ STRIPE_WEBHOOK_SECRET não configurado - webhook não validado',
      );
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      return event;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Retrieve checkout session
   * Busca sessão de checkout por ID
   */
  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    if (this.mockMode) {
      return {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'unpaid',
      } as unknown as Stripe.Checkout.Session;
    }
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return session;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Retrieve payment intent
   * Busca informações do pagamento
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    if (this.mockMode) {
      return {
        id: paymentIntentId,
        object: 'payment_intent',
        status: 'succeeded',
      } as unknown as Stripe.PaymentIntent;
    }
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return paymentIntent;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Create payment intent with payment method
   * Cria PaymentIntent e processa pagamento com PaymentMethod existente
   * Usado para pagamento direto com cartão via Stripe Elements
   */
  async createPaymentWithMethod(params: {
    amount: number; // Valor em reais
    currency: string;
    paymentMethodId: string; // pm_xxx do Stripe Elements
    userId: number;
    planId: number;
    email: string;
    name: string;
  }): Promise<Stripe.PaymentIntent> {
    if (this.mockMode) {
      // Retorna PaymentIntent mockado em modo de teste
      const mockPaymentIntent = {
        id: `pi_test_${Date.now()}`,
        object: 'payment_intent',
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        status: 'succeeded',
        payment_method: params.paymentMethodId,
      } as unknown as Stripe.PaymentIntent;
      return mockPaymentIntent;
    }

    try {
      // Criar PaymentIntent com o PaymentMethod fornecido
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Converter para centavos
        currency: params.currency.toLowerCase(),
        payment_method: params.paymentMethodId,
        confirm: true, // Confirmar o pagamento imediatamente
        metadata: {
          user_id: params.userId.toString(),
          plan_id: params.planId.toString(),
          name: params.name,
          email: params.email,
        },
        return_url: `${this.configService.get<string>(
          'FRONTEND_URL',
          'http://localhost:3001',
        )}/payment-success`,
      });

      return paymentIntent;
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Create PaymentIntent without confirmation
   * Cria PaymentIntent para ser confirmado no cliente (útil para 3D Secure)
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: number;
    planId: number;
    email: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (this.mockMode) {
      return {
        clientSecret: `pi_test_${Date.now()}_secret_${Date.now()}`,
        paymentIntentId: `pi_test_${Date.now()}`,
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        metadata: {
          user_id: params.userId.toString(),
          plan_id: params.planId.toString(),
          email: params.email,
        },
        // Automatic payment methods (card, etc)
        payment_method_types: ['card'],
      });

      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
