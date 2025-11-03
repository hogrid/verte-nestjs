import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, IsInt, ArrayMinSize, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Contacts Status DTO
 * Request body for POST /api/v1/contacts (bulk status update)
 * Compatible with Laravel ContactsController::save()
 */
export class UpdateContactsStatusDto {
  @ApiProperty({
    description:
      'Array de IDs dos contatos a serem atualizados. ' +
      'Deve conter pelo menos 1 ID.',
    example: [1, 5, 10, 23],
    type: [Number],
    isArray: true,
  })
  @IsNotEmpty({ message: 'O campo linhas é obrigatório.' })
  @IsArray({ message: 'O campo linhas deve ser um array.' })
  @ArrayMinSize(1, { message: 'O campo linhas deve conter pelo menos 1 ID.' })
  @IsInt({ each: true, message: 'Todos os valores de linhas devem ser inteiros.' })
  @Type(() => Number)
  rows: number[];

  @ApiProperty({
    description:
      'Novo status a ser atribuído aos contatos. ' +
      'Status: 1=Ativo, 2=Bloqueado, 3=Inativo',
    example: 2,
    enum: [1, 2, 3],
  })
  @IsNotEmpty({ message: 'O campo status é obrigatório.' })
  @IsInt({ message: 'O campo status deve ser um inteiro.' })
  @IsIn([1, 2, 3], {
    message: 'O campo status deve ser 1 (Ativo), 2 (Bloqueado) ou 3 (Inativo).',
  })
  status: number;
}
