import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  number_id?: number;
}
