import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsNumber()
  @IsOptional()
  value_promotion?: number;

  @IsNumber()
  @IsOptional()
  unlimited?: number;

  @IsNumber()
  @IsOptional()
  medias?: number;

  @IsNumber()
  @IsOptional()
  reports?: number;

  @IsNumber()
  @IsOptional()
  schedule?: number;

  @IsNumber()
  @IsOptional()
  popular?: number;

  @IsString()
  @IsOptional()
  code_mp?: string;

  @IsString()
  @IsOptional()
  code_product?: string;
}
