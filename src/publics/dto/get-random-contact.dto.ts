import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for getting a random contact from a public
 *
 * Returns a random contact that has:
 * - A name (not null and not starting with +)
 * - At least one variable (variable_1, variable_2, or variable_3) populated
 */
export class GetRandomContactDto {
  @ApiProperty({
    description: 'ID do público para buscar contato aleatório',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo id é obrigatório.' })
  @IsInt({ message: 'O campo id deve ser um número inteiro.' })
  @Type(() => Number)
  id: number;
}
