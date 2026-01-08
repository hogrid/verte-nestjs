import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSimplifiedPublicDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  @IsOptional()
  name?: string;

  @IsNumber({}, { message: 'O campo number_id deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  number_id?: number;

  @IsArray({ message: 'O campo contacts deve ser um array.' })
  @IsOptional()
  contacts?: string[];

  @IsString({ message: 'O campo uuid deve ser uma string.' })
  @IsOptional()
  uuid?: string;
}
