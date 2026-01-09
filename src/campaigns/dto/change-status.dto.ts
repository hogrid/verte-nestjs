import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ChangeStatusDto {
  @IsNumber({}, { message: 'O campo campaign_id deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  campaign_id?: number;

  // Alias for campaign_id (frontend sends 'id')
  @IsNumber({}, { message: 'O campo id deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  id?: number;

  @IsNumber({}, { message: 'O campo status deve ser um número.' })
  @Type(() => Number)
  @IsOptional()
  status?: number;

  @IsBoolean({ message: 'O campo paused deve ser um booleano.' })
  @IsOptional()
  paused?: boolean;

  @IsBoolean({ message: 'O campo canceled deve ser um booleano.' })
  @IsOptional()
  canceled?: boolean;
}
