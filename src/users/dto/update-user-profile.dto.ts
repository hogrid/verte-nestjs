import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateUserProfileDto {
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

  @IsString()
  @IsOptional()
  password_confirmation?: string;

  @IsBoolean()
  @IsOptional()
  email_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  sms_notifications?: boolean;

  @IsNumber()
  @IsOptional()
  timezone_offset?: number;

  @IsString()
  @IsOptional()
  locale?: string;
}
