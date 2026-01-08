import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsEnum } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  zip_code?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(['actived', 'inactived'])
  @IsOptional()
  status?: 'actived' | 'inactived';

  @IsEnum(['administrator', 'user'])
  @IsOptional()
  profile?: 'administrator' | 'user';

  @IsNumber()
  @IsOptional()
  plan_id?: number;

  @IsNumber()
  @IsOptional()
  credits?: number;

  @IsBoolean()
  @IsOptional()
  email_verified?: boolean;
}
