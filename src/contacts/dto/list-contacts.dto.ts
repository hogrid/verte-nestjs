import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ListContactsDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  per_page?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  label_id?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  number_id?: number;

  @IsArray()
  @IsOptional()
  labels?: number[];

  @IsString()
  @IsOptional()
  sort_by?: string;

  @IsString()
  @IsOptional()
  sort_order?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  status?: string;
}
