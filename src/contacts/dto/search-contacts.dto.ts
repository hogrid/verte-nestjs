import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchContactsDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  label_id?: number;

  @IsArray()
  @IsOptional()
  labels?: number[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  number_id?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  per_page?: number;
}
