import { IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRandomContactDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  number_id?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  numberId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  label_id?: number;

  @IsArray()
  @IsOptional()
  exclude_ids?: number[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
