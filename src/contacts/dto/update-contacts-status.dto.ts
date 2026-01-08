import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateContactsStatusDto {
  @IsArray()
  contact_ids: number[];

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
