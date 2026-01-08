import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsNumber()
  value: number;

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
