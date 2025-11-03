import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Test CSV Import
 * POST /api/v1/contacts/import/test
 *
 * Validates file upload for preview/testing (no database changes)
 */
export class TestImportDto {
  @ApiProperty({
    description:
      'Arquivo CSV para testar. Retorna preview sem salvar no banco de dados.',
    type: 'string',
    format: 'binary',
    example: 'contacts.csv',
  })
  file: Express.Multer.File;
}
