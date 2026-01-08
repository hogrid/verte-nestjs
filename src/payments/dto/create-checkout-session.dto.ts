import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNumber()
  plan_id: number;

  @IsString()
  @IsOptional()
  success_url?: string;

  @IsString()
  @IsOptional()
  cancel_url?: string;

  @IsString()
  @IsOptional()
  coupon_code?: string;
}
