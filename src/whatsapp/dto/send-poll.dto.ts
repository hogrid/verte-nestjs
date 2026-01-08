import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, ArrayMinSize } from 'class-validator';

export class SendPollDto {
  @IsString()
  to: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @IsOptional()
  selectableCount?: number;

  @IsBoolean()
  @IsOptional()
  allowMultipleAnswers?: boolean;

  @IsString()
  @IsOptional()
  instanceName?: string;

  @IsNumber()
  @IsOptional()
  number_id?: number;
}
