import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  name: string;

  @IsNumber({}, { message: 'O campo number_id deve ser um número.' })
  @Type(() => Number)
  number_id: number;

  @IsNumber({}, { message: 'O campo type deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  type?: number = 1;

  @IsNumber({}, { message: 'O campo public_id deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  public_id?: number;

  @IsDateString({}, { message: 'O campo schedule_date deve ser uma data válida.' })
  @IsOptional()
  schedule_date?: string;

  @IsArray({ message: 'O campo labels deve ser um array.' })
  @IsOptional()
  labels?: string[];

  @IsBoolean({ message: 'O campo call deve ser um booleano.' })
  @IsOptional()
  call?: boolean;

  @IsArray({ message: 'O campo messages deve ser um array.' })
  @IsOptional()
  messages?: Array<{
    message?: string;
    media?: string;
    media_type?: number;
    order?: number;
  }>;
}
