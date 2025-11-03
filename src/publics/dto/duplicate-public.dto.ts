import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for duplicating a public
 *
 * Creates a copy of the public and all its contacts
 * The new public will have ' Cópia' appended to the name
 * and status set to 0 (inactive)
 */
export class DuplicatePublicDto {
  @ApiProperty({
    description: 'ID do público a ser duplicado',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo id é obrigatório.' })
  @IsInt({ message: 'O campo id deve ser um número inteiro.' })
  @Type(() => Number)
  id: number;
}
