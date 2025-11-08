import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * QR Code DTO
 * Laravel: WhatsappController@getWahaQr
 */
export class QrCodeDto {
  @ApiProperty({
    description: 'Nome da sessão WAHA',
    example: 'default',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo session é obrigatório.' })
  @IsString({ message: 'O campo session deve ser uma string.' })
  session: string;
}
