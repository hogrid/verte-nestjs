import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for CSV Import
 * POST /api/v1/contacts/import/csv
 *
 * Validates file upload and optional label assignment
 */
export class ImportCsvDto {
  @ApiProperty({
    description:
      'Arquivo CSV contendo contatos. Formato esperado: Nome, Telefone',
    type: 'string',
    format: 'binary',
    example: 'contacts.csv',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'ID da label para aplicar aos contatos importados',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt({ message: 'O campo label_id deve ser um número inteiro.' })
  @IsPositive({ message: 'O campo label_id deve ser um número positivo.' })
  @Type(() => Number)
  label_id?: number;
}
