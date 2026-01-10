import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

/**
 * PaymentsController
 *
 * Gerencia pagamentos via Stripe
 * Mantém 100% de compatibilidade com Laravel PaymentsController
 *
 * Total: 5 endpoints (apenas Stripe, sem MercadoPago)
 */
@ApiTags('Payments')
@Controller('api/v1')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * 1. POST /api/v1/create-checkout-session
   * Cria sessão de checkout Stripe
   * Laravel: PaymentsController@createCheckoutSession
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Criar sessão de checkout Stripe',
    description: 'Cria uma sessão de checkout para pagamento via Stripe',
  })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Sessão criada com sucesso',
    schema: {
      example: {
        session_id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_id: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async createCheckoutSession(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentsService.createCheckoutSession(req.user.id, dto);
  }

  /**
   * 1.5. POST /api/v1/create-payment
   * Cria pagamento direto com Stripe Elements
   * Compatível com frontend PaymentPage.jsx
   */
  @Post('create-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Criar pagamento direto com Stripe Elements',
    description:
      'Processa pagamento direto com cartão usando PaymentMethod do Stripe Elements.\n\n' +
      '**Fluxo:**\n' +
      '- Frontend cria PaymentMethod com `stripe.createPaymentMethod()`\n' +
      '- Envia payment_method_id (cardToken) para este endpoint\n' +
      '- Backend cria PaymentIntent e confirma o pagamento\n' +
      '- Retorna status do pagamento\n\n' +
      '**Requer autenticação**: Opcional (user_id pode vir do body ou JWT)\n' +
      '**Compatível com**: Laravel create-payment endpoint',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Pagamento processado',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          payment_intent_id: 'pi_123',
          status: 'succeeded',
          plan: {
            id: 1,
            name: 'Plano Pro',
            value: 99.9,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pagamento requer autenticação adicional (3D Secure)',
    schema: {
      example: {
        success: false,
        message: 'Pagamento requer autenticação adicional',
        data: {
          requires_action: true,
          payment_intent_id: 'pi_123',
          client_secret: 'pi_123_secret_...',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plano ou usuário não encontrado' })
  async createDirectPayment(
    @Request() req: { user?: { id: number } },
    @Body() dto: CreatePaymentDto,
  ) {
    // Usa user_id do JWT se disponível, senão usa do body (para novos usuários)
    const userId = req.user?.id || dto.user_id;
    return this.paymentsService.createDirectPayment(userId, dto);
  }

  /**
   * 2. POST /api/v1/stripe/webhook
   * Webhook para eventos Stripe
   * Laravel: PaymentsController@stripeWebhook
   */
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Stripe',
    description: 'Recebe eventos de webhook do Stripe (checkout, payment)',
  })
  @ApiBody({
    description: 'Payload do webhook Stripe (raw body)',
    schema: {
      type: 'object',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado',
    schema: {
      example: {
        received: true,
      },
    },
  })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const { BadRequestException } = await import('@nestjs/common');
    if (
      !signature ||
      (typeof signature === 'string' && signature.trim() === '')
    ) {
      throw new BadRequestException('Assinatura do webhook é obrigatória');
    }

    // Get raw body or fallback to stringified body for tests
    const rawBody =
      (req as any).rawBody || JSON.stringify((req as any).body || {});

    try {
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
      );
      return this.paymentsService.handleStripeWebhook(event);
    } catch (e) {
      throw new BadRequestException('Assinatura do webhook inválida');
    }
  }

  /**
   * 3. GET /api/v1/payment-success
   * Callback de sucesso após pagamento
   * Laravel: PaymentsController@paymentSuccess
   */
  @Get('payment-success')
  @ApiOperation({
    summary: 'Callback de sucesso de pagamento',
    description: 'Processa retorno de sucesso do Stripe',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'ID da sessão de checkout Stripe',
    example: 'cs_test_123',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Pagamento processado com sucesso',
    schema: {
      example: {
        success: true,
        payment_status: 'paid',
        payment_id: 1,
        plan: {
          id: 1,
          name: 'Plano Pro',
          price: '99.90',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async paymentSuccess(@Query('session_id') sessionId: string) {
    if (!sessionId) {
      // Validação compatível com Laravel: campo obrigatório
      throw new (await import('@nestjs/common')).BadRequestException(
        'O campo session_id é obrigatório.',
      );
    }
    return this.paymentsService.handlePaymentSuccess(sessionId);
  }

  /**
   * 4. GET /api/v1/payment-cancel
   * Callback de cancelamento de pagamento
   * Laravel: PaymentsController@paymentCancel
   */
  @Get('payment-cancel')
  @ApiOperation({
    summary: 'Callback de cancelamento de pagamento',
    description: 'Processa cancelamento do pagamento pelo usuário',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'ID da sessão de checkout Stripe',
    example: 'cs_test_123',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cancelamento processado',
    schema: {
      example: {
        success: false,
        message: 'Pagamento cancelado pelo usuário',
      },
    },
  })
  async paymentCancel(@Query('session_id') sessionId?: string) {
    return this.paymentsService.handlePaymentCancel(sessionId);
  }
}
