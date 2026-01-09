import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateContactsStatusDto {
  @IsArray()
  @ValidateIf((o) => o.rows !== undefined)
  @IsNumber({}, { each: true })
  rows?: number[];

  @IsArray()
  @ValidateIf((o) => o.contact_ids !== undefined)
  @IsNumber({}, { each: true })
  contact_ids?: number[];

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
