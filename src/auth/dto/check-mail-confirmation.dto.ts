import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Check Mail Confirmation DTO
 * Validates POST /api/v1/check-mail-confirmation-code request body
 * Compatible with Laravel AuthController@check_mail_confirmation_code
 */
export class CheckMailConfirmationDto {
  @ApiProperty({
    description: 'Código de verificação de email enviado ao usuário',
    example: '123456',
    type: String,
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty({ message: 'O campo código é obrigatório.' })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'ID do usuário que está confirmando o email',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'O campo user_id é obrigatório.' })
  @IsNumber({}, { message: 'O user_id deve ser um número.' })
  user_id: number;
}
