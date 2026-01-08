import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class BlockContactsDto {
  @IsArray()
  contact_ids: number[];

  @IsNumber()
  @IsOptional()
  campaign_id?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
