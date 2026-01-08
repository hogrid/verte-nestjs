import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class UnblockContactsDto {
  @IsArray()
  contact_ids: number[];

  @IsNumber()
  @IsOptional()
  campaign_id?: number;
}
