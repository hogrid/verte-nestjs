import { IsString, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  media?: string;

  @IsNumber()
  @IsOptional()
  media_type?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  variables?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsNumber()
  @IsOptional()
  status?: number;
}
