import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * CreatePaymentDto
 * DTO para pagamento direto com cartão via Stripe Elements
 * Compatível com o frontend PaymentPage.jsx
 */
export class CreatePaymentDto {
  @IsNumber()
  plan_id: number;

  @IsString()
  cardToken: string; // Payment Method ID do Stripe (pm_xxx)

  @IsNumber()
  @IsOptional()
  user_id?: number; // Opcional, pois pode vir do JWT

  @IsBoolean()
  @IsOptional()
  update?: boolean; // true se é atualização de plano existente

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  cpfCnpj: string;
}
