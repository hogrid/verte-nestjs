import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

/**
 * Check Mail Confirmation DTO
 * Validates POST /api/v1/check-mail-confirmation-code request body
 * Compatible with Laravel AuthController@check_mail_confirmation_code
 */
export class CheckMailConfirmationDto {
  @IsNotEmpty({ message: 'O campo código é obrigatório.' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'O campo user_id é obrigatório.' })
  @IsNumber({}, { message: 'O user_id deve ser um número.' })
  user_id: number;
}
