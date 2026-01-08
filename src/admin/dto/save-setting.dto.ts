import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveSettingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  timer_normal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  timer_fast?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  number_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit_campaign?: number;

  @IsOptional()
  @IsString()
  hour_open?: string;

  @IsOptional()
  @IsString()
  hour_close?: string;

  @IsOptional()
  @IsString()
  token_wpp?: string;
}
