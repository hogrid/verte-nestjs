import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Custom Public DTO
 * Data for creating a custom public from XLSX file
 *
 * Campos setados automaticamente (NÃO enviar):
 * - user_id: Pego do usuário autenticado
 * - status: 0 (processando)
 * - number_id: Setado baseado no numberId informado ou número ativo
 * - file: Path do arquivo após upload
 * - created_at, updated_at: Timestamps automáticos
 *
 * Laravel: CampaignsController@store_custom_public (lines 194-253)
 */
export class CreateCustomPublicDto {
  @ApiProperty({
    description: 'Arquivo XLSX com lista de contatos (máximo 20MB)',
    type: 'string',
    format: 'binary',
  })
  file: any; // Multer file will be processed in controller

  @ApiPropertyOptional({
    description: 'ID do número WhatsApp (se não informado, usa o número ativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberId?: number;
}
