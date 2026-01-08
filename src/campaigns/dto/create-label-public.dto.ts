import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLabelPublicDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  name: string;

  @IsNumber({}, { message: 'O campo number_id deve ser um número.' })
  @Type(() => Number)
  number_id: number;

  @IsArray({ message: 'O campo labels deve ser um array.' })
  labels: string[];
}
