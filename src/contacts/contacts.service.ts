import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { Contact } from '../database/entities/contact.entity';
import { Number } from '../database/entities/number.entity';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactsStatusDto } from './dto/update-contacts-status.dto';
import { BlockContactsDto } from './dto/block-contacts.dto';
import { UnblockContactsDto } from './dto/unblock-contacts.dto';
import { SearchContactsDto } from './dto/search-contacts.dto';
import { NumberHelper } from '../common/helpers/number.helper';
import { Readable } from 'stream';
import { format } from 'fast-csv';
import * as XLSX from 'xlsx';
import csvParser from 'csv-parser';

/**
 * Contacts Service
 * Core business logic for contacts management
 * Compatible with Laravel ContactsController
 *
 * Endpoints to implement:
 * 1. GET /api/v1/contacts - List contacts with filters ✅
 * 2. GET /api/v1/contacts/indicators - Get indicators ✅
 * 3. POST /api/v1/contacts - Bulk update status ✅
 * 4. POST /api/v1/contacts/block - Block contacts ✅
 * 5. POST /api/v1/contacts/unblock - Unblock contacts ✅
 * 6. POST /api/v1/contacts/search - Search contacts ✅
 * 7. GET /api/v1/contacts/active/export - Export contacts
 * 8. POST /api/v1/contacts/import/csv - Import CSV
 * 9. POST /api/v1/contacts/import/test - Test import
 */
