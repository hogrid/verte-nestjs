import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class SetupWhatsAppDto {
  @IsString()
  instanceName: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsBoolean()
  @IsOptional()
  syncContacts?: boolean;

  @IsBoolean()
  @IsOptional()
  syncMessages?: boolean;
}

export class CreateInstanceDto {
  @IsString()
  instanceName: string;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  webhookUrl?: string;
}

export class ConnectInstanceDto {
  @IsString()
  instanceName: string;
}

export class DisconnectInstanceDto {
  @IsString()
  instanceName: string;
}

export class DeleteInstanceDto {
  @IsString()
  instanceName: string;
}

export class RestartInstanceDto {
  @IsString()
  instanceName: string;
}
