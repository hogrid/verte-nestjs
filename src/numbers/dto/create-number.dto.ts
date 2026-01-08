import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNumberDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  cel?: string;

  @IsString()
  @IsOptional()
  instance?: string;

  @IsNumber()
  @IsOptional()
  status?: number;
}
