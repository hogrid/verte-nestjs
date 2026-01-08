import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CheckMailConfirmationDto {
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @IsString({ message: 'O campo code deve ser uma string.' })
  code: string;
}

export class ResendConfirmationDto {
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;
}
