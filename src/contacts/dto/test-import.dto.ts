import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class TestImportDto {
  @IsString()
  @IsOptional()
  phone_column?: string;

  @IsString()
  @IsOptional()
  name_column?: string;

  @IsBoolean()
  @IsOptional()
  has_header?: boolean;

  @IsString()
  @IsOptional()
  delimiter?: string;
}
