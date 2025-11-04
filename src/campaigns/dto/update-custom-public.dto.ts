import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update Custom Public DTO
 * Data for updating/canceling custom publics
 *
 * Laravel: CampaignsController@put_custom_public (lines 183-192)
 */
export class UpdateCustomPublicDto {
  @ApiPropertyOptional({
    description:
      'Flag para cancelar todos os públicos customizados em andamento',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cancel?: boolean;
}
