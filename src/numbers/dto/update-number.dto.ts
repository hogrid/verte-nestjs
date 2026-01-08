import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateNumberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  cel?: string;

  @IsString()
  @IsOptional()
  instance?: string;

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsNumber()
  @IsOptional()
  status_connection?: number;
}
