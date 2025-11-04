import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update Simplified Public DTO
 * Data for updating/canceling simplified publics
 *
 * Laravel: CampaignsController@put_simplified_public (lines 172-181)
 */
export class UpdateSimplifiedPublicDto {
  @ApiPropertyOptional({
    description:
      'Flag para cancelar todos os públicos simplificados em andamento',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cancel?: boolean;
}