@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
  ) {}

  /**
   * GET /api/v1/contacts
   * List contacts with filters
   * Compatible with Laravel: ContactsController::index()
   *
   * Business Rules:
   * 1. User can only see their own contacts (user_id filter)
   * 2. Only contacts from active WhatsApp number (status = 1)
   * 3. Only contacts with matching cel_owner (normalized)
   * 4. Respects soft deletes (whereNull deleted_at)
   * 5. Filters: status (can be array), tag (labelsName), search (name/number)
   * 6. Group by contact number to avoid duplicates
   * 7. Order by ID DESC
   */
  async findAll(userId: number, filters: ListContactsDto) {
    // 1. Find active WhatsApp number for user
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1, // Active number
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(numberActive.cel);

    // 3. Build query with base filters
    const query = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId })
      .andWhere('contacts.deleted_at IS NULL');

    // 4. FILTER: Status (can be array or single value)
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        // If array, use IN clause
        query.andWhere('contacts.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        // If single value
        query.andWhere('contacts.status = :status', { status: filters.status });
      }
    }

    // 5. FILTER: Tag (search in labelsName with LIKE)
    if (filters.tag) {
      query.andWhere('contacts.labelsName LIKE :tag', {
        tag: `%${filters.tag}%`,
      });
    }

    // 6. FILTER: Search (search in name and number)
    if (filters.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('contacts.name LIKE :search', {
            search: `%${filters.search}%`,
          }).orWhere('contacts.number LIKE :search', {
            search: `%${filters.search}%`,
          });
        }),
      );
    }

    // 7. Group by number and order by ID DESC
    const contacts = await query
      .orderBy('contacts.id', 'DESC')
      .groupBy('contacts.number')
      .getMany();

    return {
      data: contacts,
    };
  }

  /**
   * GET /api/v1/contacts/indicators
   * Get contact indicators/counters
   * Compatible with Laravel: ContactsController::indicators()
   *
   * Business Rules:
   * 1. User can only see their own contacts indicators
   * 2. Only contacts from active WhatsApp number
   * 3. Only contacts with matching cel_owner (normalized)
   * 4. Count DISTINCT by number (unique phone numbers)
   * 5. NOTE: Does NOT filter deleted_at (Laravel behavior)
   *
   * Returns:
   * - total: All contacts (distinct numbers)
   * - totalBlocked: Contacts with status = 2
   * - totalActive: Contacts with status = 1
   * - totalInactive: Contacts with status = 3
   */
  async getIndicators(userId: number) {
    // 1. Find active WhatsApp number for user
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1, // Active number
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(numberActive.cel);

    // 3. Base query for all metrics
    const baseQuery = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId });
    // NOTE: Deliberately NOT filtering deleted_at (Laravel compatibility)

    // 4. Calculate total (all contacts, distinct by number)
    const total = await baseQuery
      .clone()
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count, 10));

    // 5. Calculate totalBlocked (status = 2)
    const totalBlocked = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 2 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count, 10));

    // 6. Calculate totalActive (status = 1)
    const totalActive = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 1 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count, 10));

    // 7. Calculate totalInactive (status = 3)
    const totalInactive = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 3 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count, 10));

    return {
      data: {
        total,
        totalBlocked,
        totalActive,
        totalInactive,
      },
    };
  }

  /**
   * POST /api/v1/contacts
   * Bulk update contact status
   * Compatible with Laravel: ContactsController::save()
   *
   * Business Rules:
   * 1. Updates multiple contacts at once (bulk operation)
   * 2. Only updates status field
   * 3. Returns unique ID for operation tracking
   *
   * SECURITY IMPROVEMENT:
   * - Laravel does NOT filter by user_id (security flaw!)
   * - NestJS implementation ADDS user_id filter for security
   * - This ensures users can only update their own contacts
   */
  async updateContactsStatus(
    userId: number,
    updateDto: UpdateContactsStatusDto,
  ) {
    const { rows, status } = updateDto;

    // SECURITY: Filter by user_id (Laravel doesn't do this - SECURITY FLAW!)
    // This ensures users can only update their own contacts
    const result = await this.contactRepository.update(
      {
        id: In(rows),
        user_id: userId, // Security filter (not in Laravel!)
      },
      {
        status,
      },
    );

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi atualizado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking (Laravel behavior)
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      data: {
        id: uniqueId,
      },
    };
  }

  /**
   * POST /api/v1/contacts/block
   * Block multiple contacts (set status to 2)
   *
   * Business Rules:
   * 1. Updates multiple contacts at once (bulk operation)
   * 2. Sets status to 2 (Blocked)
   * 3. Returns unique ID for operation tracking
   * 4. User can only block their own contacts (user_id filter)
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async blockContacts(userId: number, blockDto: BlockContactsDto) {
    const { contact_ids } = blockDto;

    // SECURITY: Filter by user_id to ensure users can only block their own contacts
    const result = await this.contactRepository.update(
      {
        id: In(contact_ids),
        user_id: userId, // Security filter
      },
      {
        status: 2, // 2 = Blocked
      },
    );

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi bloqueado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      data: {
        id: uniqueId,
        blocked: result.affected,
      },
    };
  }

  /**
   * POST /api/v1/contacts/unblock
   * Unblock multiple contacts (set status to 1)
   *
   * Business Rules:
   * 1. Updates multiple contacts at once (bulk operation)
   * 2. Sets status to 1 (Active)
   * 3. Returns unique ID for operation tracking
   * 4. User can only unblock their own contacts (user_id filter)
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async unblockContacts(userId: number, unblockDto: UnblockContactsDto) {
    const { contact_ids } = unblockDto;

    // SECURITY: Filter by user_id to ensure users can only unblock their own contacts
    const result = await this.contactRepository.update(
      {
        id: In(contact_ids),
        user_id: userId, // Security filter
      },
      {
        status: 1, // 1 = Active
      },
    );

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi desbloqueado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      data: {
        id: uniqueId,
        unblocked: result.affected,
      },
    };
  }

  /**
   * POST /api/v1/contacts/search
   * Advanced search for contacts
   *
   * Business Rules:
   * 1. Search by query term (minimum 3 characters)
   * 2. Optional type filter: 'name', 'phone', 'label'
   * 3. If type not specified, search in all fields
   * 4. User can only search their own contacts (user_id filter)
   * 5. Only contacts from active WhatsApp number
   * 6. Respects soft deletes (whereNull deleted_at)
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async searchContacts(userId: number, searchDto: SearchContactsDto) {
    const { query, type } = searchDto;

    // 1. Find active WhatsApp number for user
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1, // Active number
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(numberActive.cel);

    // 3. Build base query
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId })
      .andWhere('contacts.deleted_at IS NULL');

    // 4. Apply search based on type
    if (type) {
      // Search in specific field
      switch (type) {
        case 'name':
          queryBuilder.andWhere('contacts.name LIKE :query', {
            query: `%${query}%`,
          });
          break;
        case 'phone':
          queryBuilder.andWhere('contacts.number LIKE :query', {
            query: `%${query}%`,
          });
          break;
        case 'label':
          queryBuilder.andWhere('contacts.labelsName LIKE :query', {
            query: `%${query}%`,
          });
          break;
      }
    } else {
      // Search in all fields
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('contacts.name LIKE :query', { query: `%${query}%` })
            .orWhere('contacts.number LIKE :query', { query: `%${query}%` })
            .orWhere('contacts.labelsName LIKE :query', { query: `%${query}%` });
        }),
      );
    }

    // 5. Execute query with ordering
    const contacts = await queryBuilder
      .orderBy('contacts.id', 'DESC')
      .groupBy('contacts.number')
      .getMany();

    return {
      data: contacts,
      meta: {
        query,
        type: type || 'all',
        total: contacts.length,
      },
    };
  }

  /**
   * GET /api/v1/contacts/active/export
   * Export active contacts to CSV or XLSX
   *
   * Business Rules:
   * 1. Only export active contacts (status = 1)
   * 2. User can only export their own contacts (user_id filter)
   * 3. Optional filter by label_id
   * 4. Format: csv or xlsx (default: csv)
   * 5. Returns file stream for download
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async exportContacts(
    userId: number,
    format: 'csv' | 'xlsx' = 'csv',
    labelId?: number,
  ): Promise<{ stream: Readable; filename: string; contentType: string }> {
    // 1. Find active WhatsApp number for user
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1,
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(numberActive.cel);

    // 3. Build query for active contacts
    const query = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId })
      .andWhere('contacts.status = :status', { status: 1 }) // Only active
      .andWhere('contacts.deleted_at IS NULL');

    // 4. Apply label filter if provided
    if (labelId) {
      query.andWhere('contacts.labelsName LIKE :labelId', {
        labelId: `%${labelId}%`,
      });
    }

    // 5. Get contacts
    const contacts = await query
      .orderBy('contacts.name', 'ASC')
      .groupBy('contacts.number')
      .getMany();

    if (contacts.length === 0) {
      throw new NotFoundException(
        'Nenhum contato ativo encontrado para exportação.',
      );
    }

    // 6. Prepare data for export
    const exportData = contacts.map((contact) => ({
      Nome: contact.name || '',
      Telefone: contact.number || '',
      Status: contact.status === 1 ? 'Ativo' : contact.status === 2 ? 'Bloqueado' : 'Inativo',
      Tags: contact.labelsName || '',
      'Data de Criação': contact.created_at
        ? new Date(contact.created_at).toLocaleDateString('pt-BR')
        : '',
    }));

    // 7. Generate file based on format
    if (format === 'xlsx') {
      return this.generateXlsx(exportData);
    } else {
      return this.generateCsv(exportData);
    }
  }

  /**
   * Generate CSV file from data
   */
  private generateCsv(data: any[]): {
    stream: Readable;
    filename: string;
    contentType: string;
  } {
    const csvStream = format({ headers: true, delimiter: ';' });

    // Write data
    data.forEach((row) => csvStream.write(row));
    csvStream.end();

    return {
      stream: csvStream as unknown as Readable,
      filename: `contatos_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  /**
   * Generate XLSX file from data
   */
  private generateXlsx(data: any[]): {
    stream: Readable;
    filename: string;
    contentType: string;
  } {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create readable stream from buffer
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // Signal end of stream

    return {
      stream,
      filename: `contatos_${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * POST /api/v1/contacts/import/csv
   * Import contacts from CSV file
   *
   * Business Rules:
   * 1. Parse CSV file (detect delimiter: comma, semicolon)
   * 2. Validate Brazilian phone numbers
   * 3. Skip duplicates (check existing numbers)
   * 4. Apply label if specified
   * 5. Return import summary (total, imported, duplicates, errors)
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async importCsv(
    userId: number,
    file: Express.Multer.File,
    labelId?: number,
  ): Promise<{
    message: string;
    summary: {
      total_lines: number;
      imported: number;
      duplicates: number;
      invalid: number;
      errors: string[];
    };
  }> {
    // 1. Find active WhatsApp number for user
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1,
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(numberActive.cel);

    // 3. Get label name if provided
    let labelName: string | null = null;
    if (labelId) {
      // TODO: Once Label entity is implemented, fetch label name
      labelName = `Label_${labelId}`;
    }

    // 4. Parse CSV file
    const parseResult = await this.parseCsvFile(file);

    // 5. Import contacts
    let imported = 0;
    let duplicates = 0;
    let invalid = 0;
    const errors: string[] = [];

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i];
      const lineNumber = i + 2; // +2 because CSV has header and arrays are 0-indexed

      try {
        // Validate phone number
        const phone = this.extractPhone(row);
        if (!phone || phone.length < 10) {
          invalid++;
          errors.push(
            `Linha ${lineNumber}: Número de telefone inválido ou ausente`,
          );
          continue;
        }

        // Format phone number
        const formattedPhone = NumberHelper.formatNumber(phone);

        // Check for duplicates
        const existingContact = await this.contactRepository.findOne({
          where: {
            number: formattedPhone,
            user_id: userId,
            number_id: numberActive.id,
          },
        });

        if (existingContact) {
          duplicates++;
          continue;
        }

        // Create contact
        const contact = this.contactRepository.create({
          name: this.extractName(row) || 'Sem Nome',
          number: formattedPhone,
          cel_owner: normalizedCel,
          status: 1, // Active
          user_id: userId,
          number_id: numberActive.id,
          labelsName: labelName,
        });

        await this.contactRepository.save(contact);
        imported++;
      } catch (error) {
        invalid++;
        errors.push(
          `Linha ${lineNumber}: Erro ao importar - ${error.message}`,
        );
      }
    }

    return {
      message: 'Importação concluída com sucesso',
      summary: {
        total_lines: parseResult.rows.length,
        imported,
        duplicates,
        invalid,
        errors: errors.slice(0, 10), // Limit to first 10 errors
      },
    };
  }

  /**
   * POST /api/v1/contacts/import/test
   * Test CSV import without saving to database
   *
   * Business Rules:
   * 1. Parse CSV file
   * 2. Validate data
   * 3. Return preview/validation results
   * 4. DO NOT save to database
   *
   * NOTE: Laravel endpoint is documented but NOT implemented
   * This is a NEW implementation following the documented specification
   */
  async testImport(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{
    message: string;
    preview: {
      total_lines: number;
      valid: number;
      invalid: number;
      sample: any[];
      errors: string[];
    };
  }> {
    // 1. Find active WhatsApp number for user (for validation purposes)
    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1,
      },
    });

    if (!numberActive || !numberActive.cel) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Parse CSV file
    const parseResult = await this.parseCsvFile(file);

    // 3. Validate data
    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];
    const sample: any[] = [];

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i];
      const lineNumber = i + 2;

      // Validate phone number
      const phone = this.extractPhone(row);
      const formattedPhone = phone
        ? NumberHelper.formatNumber(phone)
        : null;

      const isValid = formattedPhone && formattedPhone.length >= 12;

      if (isValid) {
        valid++;
        // Add first 5 valid contacts to sample
        if (sample.length < 5) {
          sample.push({
            name: this.extractName(row) || 'Sem Nome',
            phone: formattedPhone,
          });
        }
      } else {
        invalid++;
        errors.push(
          `Linha ${lineNumber}: Número de telefone inválido - "${phone || 'vazio'}"`,
        );
      }
    }

    return {
      message: 'Preview da importação gerado com sucesso',
      preview: {
        total_lines: parseResult.rows.length,
        valid,
        invalid,
        sample,
        errors: errors.slice(0, 10), // Limit to first 10 errors
      },
    };
  }

  /**
   * Parse CSV file and return rows
   */
  private async parseCsvFile(
    file: Express.Multer.File,
  ): Promise<{ rows: any[] }> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      const stream = Readable.from(file.buffer);

      // Detect delimiter by checking first line
      const firstLine = file.buffer.toString('utf-8').split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      stream
        .pipe(
          csvParser({
            separator: delimiter,
            mapHeaders: ({ header }: { header: string }) => header.trim().toLowerCase(),
          }),
        )
        .on('data', (row: any) => {
          rows.push(row);
        })
        .on('end', () => {
          resolve({ rows });
        })
        .on('error', (error: Error) => {
          reject(
            new BadRequestException(
              `Erro ao processar arquivo CSV: ${error.message}`,
            ),
          );
        });
    });
  }

  /**
   * Extract phone number from CSV row
   * Tries multiple column names: telefone, phone, numero, number, cel, celular
   */
  private extractPhone(row: any): string | null {
    const phoneKeys = [
      'telefone',
      'phone',
      'numero',
      'number',
      'cel',
      'celular',
      'fone',
    ];

    for (const key of phoneKeys) {
      if (row[key]) {
        return String(row[key]).trim();
      }
    }

    // If no named column, try first column
    const firstValue = Object.values(row)[0];
    return firstValue ? String(firstValue).trim() : null;
  }

  /**
   * Extract name from CSV row
   * Tries multiple column names: nome, name
   */
  private extractName(row: any): string | null {
    const nameKeys = ['nome', 'name', 'nome completo', 'full name'];

    for (const key of nameKeys) {
      if (row[key]) {
        return String(row[key]).trim();
      }
    }

    // If no phone key found, try second column
    const values = Object.values(row);
    return values[1] ? String(values[1]).trim() : null;
  }
}
