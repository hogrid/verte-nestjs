import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';

export class UpdatePublicDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  number_id?: number;

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsArray()
  @IsOptional()
  labels?: number[];

  @IsString()
  @IsOptional()
  description?: string;
}
