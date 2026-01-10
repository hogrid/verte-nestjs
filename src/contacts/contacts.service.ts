import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In, IsNull } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { Client as PgClient } from 'pg';
import { Contact } from '../database/entities/contact.entity';
import { Number as NumberEntity } from '../database/entities/number.entity';
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
  private readonly logger = new Logger(ContactsService.name);

  private readonly syncSubject = new Subject<{
    type: 'start' | 'progress' | 'complete' | 'error';
    total?: number;
    imported?: number;
    progress?: number;
    message?: string;
  }>();
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(NumberEntity)
    private readonly numberRepository: Repository<NumberEntity>,
  ) {}

  onSync(): Observable<{
    type: 'start' | 'progress' | 'complete' | 'error';
    total?: number;
    imported?: number;
    progress?: number;
    message?: string;
  }> {
    return this.syncSubject.asObservable();
  }

  async syncFromEvolution(userId: number) {
    this.logger.log(`🔄 Iniciando syncFromEvolution para user ${userId}`);

    const numberActive = await this.numberRepository.findOne({
      where: {
        user_id: userId,
        status: 1,
        status_connection: 1, // IMPORTANTE: Só sincronizar se WhatsApp estiver conectado
      },
    });
    if (!numberActive) {
      this.logger.warn(
        `⚠️ Sincronização ignorada: nenhum número ativo E conectado para user ${userId}`,
      );
      return { total: 0, imported: 0 };
    }

    this.logger.log(
      `✅ Número ativo encontrado: ${numberActive.instance} (cel: ${numberActive.cel})`,
    );

    // Se cel não estiver disponível, tentar buscar do Evolution Postgres
    let ownerCel = numberActive.cel;
    if (!ownerCel && numberActive.instance) {
      try {
        const pgUri =
          process.env.EVOLUTION_PG_URI ||
          'postgres://postgres:postgres@localhost:5433/evolution';
        const pg = new PgClient({ connectionString: pgUri });
        await pg.connect();
        const res = await pg.query(
          'SELECT "ownerJid" FROM "Instance" WHERE name = $1 LIMIT 1',
          [numberActive.instance],
        );
        const row = res.rows?.[0];
        await pg.end();
        if (row?.ownerJid) {
          // ownerJid é no formato "5511999999999@s.whatsapp.net"
          ownerCel = row.ownerJid.replace(/@.*/, '');
          // Salvar o cel no banco para uso futuro
          await this.numberRepository.update(numberActive.id, {
            cel: ownerCel,
          });
        }
      } catch {
        // Usar instance name como fallback
        ownerCel = numberActive.instance;
      }
    }

    // Se ainda não tiver cel, usar instance como identificador
    if (!ownerCel) {
      ownerCel = numberActive.instance || `user_${userId}`;
    }

    this.logger.log(`📱 ownerCel final: ${ownerCel}`);

    const pgUri =
      process.env.EVOLUTION_PG_URI ||
      'postgres://postgres:postgres@localhost:5433/evolution';
    this.logger.log(
      `🔗 Conectando ao Evolution Postgres: ${pgUri.replace(/:[^@]+@/, ':****@')}`,
    );

    const pg = new PgClient({ connectionString: pgUri });
    await pg.connect();
    try {
      const instRes = await pg.query(
        'SELECT id FROM "Instance" WHERE name = $1 LIMIT 1',
        [numberActive.instance],
      );
      const instanceId = instRes.rows?.[0]?.id;
      if (!instanceId) {
        this.logger.error(
          `❌ Instância "${numberActive.instance}" não encontrada no Evolution`,
        );
        throw new Error('Instância não encontrada no Evolution');
      }

      this.logger.log(`✅ Instância encontrada no Evolution: ${instanceId}`);

      const countRes = await pg.query(
        'SELECT COUNT(*)::int AS cnt FROM "Contact" WHERE "instanceId" = $1',
        [instanceId],
      );
      const total: number = countRes.rows?.[0]?.cnt ?? 0;
      this.logger.log(`📊 Total de contatos no Evolution: ${total}`);

      this.syncSubject.next({ type: 'start', total, imported: 0, progress: 0 });

      const batchSize = 500;
      let imported = 0;
      let skipped = 0;
      let filtered = 0;
      const normalizedOwner = NumberHelper.formatNumber(ownerCel) || ownerCel;

      this.logger.log(
        `🔄 Iniciando loop de importação (batchSize: ${batchSize})`,
      );

      for (let offset = 0; offset < total; offset += batchSize) {
        const rowsRes = await pg.query(
          'SELECT "remoteJid", "pushName" FROM "Contact" WHERE "instanceId" = $1 ORDER BY "createdAt" ASC OFFSET $2 LIMIT $3',
          [instanceId, offset, batchSize],
        );
        const batchCount = rowsRes.rows.length;
        this.logger.log(
          `📦 Batch ${offset}-${offset + batchCount}: ${batchCount} contatos`,
        );

        for (const r of rowsRes.rows as Array<{
          remoteJid: string;
          pushName: string | null;
        }>) {
          const remote = r.remoteJid || '';

          // Filtrar grupos - só importar contatos
          if (NumberHelper.isGroupJid(remote)) {
            filtered++;
            continue; // Pular grupos (@g.us)
          }

          // Verificar se é um contato válido
          if (!NumberHelper.isValidContactJid(remote)) {
            filtered++;
            continue; // Pular se não é um contato válido (@s.whatsapp.net)
          }

          const digits = remote.replace(/@.*/, '').replace(/\D/g, '');
          const phone = NumberHelper.formatNumber(digits);

          // Validar número brasileiro
          if (!NumberHelper.isValidBrazilianPhone(phone)) {
            filtered++;
            continue; // Pular números inválidos
          }

          const exists = await this.contactRepository.findOne({
            where: {
              user_id: userId,
              number_id: numberActive.id,
              number: phone,
            },
          });
          if (exists) {
            skipped++;
            continue;
          }

          const contact = this.contactRepository.create({
            user_id: userId,
            number_id: numberActive.id,
            name: r.pushName || null,
            number: phone,
            cel_owner: normalizedOwner,
            status: 1,
            type: 1,
          });
          await this.contactRepository.save(contact);
          imported++;

          // Log a cada 10 contatos importados
          if (imported % 10 === 0) {
            this.logger.log(
              `✅ Importados: ${imported} (filtrados: ${filtered}, pulados: ${skipped})`,
            );
          }
        }
        const progress =
          total > 0
            ? Math.round((Math.min(offset + batchSize, total) / total) * 100)
            : 100;
        this.syncSubject.next({ type: 'progress', total, imported, progress });
      }

      this.logger.log(
        `🎉 Sincronização finalizada: ${imported} importados, ${skipped} pulados (já existiam), ${filtered} filtrados (inválidos/grupos)`,
      );

      this.syncSubject.next({
        type: 'complete',
        total,
        imported,
        progress: 100,
      });
      return { total, imported };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `❌ Erro na sincronização: ${errorMessage}`,
        errorStack,
      );
      this.syncSubject.next({ type: 'error', message: errorMessage });
      throw err;
    } finally {
      await pg.end();
    }
  }

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

    if (!numberActive) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // 2. Get cel - try to fetch from Evolution if not available
    let ownerCel = numberActive.cel;
    if (!ownerCel && numberActive.instance) {
      try {
        const pgUri =
          process.env.EVOLUTION_PG_URI ||
          'postgres://postgres:postgres@localhost:5433/evolution';
        const pg = new PgClient({ connectionString: pgUri });
        await pg.connect();
        const res = await pg.query(
          'SELECT "ownerJid" FROM "Instance" WHERE name = $1 LIMIT 1',
          [numberActive.instance],
        );
        const row = res.rows?.[0];
        await pg.end();
        if (row?.ownerJid) {
          // ownerJid format: "5511999999999@s.whatsapp.net"
          ownerCel = row.ownerJid.replace(/@.*/, '');
          // Save cel for future use
          await this.numberRepository.update(numberActive.id, {
            cel: ownerCel,
          });
        }
      } catch {
        // Use instance name as fallback
        ownerCel = numberActive.instance;
      }
    }

    // If still no cel, use instance as identifier
    if (!ownerCel) {
      ownerCel = numberActive.instance || `user_${userId}`;
    }

    // 3. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(ownerCel) || ownerCel;

    // 3. Build query with base filters
    const query = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId })
      .andWhere('contacts.deleted_at IS NULL');

    // 4. FILTER: Status (can be array, string, or number)
    // Normaliza para array de números para garantir compatibilidade
    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ''
    ) {
      let statuses: number[];

      if (Array.isArray(filters.status)) {
        // Already an array - convert each element to number
        statuses = filters.status.map((s) => Number(s));
      } else if (typeof filters.status === 'string') {
        // Can come as "1" or "1,2,3" from query string
        statuses = filters.status
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      } else {
        // Single number value
        statuses = [Number(filters.status)];
      }

      // Only apply filter if we have valid statuses
      if (statuses.length > 0) {
        query.andWhere('contacts.status IN (:...statuses)', { statuses });
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
    const idsSubquery = this.contactRepository
      .createQueryBuilder('c')
      .select('MAX(c.id)', 'maxId')
      .where('c.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('c.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('c.user_id = :userId', { userId })
      .andWhere('c.deleted_at IS NULL')
      .groupBy('c.number');

    // Apply filters mirror to subquery (same normalization as main query)
    if (
      filters.status !== undefined &&
      filters.status !== null &&
      filters.status !== ''
    ) {
      let subStatuses: number[];

      if (Array.isArray(filters.status)) {
        subStatuses = filters.status.map((s) => Number(s));
      } else if (typeof filters.status === 'string') {
        subStatuses = filters.status
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      } else {
        subStatuses = [Number(filters.status)];
      }

      if (subStatuses.length > 0) {
        idsSubquery.andWhere('c.status IN (:...subStatuses)', { subStatuses });
      }
    }
    if (filters.tag) {
      idsSubquery.andWhere('c.labelsName LIKE :tag', {
        tag: `%${filters.tag}%`,
      });
    }
    if (filters.search) {
      idsSubquery.andWhere(
        new Brackets((qb) => {
          qb.where('c.name LIKE :search', {
            search: `%${filters.search}%`,
          }).orWhere('c.number LIKE :search', {
            search: `%${filters.search}%`,
          });
        }),
      );
    }

    const idsRaw = await idsSubquery.getRawMany();
    const ids = idsRaw.map((r: any) => r.maxId);

    // Paginação
    const page = Math.max(1, Number(filters.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(filters.per_page) || 20));
    const totalCount = ids.length;
    const lastPage = Math.ceil(totalCount / perPage) || 1;
    const offset = (page - 1) * perPage;

    // Aplicar paginação aos IDs
    const paginatedIds = ids.slice(offset, offset + perPage);

    const contacts = paginatedIds.length
      ? await this.contactRepository.find({
          where: { id: In(paginatedIds) },
          order: { id: 'DESC' },
        })
      : [];

    return {
      data: contacts,
      meta: {
        total: totalCount,
        page,
        per_page: perPage,
        last_page: lastPage,
      },
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

    this.logger.log(
      `🔍 getIndicators para user ${userId}: numberActive=${JSON.stringify(numberActive ? { id: numberActive.id, instance: numberActive.instance, cel: numberActive.cel, status: numberActive.status } : null)}`,
    );

    // Return default values if no active WhatsApp number found
    if (!numberActive) {
      this.logger.warn(`⚠️ Nenhum número ativo encontrado para user ${userId}`);
      return {
        data: {
          total: 0,
          totalBlocked: 0,
          totalActive: 0,
          totalInactive: 0,
        },
      };
    }

    // 2. Get cel - try to fetch from Evolution if not available
    let ownerCel = numberActive.cel;
    if (!ownerCel && numberActive.instance) {
      try {
        const pgUri =
          process.env.EVOLUTION_PG_URI ||
          'postgres://postgres:postgres@localhost:5433/evolution';
        const pg = new PgClient({ connectionString: pgUri });
        await pg.connect();
        const res = await pg.query(
          'SELECT "ownerJid" FROM "Instance" WHERE name = $1 LIMIT 1',
          [numberActive.instance],
        );
        const row = res.rows?.[0];
        await pg.end();
        if (row?.ownerJid) {
          ownerCel = row.ownerJid.replace(/@.*/, '');
          await this.numberRepository.update(numberActive.id, {
            cel: ownerCel,
          });
        }
      } catch {
        ownerCel = numberActive.instance;
      }
    }

    if (!ownerCel) {
      return {
        data: {
          total: 0,
          totalBlocked: 0,
          totalActive: 0,
          totalInactive: 0,
        },
      };
    }

    // 3. Normalize cel_owner
    const normalizedCel = NumberHelper.formatNumber(ownerCel) || ownerCel;

    this.logger.log(
      `📊 getIndicators: ownerCel=${ownerCel}, normalizedCel=${normalizedCel}, numberId=${numberActive.id}`,
    );

    // DEBUG: Check what values are actually stored in contacts table
    const sampleContacts = await this.contactRepository.find({
      where: { user_id: userId },
      select: ['id', 'number', 'cel_owner', 'number_id', 'status'],
      take: 5,
    });
    this.logger.log(
      `🔍 Sample contacts in DB: ${JSON.stringify(sampleContacts)}`,
    );

    // DEBUG: Count all contacts for this user (without cel_owner filter)
    const totalCountAll = await this.contactRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });
    this.logger.log(
      `🔍 Total contacts for user ${userId} (all): ${totalCountAll}`,
    );

    // 3. Base query for all metrics
    const baseQuery = this.contactRepository
      .createQueryBuilder('contacts')
      .where('contacts.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('contacts.user_id = :userId', { userId });
    // NOTE: Deliberately NOT filtering deleted_at (Laravel compatibility)

    // 4. Calculate total (all contacts, distinct by number)
    const totalResult = await baseQuery
      .clone()
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne();
    const total = parseInt(totalResult?.count ?? '0', 10) || 0;

    // 5. Calculate totalBlocked (status = 2)
    const blockedResult = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 2 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne();
    const totalBlocked = parseInt(blockedResult?.count ?? '0', 10) || 0;

    // 6. Calculate totalActive (status = 1)
    const activeResult = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 1 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne();
    const totalActive = parseInt(activeResult?.count ?? '0', 10) || 0;

    // 7. Calculate totalInactive (status = 3)
    const inactiveResult = await baseQuery
      .clone()
      .andWhere('contacts.status = :status', { status: 3 })
      .select('COUNT(DISTINCT contacts.number)', 'count')
      .getRawOne();
    const totalInactive = parseInt(inactiveResult?.count ?? '0', 10) || 0;

    this.logger.log(
      `✅ getIndicators result: total=${total}, totalActive=${totalActive}, totalBlocked=${totalBlocked}, totalInactive=${totalInactive}`,
    );

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
    // Aceita tanto 'rows' (Laravel/frontend) quanto 'contact_ids' (formato novo)
    const contactIds = updateDto.rows || updateDto.contact_ids;
    const { status } = updateDto;

    if (!contactIds || contactIds.length === 0) {
      throw new BadRequestException('Nenhum ID de contato fornecido.');
    }

    this.logger.log(
      `📝 Atualizando ${contactIds.length} contatos para status=${status} (user=${userId})`,
    );
    this.logger.log(
      `📋 TODOS os IDs recebidos (${contactIds.length} total): [${contactIds.join(', ')}]`,
    );

    // Verificar se há IDs duplicados
    const uniqueIds = [...new Set(contactIds)];
    if (uniqueIds.length !== contactIds.length) {
      this.logger.warn(
        `⚠️ DUPLICATAS DETECTADAS! ${contactIds.length} enviados, ${uniqueIds.length} únicos`,
      );
    }

    // DEBUG: Verificar quantos contatos existem com esses IDs SEM filtro de user_id
    const allContactsWithIds = await this.contactRepository.find({
      where: {
        id: In(contactIds),
      },
      select: ['id', 'status', 'deleted_at', 'user_id'],
    });

    this.logger.log(
      `🔍 DEBUG: ${allContactsWithIds.length} contatos encontrados no banco com esses IDs (sem filtro user_id)`,
    );

    // Verificar quantos pertencem ao usuário
    const belongsToUser = allContactsWithIds.filter(
      (c) => c.user_id === userId,
    );
    const belongsToOthers = allContactsWithIds.filter(
      (c) => c.user_id !== userId,
    );

    this.logger.log(
      `🔍 DEBUG: ${belongsToUser.length} pertencem ao user=${userId}, ${belongsToOthers.length} pertencem a OUTROS usuários`,
    );

    if (belongsToOthers.length > 0) {
      const otherUserIds = [...new Set(belongsToOthers.map((c) => c.user_id))];
      this.logger.warn(
        `⚠️ IDs de outros usuários detectados: ${otherUserIds.join(', ')}`,
      );
    }

    const alreadyWithStatus = belongsToUser.filter((c) => c.status === status);
    const canBeUpdated = belongsToUser.filter((c) => c.status !== status);
    const deletedOnes = belongsToUser.filter((c) => c.deleted_at !== null);

    this.logger.log(
      `🔍 DEBUG: ${alreadyWithStatus.length} já têm status=${status}, ${canBeUpdated.length} serão atualizados, ${deletedOnes.length} estão deletados`,
    );

    // SECURITY: Filter by user_id only
    // Os IDs já vêm do frontend que os obteve de uma query filtrada
    // Filtrar por user_id é suficiente para segurança (evita cross-user attack)
    const result = await this.contactRepository.update(
      {
        id: In(contactIds),
        user_id: userId,
      },
      {
        status,
      },
    );

    this.logger.log(
      `✅ ${result.affected} contatos atualizados com sucesso (expected: ${canBeUpdated.length})`,
    );

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi atualizado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking (Laravel behavior)
    const uniqueId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      data: {
        id: uniqueId,
        affected: result.affected,
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

    this.logger.log(
      `🚫 Bloqueando ${contact_ids.length} contatos (user=${userId})`,
    );

    // SECURITY: Filter by user_id only
    const result = await this.contactRepository.update(
      {
        id: In(contact_ids),
        user_id: userId,
      },
      {
        status: 2, // 2 = Blocked
      },
    );

    this.logger.log(`✅ ${result.affected} contatos bloqueados com sucesso`);

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi bloqueado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking
    const uniqueId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);

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

    this.logger.log(
      `✅ Desbloqueando ${contact_ids.length} contatos (user=${userId})`,
    );

    // SECURITY: Filter by user_id only
    const result = await this.contactRepository.update(
      {
        id: In(contact_ids),
        user_id: userId,
      },
      {
        status: 1, // 1 = Active
      },
    );

    this.logger.log(`✅ ${result.affected} contatos desbloqueados com sucesso`);

    // Check if any contacts were updated
    if (result.affected === 0) {
      throw new BadRequestException(
        'Nenhum contato foi desbloqueado. Verifique se os IDs pertencem ao usuário.',
      );
    }

    // Generate unique ID for operation tracking
    const uniqueId =
      Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      data: {
        id: uniqueId,
        unblocked: result.affected,
      },
    };
  }

  /**
   * DELETE /api/v1/contacts
   * Remove all contacts from the user
   *
   * Business Rules:
   * 1. Removes ALL contacts from the user
   * 2. Filtered by active WhatsApp number (cel_owner)
   * 3. Uses soft delete to maintain data integrity
   * 4. Called automatically when WhatsApp is disconnected
   * 5. User can only remove their own contacts (user_id filter)
   *
   * Security:
   * - Filtered by user_id to ensure users can only remove their own contacts
   *
   * Note: Removes ALL contacts regardless of source (WhatsApp, CSV, Publics)
   */
  async removeAll(userId: number) {
    this.logger.log(`🗑️ Removendo TODOS os contatos do usuário ${userId}...`);

    // Soft delete de TODOS os contatos do usuário (independente de cel_owner)
    // Isso garante que contatos de todas as fontes (WhatsApp, CSV, Publics) sejam removidos
    const result = await this.contactRepository.softDelete({
      user_id: userId,
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`✅ ${deletedCount} contatos removidos com sucesso`);

    return {
      data: {
        deleted: deletedCount,
        message: `${deletedCount} contatos removidos com sucesso`,
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
            .orWhere('contacts.labelsName LIKE :query', {
              query: `%${query}%`,
            });
        }),
      );
    }

    // 5. Execute query with ordering
    const idsSubquery = this.contactRepository
      .createQueryBuilder('c')
      .select('MAX(c.id)', 'maxId')
      .where('c.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('c.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('c.user_id = :userId', { userId })
      .andWhere('c.deleted_at IS NULL')
      .groupBy('c.number');

    if (type) {
      switch (type) {
        case 'name':
          idsSubquery.andWhere('c.name LIKE :query', { query: `%${query}%` });
          break;
        case 'phone':
          idsSubquery.andWhere('c.number LIKE :query', { query: `%${query}%` });
          break;
        case 'label':
          idsSubquery.andWhere('c.labelsName LIKE :query', {
            query: `%${query}%`,
          });
          break;
      }
    } else {
      idsSubquery.andWhere(
        new Brackets((qb) => {
          qb.where('c.name LIKE :query', { query: `%${query}%` })
            .orWhere('c.number LIKE :query', { query: `%${query}%` })
            .orWhere('c.labelsName LIKE :query', { query: `%${query}%` });
        }),
      );
    }

    const idsRaw = await idsSubquery.getRawMany();
    const ids = idsRaw.map((r: any) => r.maxId);
    const contacts = ids.length
      ? await this.contactRepository.find({
          where: { id: In(ids) },
          order: { id: 'DESC' },
        })
      : [];

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
    const idsSubquery = this.contactRepository
      .createQueryBuilder('c')
      .select('MAX(c.id)', 'maxId')
      .where('c.number_id = :numberId', { numberId: numberActive.id })
      .andWhere('c.cel_owner = :celOwner', { celOwner: normalizedCel })
      .andWhere('c.user_id = :userId', { userId })
      .andWhere('c.status = :status', { status: 1 })
      .andWhere('c.deleted_at IS NULL')
      .groupBy('c.number');

    if (labelId) {
      idsSubquery.andWhere('c.labelsName LIKE :labelId', {
        labelId: `%${labelId}%`,
      });
    }

    const idsRaw = await idsSubquery.getRawMany();
    const ids = idsRaw.map((r: any) => r.maxId);
    const contacts = ids.length
      ? await this.contactRepository.find({
          where: { id: In(ids) },
          order: { name: 'ASC' },
        })
      : [];

    if (contacts.length === 0) {
      throw new NotFoundException(
        'Nenhum contato ativo encontrado para exportação.',
      );
    }

    // 6. Prepare data for export
    const exportData = contacts.map((contact) => ({
      Nome: contact.name || '',
      Telefone: contact.number || '',
      Status:
        contact.status === 1
          ? 'Ativo'
          : contact.status === 2
            ? 'Bloqueado'
            : 'Inativo',
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
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`Linha ${lineNumber}: Erro ao importar - ${errorMessage}`);
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
      const formattedPhone = phone ? NumberHelper.formatNumber(phone) : null;

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
            mapHeaders: ({ header }: { header: string }) =>
              header.trim().toLowerCase(),
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
    if (!firstValue || typeof firstValue === 'object') return null;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(firstValue).trim();
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
    const secondValue = values[1];
    if (!secondValue || typeof secondValue === 'object') return null;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(secondValue).trim();
  }
}
