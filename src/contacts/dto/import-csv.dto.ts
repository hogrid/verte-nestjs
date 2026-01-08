import { IsOptional, IsNumber, IsString, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportCsvDto {
  @IsNumber()
  @Type(() => Number)
  number_id: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  label_id?: number;

  @IsString()
  @IsOptional()
  phone_column?: string;

  @IsString()
  @IsOptional()
  name_column?: string;

  @IsArray()
  @IsOptional()
  columns?: string[];

  @IsBoolean()
  @IsOptional()
  has_header?: boolean;

  @IsString()
  @IsOptional()
  delimiter?: string;
}
