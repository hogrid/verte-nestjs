import { IsString, IsNotEmpty } from 'class-validator';

export class SyncContactsDto {
  @IsString()
  @IsNotEmpty()
  instanceName!: string;
}
