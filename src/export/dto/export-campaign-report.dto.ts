import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportCampaignReportDto {
  @IsNumber()
  @Type(() => Number)
  campaign_id: number;

  @IsString()
  @IsOptional()
  format?: 'csv' | 'xlsx' | 'pdf';

  @IsString()
  @IsOptional()
  include_contacts?: 'all' | 'sent' | 'failed' | 'delivered' | 'read';
}
