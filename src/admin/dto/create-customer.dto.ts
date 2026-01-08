import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  name: string;

  @IsString({ message: 'O campo last_name deve ser uma string.' })
  @IsOptional()
  last_name?: string;

  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @IsString({ message: 'O campo password deve ser uma string.' })
  @MinLength(6, { message: 'O campo password deve ter no mínimo 6 caracteres.' })
  password: string;

  @IsString({ message: 'O campo cel deve ser uma string.' })
  @IsOptional()
  cel?: string;

  @IsString({ message: 'O campo cpfCnpj deve ser uma string.' })
  @IsOptional()
  cpfCnpj?: string;

  @IsNumber({}, { message: 'O campo plan_id deve ser um número.' })
  @IsOptional()
  plan_id?: number;

  @IsEnum(['actived', 'inactived'], { message: 'O campo status deve ser actived ou inactived.' })
  @IsOptional()
  status?: 'actived' | 'inactived';

  @IsEnum(['administrator', 'user'], { message: 'O campo profile deve ser administrator ou user.' })
  @IsOptional()
  profile?: 'administrator' | 'user';
}
