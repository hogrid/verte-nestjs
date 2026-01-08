import { IsNumber, IsString, IsOptional } from 'class-validator';

export class DuplicatePublicDto {
  @IsNumber()
  id: number;

  @IsNumber()
  @IsOptional()
  source_id?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  number_id?: number;
}
