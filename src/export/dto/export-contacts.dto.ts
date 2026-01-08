import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportContactsDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  number_id?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  label_id?: number;

  @IsArray()
  @IsOptional()
  labels?: number[];

  @IsString()
  @IsOptional()
  format?: 'csv' | 'xlsx';

  @IsArray()
  @IsOptional()
  columns?: string[];

  @IsString()
  @IsOptional()
  search?: string;
}
