import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * CreateCheckoutSessionDto
 *
 * DTO para criar sessão de checkout Stripe
 */
export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'ID do plano a ser assinado',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo plan_id é obrigatório.' })
  @IsNumber({}, { message: 'O campo plan_id deve ser um número.' })
  plan_id: number;

  @ApiProperty({
    description: 'URL de sucesso após pagamento',
    example: 'https://app.verte.com/payment-success',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  success_url?: string;

  @ApiProperty({
    description: 'URL de cancelamento',
    example: 'https://app.verte.com/payment-cancel',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  cancel_url?: string;
}
