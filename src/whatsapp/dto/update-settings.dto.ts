import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Settings DTO
 * Laravel: WhatsappController@setSettings
 *
 * Todas as configurações são opcionais
 */
export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Rejeitar chamadas automaticamente',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo reject_call deve ser um booleano.' })
  reject_call?: boolean;

  @ApiPropertyOptional({
    description: 'Ignorar mensagens de grupos',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo groups_ignore deve ser um booleano.' })
  groups_ignore?: boolean;

  @ApiPropertyOptional({
    description: 'Sempre aparecer online',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo always_online deve ser um booleano.' })
  always_online?: boolean;

  @ApiPropertyOptional({
    description: 'Marcar mensagens como lidas automaticamente',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo read_messages deve ser um booleano.' })
  read_messages?: boolean;

  @ApiPropertyOptional({
    description: 'Marcar status como lido',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo read_status deve ser um booleano.' })
  read_status?: boolean;

  @ApiPropertyOptional({
    description: 'Sincronizar histórico completo',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo sync_full_history deve ser um booleano.' })
  sync_full_history?: boolean;
}
