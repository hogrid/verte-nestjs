import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Unblock Contacts DTO
 * Request body for POST /api/v1/contacts/unblock
 * Unblocks selected contacts (sets status to 1)
 */
export class UnblockContactsDto {
  @ApiProperty({
    description:
      'Array de IDs dos contatos a serem desbloqueados. ' +
      'Deve conter pelo menos 1 ID.',
    example: [1, 5, 10, 23],
    type: [Number],
    isArray: true,
  })
  @IsNotEmpty({ message: 'O campo contact_ids é obrigatório.' })
  @IsArray({ message: 'O campo contact_ids deve ser um array.' })
  @ArrayMinSize(1, {
    message: 'O campo contact_ids deve conter pelo menos 1 ID.',
  })
  @IsInt({
    each: true,
    message: 'Todos os valores de contact_ids devem ser inteiros.',
  })
  @Type(() => Number)
  contact_ids: number[];
}
