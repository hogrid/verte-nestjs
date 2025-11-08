import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Disconnect Session DTO
 * Laravel: WhatsappController@disconnectWahaSession
 */
export class DisconnectSessionDto {
  @ApiProperty({
    description: 'Nome da sessão WAHA a ser desconectada',
    example: 'default',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo session é obrigatório.' })
  @IsString({ message: 'O campo session deve ser uma string.' })
  session: string;
}
