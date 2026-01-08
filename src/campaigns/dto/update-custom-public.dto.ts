import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCustomPublicDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  @IsOptional()
  name?: string;

  @IsNumber({}, { message: 'O campo number_id deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  number_id?: number;

  @IsString({ message: 'O campo file deve ser uma string.' })
  @IsOptional()
  file?: string;

  @IsNumber({}, { message: 'O campo status deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  status?: number;
}
