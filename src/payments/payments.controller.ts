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

/**
 * PaymentsController
 *
 * Gerencia pagamentos via Stripe
 * Mantém 100% de compatibilidade com Laravel PaymentsController
 *
 * Total: 4 endpoints (apenas Stripe, sem MercadoPago)
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
    // Get raw body
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new Error('Raw body não disponível');
    }

    // Construct and validate webhook event
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    // Process event
    return this.paymentsService.handleStripeWebhook(event);
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
