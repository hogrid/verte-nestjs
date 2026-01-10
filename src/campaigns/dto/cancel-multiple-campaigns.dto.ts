import { IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CancelMultipleCampaignsDto {
  @IsArray({ message: 'O campo campaign_ids deve ser um array.' })
  @Type(() => Number)
  @IsNumber(
    {},
    { each: true, message: 'Cada item de campaign_ids deve ser um número.' },
  )
  campaign_ids: number[];
}
