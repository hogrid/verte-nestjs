import { IsOptional, IsNumber, IsString, IsBoolean, IsArray } from 'class-validator';

export class UpdateExtractorConfigDto {
  @IsNumber()
  @IsOptional()
  number_id?: number;

  @IsNumber()
  @IsOptional()
  label_id?: number;

  @IsBoolean()
  @IsOptional()
  auto_extract?: boolean;

  @IsBoolean()
  @IsOptional()
  extract_names?: boolean;

  @IsBoolean()
  @IsOptional()
  extract_phones?: boolean;

  @IsArray()
  @IsOptional()
  exclude_patterns?: string[];

  @IsString()
  @IsOptional()
  phone_format?: string;

  @IsNumber()
  @IsOptional()
  batch_size?: number;

  @IsNumber()
  @IsOptional()
  delay_ms?: number;
}
