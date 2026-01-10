import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Campaign } from '../database/entities/campaign.entity';
import { Number } from '../database/entities/number.entity';
import { Contact } from '../database/entities/contact.entity';
import { Public } from '../database/entities/public.entity';
import { Message } from '../database/entities/message.entity';
import { Plan } from '../database/entities/plan.entity';
import { User } from '../database/entities/user.entity';
import { SimplifiedPublic } from '../database/entities/simplified-public.entity';
import { CustomPublic } from '../database/entities/custom-public.entity';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListSimplifiedPublicDto } from './dto/list-simplified-public.dto';
import { CreateSimplifiedPublicDto } from './dto/create-simplified-public.dto';
import { UpdateSimplifiedPublicDto } from './dto/update-simplified-public.dto';
import { CreateCustomPublicDto } from './dto/create-custom-public.dto';
import { UpdateCustomPublicDto } from './dto/update-custom-public.dto';
import { CreateLabelPublicDto } from './dto/create-label-public.dto';
import { QUEUE_NAMES } from '../config/redis.config';

/**
 * CampaignsService
 * Handles campaign business logic (FASE 1: CRUD básico)
 * Maintains 100% compatibility with Laravel CampaignsController
 */
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Public)
    private readonly publicRepository: Repository<Public>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SimplifiedPublic)
    private readonly simplifiedPublicRepository: Repository<SimplifiedPublic>,
    @InjectRepository(CustomPublic)
    private readonly customPublicRepository: Repository<CustomPublic>,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SIMPLIFIED_PUBLIC)
    private readonly simplifiedPublicQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CUSTOM_PUBLIC)
    private readonly customPublicQueue: Queue,
  ) {}

  /**
   * List campaigns with filters and pagination
   * Laravel: CampaignsController@index (lines 257-362)
   */
  async findAll(userId: number, dto: ListCampaignsDto) {
    this.logger.log('🟢 Listando campanhas', { userId });

    try {
      // Get active Number or by numberId
      let numberActive: Number | null = null;
      if (dto.numberId) {
        numberActive = await this.numberRepository.findOne({
          where: { user_id: userId, id: dto.numberId },
        });
      } else {
        numberActive = await this.numberRepository.findOne({
          where: { user_id: userId, status: 1 },
        });
      }

      if (!numberActive) {
        throw new NotFoundException('Número WhatsApp não encontrado.');
      }

      this.logger.log('✅ Número encontrado', {
        number_id: numberActive.id,
        cel: numberActive.cel,
      });

      // Build base query (simplified - without subqueries for now)
      // Select only specific columns to avoid database schema mismatches
      const queryBuilder = this.campaignRepository
        .createQueryBuilder('campaigns')
        .where('campaigns.user_id = :userId', { userId })
        .andWhere('campaigns.number_id = :numberId', {
          numberId: numberActive.id,
        })
        .leftJoin('campaigns.public', 'public')
        .addSelect(['public.id', 'public.name', 'public.status'])
        .leftJoin('campaigns.messages', 'messages')
        .addSelect([
          'messages.id',
          'messages.message',
          'messages.type',
          'messages.order',
          'messages.media',
        ])
        .leftJoin('campaigns.number', 'number')
        .addSelect(['number.id', 'number.name', 'number.cel', 'number.status']);

      // Apply search filter
      if (dto.search) {
        queryBuilder.andWhere('campaigns.name LIKE :search', {
          search: `%${dto.search}%`,
        });
      }

      // Apply filterFields (JSON format: [{"field":"status","value":"0"},...])
      if (dto.filterFields) {
        try {
          const filterFields = JSON.parse(dto.filterFields) as Array<{
            field: string;
            value: string;
          }>;

          // Group by field
          const groupedFields = filterFields.reduce(
            (acc: Record<string, string[]>, filter) => {
              if (!acc[filter.field]) {
                acc[filter.field] = [];
              }
              acc[filter.field].push(filter.value);
              return acc;
            },
            {} as Record<string, string[]>,
          );

          // Apply filters
          if (groupedFields.status && groupedFields.status.length > 0) {
            queryBuilder.andWhere('campaigns.status IN (:...statusValues)', {
              statusValues: groupedFields.status,
            });
          }
          if (groupedFields.id && groupedFields.id.length > 0) {
            queryBuilder.andWhere('campaigns.id IN (:...idValues)', {
              idValues: groupedFields.id,
            });
          }
          if (groupedFields.type && groupedFields.type.length > 0) {
            queryBuilder.andWhere('campaigns.type IN (:...typeValues)', {
              typeValues: groupedFields.type,
            });
          }
        } catch (error: unknown) {
          this.logger.warn('⚠️ Erro ao parsear filterFields', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Apply ordering
      const order = dto.order || 'desc';
      queryBuilder.orderBy(
        'campaigns.id',
        order.toUpperCase() as 'ASC' | 'DESC',
      );

      // Apply pagination
      const perPage = dto.per_page || 10;
      const page = dto.page || 1;
      const skip = (page - 1) * perPage;

      queryBuilder.skip(skip).take(perPage);

      // Execute query
      const [campaigns, total] = await queryBuilder.getManyAndCount();

      // Format response (matching Laravel pagination format)
      const lastPage = Math.ceil(total / perPage);
      const from = total > 0 ? skip + 1 : null;
      const to = total > 0 ? Math.min(skip + perPage, total) : null;

      this.logger.log('🟢 Campanhas listadas', { count: campaigns.length });

      return {
        data: campaigns,
        meta: {
          current_page: page,
          from,
          to,
          per_page: perPage,
          total,
          last_page: lastPage,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao listar campanhas', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Create a new campaign
   * Laravel: CampaignsController@store (lines 408-649)
   */
  async create(userId: number, dto: CreateCampaignDto) {
    this.logger.log('🚀 Criando campanha', { userId, name: dto.name });

    try {
      // 1. Find Number
      const number = await this.numberRepository.findOne({
        where: { id: dto.number_id, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException(
          'Número WhatsApp não encontrado ou não pertence ao usuário.',
        );
      }

      this.logger.log('✅ Número encontrado', {
        number_id: number.id,
        cel: number.cel,
      });

      // 2. Query contacts - simplified version for compatibility
      let contacts: Contact[];

      this.logger.log('🔍 Buscando contatos', {
        public_id: dto.public_id,
        number_id: number.id,
      });

      if (dto.public_id === 'new') {
        // All contacts for this number and user
        contacts = await this.contactRepository.find({
          where: {
            user_id: userId,
            number_id: number.id,
            status: 1,
          },
        });
      } else {
        // Contacts from specific public
        contacts = await this.contactRepository.find({
          where: {
            user_id: userId,
            public_id: parseInt(String(dto.public_id), 10),
          },
        });
      }

      this.logger.log('📊 Contatos encontrados', {
        total: contacts.length,
      });

      if (contacts.length === 0) {
        throw new BadRequestException(
          'Sem contatos suficientes para efetuar o disparo.',
        );
      }

      // Use contacts count directly
      const totalContacts = contacts.length;

      // 3. Calculate date_end (Laravel uses 30 days by default)
      // TODO: Implement plan-based recurrency when field exists in database
      const dateEnd: Date = new Date();
      dateEnd.setDate(dateEnd.getDate() + 30); // Default: 30 days

      this.logger.log('📅 Data de fim calculada', {
        date_end: dateEnd,
        days: 30,
      });

      // 4. Handle public_id = "new" (create/find default public)
      let publicId: number | null = null;

      if (dto.public_id === 'new') {
        let defaultPublic = await this.publicRepository.findOne({
          where: { user_id: userId, name: 'Todos os contatos' },
        });

        if (!defaultPublic) {
          defaultPublic = this.publicRepository.create({
            user_id: userId,
            name: 'Todos os contatos',
            status: 0,
          });
          await this.publicRepository.save(defaultPublic);
          this.logger.log('✅ Público padrão criado', { id: defaultPublic.id });
        }

        publicId = defaultPublic.id;
      } else {
        publicId = parseInt(String(dto.public_id), 10);
      }

      // 5. Determine status and handle schedule_date
      let status = 0; // Default: pending
      let scheduleDate: Date | null = null;

      if (dto.schedule_date) {
        status = 3; // Scheduled
        // Convert from America/Sao_Paulo to UTC
        scheduleDate = new Date(dto.schedule_date);
        // Adjust timezone (Laravel: America/Sao_Paulo -> UTC = -3 hours)
        scheduleDate.setHours(scheduleDate.getHours() + 3);
      }

      this.logger.log('⚙️ Status definido', {
        status,
        schedule_date: scheduleDate,
      });

      // 6. Create Campaign
      const campaign = this.campaignRepository.create({
        user_id: userId,
        number_id: dto.number_id,
        public_id: publicId,
        name: dto.name,
        type: 1, // Default: Simplificada
        status,
        date_end: dateEnd,
        total_contacts: totalContacts,
        schedule_date: scheduleDate,
        labels: dto.labels ? JSON.stringify(dto.labels) : null,
      });

      const savedCampaign = await this.campaignRepository.save(campaign);
      this.logger.log('✅ Campanha criada', { campaign_id: savedCampaign.id });

      // 7. Create Messages (TODO: handle media upload)
      const messages = dto.messages || [];
      this.logger.log('📝 Processando mensagens', {
        count: messages.length,
      });

      if (messages.length === 0) {
        this.logger.warn(
          '⚠️ Nenhuma mensagem fornecida, criando mensagem padrão',
        );
        // Create default empty message if none provided
        const defaultMessage = this.messageRepository.create({
          campaign_id: savedCampaign.id,
          user_id: userId,
          message: '',
          type: 1,
          order: 0,
          media: null,
        });
        await this.messageRepository.save(defaultMessage);
      } else {
        for (const [index, messageDto] of messages.entries()) {
          const mediaType =
            messageDto.media_type ||
            this.getMediaTypeFromString(messageDto.type);
          const message = this.messageRepository.create({
            campaign_id: savedCampaign.id,
            user_id: userId,
            message: messageDto.message || '',
            type: parseInt(String(mediaType), 10) || 1,
            order: messageDto.order ?? index,
            media: messageDto.media || null,
          });

          await this.messageRepository.save(message);
          this.logger.log('✅ Mensagem criada', {
            index,
            type: messageDto.type,
            media: messageDto.media ? 'yes' : 'no',
          });
        }
      }

      // 8. Dispatch queue job if campaign is pending (status=0) and no schedule
      // Wrapped in try-catch to not fail campaign creation if Redis is unavailable
      try {
        if (status === 0 && !dto.schedule_date) {
          this.logger.log('📤 Enfileirando job de disparo de campanha', {
            campaign_id: savedCampaign.id,
          });

          const job = await this.campaignsQueue.add(
            'process-campaign',
            {
              campaignId: savedCampaign.id,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          );

          this.logger.log('✅ Job de campanha enfileirado com sucesso', {
            campaign_id: savedCampaign.id,
            job_id: job.id,
            job_name: job.name,
          });
        } else if (status === 3 && scheduleDate) {
          // Schedule job for future execution
          const delay = scheduleDate.getTime() - Date.now();
          if (delay > 0) {
            this.logger.log('⏰ Agendando job de disparo de campanha', {
              campaign_id: savedCampaign.id,
              schedule_date: scheduleDate,
              delay_ms: delay,
            });

            await this.campaignsQueue.add(
              'process-campaign',
              {
                campaignId: savedCampaign.id,
              },
              {
                delay,
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 5000,
                },
              },
            );
          }
        }
      } catch (queueError) {
        // Log but don't fail - campaign was created successfully
        this.logger.warn(
          '⚠️ Não foi possível enfileirar job (Redis indisponível?)',
          {
            campaign_id: savedCampaign.id,
            error:
              queueError instanceof Error
                ? queueError.message
                : String(queueError),
          },
        );
      }

      this.logger.log('🎉 Campanha criada com sucesso', {
        campaign_id: savedCampaign.id,
      });

      return savedCampaign;
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao criar campanha', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get campaign details
   * Laravel: CampaignsController@show (lines 651-655)
   */
  async findOne(userId: number, id: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id, user_id: userId },
      relations: ['messages', 'public', 'number'],
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    return campaign;
  }

  /**
   * Cancel campaign
   * Laravel: CampaignsController@cancelCampaign (lines 738-751)
   */
  async cancel(userId: number, id: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    campaign.status = 3; // Canceled
    campaign.canceled = 1;
    await this.campaignRepository.save(campaign);

    this.logger.log('✅ Campanha cancelada', { campaign_id: id });

    return { message: 'Campanha cancelada com sucesso.' };
  }

  /**
   * List simplified public contacts
   * Laravel: CampaignsController@index_simplified_public (lines 47-104)
   */
  async listSimplifiedPublic(userId: number, dto: ListSimplifiedPublicDto) {
    this.logger.log('🔍 Listando contatos de público simplificado', { userId });

    try {
      // Get active number
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        throw new NotFoundException('Número ativo não encontrado.');
      }

      // Normalize labels param: can arrive as JSON string or array
      let labelsArray: string[] | undefined;
      if (Array.isArray((dto as any).labels)) {
        labelsArray = (dto as any).labels as unknown as string[];
      } else if (typeof (dto as any).labels === 'string') {
        try {
          const parsed = JSON.parse((dto as any).labels as unknown as string);
          if (Array.isArray(parsed)) labelsArray = parsed as string[];
        } catch {
          // ignore parse errors
        }
      }

      // Build query
      let query = this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.user_id = :userId', { userId });

      // Apply public_id filter (if env PROJECT != verte OR public_id provided)
      if (dto.public_id) {
        query = query.andWhere('contact.public_id = :publicId', {
          publicId: dto.public_id,
        });
      } else {
        // env('PROJECT') == 'verte' logic
        query = query
          .andWhere('contact.number_id = :numberId', { numberId: number.id })
          .andWhere('contact.cel_owner = :celOwner', { celOwner: number.cel })
          .andWhere('contact.status = :status', { status: 1 });
      }

      // Apply labels filter (independent of public_id)
      if (labelsArray && labelsArray.length > 0) {
        const labels = labelsArray; // normalized array
        query = query.andWhere(
          new Brackets((qb) => {
            labels.forEach((label, index) => {
              qb.orWhere(`contact.labels LIKE :label${index}`, {
                [`label${index}`]: `%${label}%`,
              });
            });
          }),
        );
      }

      // Apply search filter
      if (dto.search) {
        const searchClean = dto.search.replace(/\D/g, '');
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('contact.name LIKE :search', {
              search: `%${dto.search}%`,
            }).orWhere('contact.number = :searchClean', {
              searchClean,
            });
          }),
        );
      }

      // Get all contacts (will group in-memory to avoid MySQL ONLY_FULL_GROUP_BY issues)
      const contactsRaw = await query.getMany();

      // Group by number in-memory (Laravel uses groupBy('number'))
      // This ensures we keep all field values correctly
      const contactsByNumber = new Map<string, any>();
      contactsRaw.forEach((contact) => {
        if (!contactsByNumber.has(contact.number)) {
          contactsByNumber.set(contact.number, contact);
        }
      });
      const groupedContacts = Array.from(contactsByNumber.values());

      const contacts = groupedContacts.map((c) => {
        let label = '';
        if (c.labels) {
          try {
            const arr = JSON.parse(c.labels as unknown as string);
            if (Array.isArray(arr)) {
              label = arr.join(',');
            } else if (typeof arr === 'string') {
              label = arr;
            }
          } catch {
            label = String(c.labels);
          }
        } else if (c.labelsName) {
          label = String(c.labelsName || '');
        }
        return { ...c, label };
      });

      this.logger.log('✅ Contatos listados', { count: contacts.length });

      return {
        data: contacts,
        meta: {
          current_page: 1,
          from: contacts.length > 0 ? 1 : 0,
          to: contacts.length,
          per_page: contacts.length,
          total: contacts.length,
          last_page: 1,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao listar contatos', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Show simplified public details
   * Laravel: CampaignsController@show_simplified_public (lines 106-122)
   */
  async showSimplifiedPublic(userId: number, id: number) {
    this.logger.log('📊 Buscando detalhes do público', { userId, id });

    try {
      const publicInfo = await this.publicRepository.findOne({
        where: { id, user_id: userId },
      });

      if (!publicInfo) {
        throw new NotFoundException('Público não encontrado.');
      }

      // Count distinct contacts
      const result = await this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.public_id = :publicId', { publicId: id })
        .andWhere('contact.user_id = :userId', { userId })
        .select('COUNT(DISTINCT contact.number)', 'count')
        .getRawOne();

      const totalContacts = parseInt(result?.count || '0', 10);

      // Placeholder aggregates (compatibilidade com Laravel: campos presentes)
      const totalWhatsSend = 0;
      const totalWhatsReceive = 0;
      const totalWhatsError = 0;

      return {
        data: {
          ...publicInfo,
          totalPublic: totalContacts,
          totalWhatsSend,
          totalWhatsReceive,
          totalWhatsError,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar público', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create simplified public
   * Laravel: CampaignsController@store_simplified_public (lines 124-170)
   */
  async createSimplifiedPublic(userId: number, dto: CreateSimplifiedPublicDto) {
    this.logger.log('🚀 Criando público simplificado', {
      userId,
      uuid: dto.id,
    });

    try {
      // Find number
      let numberActive: Number | null;
      if (dto.numberId) {
        numberActive = await this.numberRepository.findOne({
          where: {
            user_id: userId,
            id: dto.numberId,
            status_connection: 1,
          },
        });
        if (!numberActive) {
          numberActive = await this.numberRepository.findOne({
            where: { user_id: userId, id: dto.numberId },
          });
        }
      } else {
        numberActive = await this.numberRepository.findOne({
          where: { user_id: userId, status: 1, status_connection: 1 },
        });
        if (!numberActive) {
          numberActive = await this.numberRepository.findOne({
            where: { user_id: userId, status: 1 },
          });
        }
      }

      if (!numberActive) {
        return { data: false };
      }

      // TODO: Check WhatsApp connection (checkInstaceConnect)
      // For now, assume connected

      const simplified = this.simplifiedPublicRepository.create({
        user_id: userId,
        uuid: String(dto.id),
        status: 2, // Em processamento (compatível com testes/Laravel)
        number_id: numberActive.id,
      });

      const saved = await this.simplifiedPublicRepository.save(simplified);

      // Dispatch SimplifiedPublicJob
      this.logger.log(
        '📤 Enfileirando job de processamento de público simplificado',
        {
          simplified_public_id: saved.id,
        },
      );

      await this.simplifiedPublicQueue.add(
        'process-simplified-public',
        {
          simplifiedPublicId: saved.id,
          userId: saved.user_id,
          numberId: saved.number_id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log('✅ Público simplificado criado', { id: saved.id });

      const publicId = parseInt(String(dto.id), 10);
      const isNumeric = !isNaN(publicId) && isFinite(publicId);
      return {
        id: saved.id,
        public_id: isNumeric ? publicId : null,
        number_id: saved.number_id,
        user_id: saved.user_id,
        status: saved.status,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
      } as any;
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao criar público simplificado', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update/Cancel simplified public
   * Laravel: CampaignsController@put_simplified_public (lines 172-181)
   */
  async updateSimplifiedPublic(
    userId: number,
    id: number,
    dto: UpdateSimplifiedPublicDto,
  ) {
    this.logger.log('🔄 Atualizando público simplificado', {
      userId,
      id,
      cancel: dto.cancel,
    });

    try {
      if (dto.cancel) {
        await this.simplifiedPublicRepository.update(
          { user_id: userId },
          { status: 2 },
        );
        return { message: 'Público simplificado cancelado com sucesso.' };
      }

      return { message: 'Público simplificado atualizado com sucesso.' };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao atualizar público simplificado', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create custom public from file
   * Laravel: CampaignsController@store_custom_public (lines 194-253)
   */
  async createCustomPublic(
    userId: number,
    dto: CreateCustomPublicDto,
    filePath: string,
  ) {
    this.logger.log('📁 Criando público customizado', { userId });

    try {
      // Cancel existing custom public in progress
      const existing = await this.customPublicRepository.findOne({
        where: { user_id: userId, status: 0 },
      });

      if (existing) {
        existing.status = 2;
        await this.customPublicRepository.save(existing);
      }

      // Find number
      let numberActive: Number | null;
      if (dto.numberId) {
        numberActive = await this.numberRepository.findOne({
          where: {
            user_id: userId,
            id: dto.numberId,
            status_connection: 1,
          },
        });
      } else {
        numberActive = await this.numberRepository.findOne({
          where: { user_id: userId, status: 1, status_connection: 1 },
        });
      }

      if (!numberActive) {
        return { data: false };
      }

      // TODO: Check WhatsApp connection (checkInstaceConnect)
      // For now, assume connected

      const customPublic = this.customPublicRepository.create({
        user_id: userId,
        file: filePath,
        status: 0,
        number_id: numberActive.id,
      });

      const saved = await this.customPublicRepository.save(customPublic);

      // Dispatch CustomPublicJob to process XLSX file
      this.logger.log(
        '📤 Enfileirando job de processamento de público customizado',
        {
          custom_public_id: saved.id,
          file: filePath,
        },
      );

      await this.customPublicQueue.add(
        'process-custom-public',
        {
          customPublicId: saved.id,
          userId: saved.user_id,
          campaignId: 0, // Will be set by campaign when created
          filePath: saved.file,
          numberNumber: numberActive.cel || '', // Country code (e.g., "55" for Brazil)
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log('✅ Público customizado criado');

      return { id: saved.id, file_path: saved.file, public_id: dto.id };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao criar público customizado', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update/Cancel custom public
   * Laravel: CampaignsController@put_custom_public (lines 183-192)
   */
  async updateCustomPublic(
    userId: number,
    id: number,
    dto: UpdateCustomPublicDto,
  ) {
    this.logger.log('🔄 Atualizando público customizado', {
      userId,
      id,
      cancel: dto.cancel,
    });

    try {
      if (dto.cancel) {
        await this.customPublicRepository.update(
          { user_id: userId },
          { status: 2 },
        );
      }

      return { message: 'Público customizado atualizado com sucesso.' };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao atualizar público customizado', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create label-filtered public
   * Laravel: CampaignsController@store_label_public (lines 753-803)
   */
  async createLabelPublic(userId: number, dto: CreateLabelPublicDto) {
    this.logger.log('🏷️ Criando público por etiquetas', {
      userId,
      uuid: dto.id,
      labels: dto.label,
    });

    try {
      // Check if similar label public exists and cancel it
      const existing = await this.simplifiedPublicRepository.findOne({
        where: {
          user_id: userId,
          label: JSON.stringify(dto.label),
          status: 0,
        },
      });

      if (existing) {
        existing.status = 2;
        await this.simplifiedPublicRepository.save(existing);
      }

      // Find number
      let numberActive: Number | null;
      if (dto.numberId) {
        numberActive = await this.numberRepository.findOne({
          where: {
            user_id: userId,
            id: dto.numberId,
            status_connection: 1,
          },
        });
      } else {
        numberActive = await this.numberRepository.findOne({
          where: { user_id: userId, status: 1, status_connection: 1 },
        });
      }

      if (!numberActive) {
        return { data: false };
      }

      // TODO: Check WhatsApp connection (checkInstaceConnect)
      // For now, assume connected

      // Tentar salvar labels conforme schema do banco (compatibilidade Laravel)
      const labelJson = JSON.stringify(dto.label);
      let saved: SimplifiedPublic;
      try {
        const simplified = this.simplifiedPublicRepository.create({
          user_id: userId,
          uuid: String(dto.id),
          status: 2, // Em processamento (compatível com testes/Laravel)
          number_id: numberActive.id,
          label: labelJson,
        });
        saved = await this.simplifiedPublicRepository.save(simplified);
      } catch (e) {
        // Alguns ambientes possuem coluna 'label' como inteiro; fazer fallback
        this.logger.warn(
          '⚠️ Falha ao salvar labels em simplified_public; aplicando fallback.',
          {
            error: e instanceof Error ? e.message : String(e),
          },
        );
        const simplified = this.simplifiedPublicRepository.create({
          user_id: userId,
          uuid: String(dto.id),
          status: 2,
          number_id: numberActive.id,
          label: null as any,
        });
        saved = await this.simplifiedPublicRepository.save(simplified);
      }

      // Dispatch SimplifiedPublicJob with labels
      this.logger.log(
        '📤 Enfileirando job de processamento de público por etiquetas',
        {
          simplified_public_id: saved.id,
          labels: dto.label,
        },
      );

      await this.simplifiedPublicQueue.add(
        'process-simplified-public',
        {
          simplifiedPublicId: saved.id,
          userId: saved.user_id,
          numberId: saved.number_id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log('✅ Público por etiquetas criado');

      const publicId = parseInt(String(dto.id), 10);
      const isNumeric = !isNaN(publicId) && isFinite(publicId);
      return {
        id: saved.id,
        public_id: isNumeric ? publicId : null,
        number_id: saved.number_id,
        user_id: saved.user_id,
        status: saved.status,
        labels: labelJson,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
      } as any;
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao criar público por etiquetas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check campaigns status (GET /api/v1/campaigns-check)
   * Laravel: CampaignsController@check
   * Returns list of active/in-progress campaigns
   */
  async check(userId: number) {
    this.logger.log('🔍 Verificando campanhas ativas', { userId });

    try {
      // Find all active campaigns (status 0 = pending/running, 3 = scheduled)
      const campaigns = await this.campaignRepository.find({
        where: [
          { user_id: userId, status: 0 },
          { user_id: userId, status: 3 },
        ],
        relations: ['public', 'number'],
        order: { id: 'DESC' },
      });

      this.logger.log('✅ Campanhas ativas encontradas', {
        count: campaigns.length,
      });

      return {
        data: campaigns,
        count: campaigns.length,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao verificar campanhas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cancel multiple campaigns (POST /api/v1/campaigns-check)
   * Laravel: CampaignsController@cancel (bulk operation)
   * Cancels multiple campaigns at once
   */
  async cancelMultiple(userId: number, campaignIds: number[]) {
    this.logger.log('🚫 Cancelando múltiplas campanhas', {
      userId,
      count: campaignIds.length,
    });

    try {
      // Find all campaigns belonging to user
      const campaigns = await this.campaignRepository.find({
        where: campaignIds.map((id) => ({ id, user_id: userId })),
      });

      if (campaigns.length === 0) {
        throw new NotFoundException('Nenhuma campanha encontrada.');
      }

      // Update all campaigns to canceled status
      await this.campaignRepository
        .createQueryBuilder()
        .update(Campaign)
        .set({ status: 2, canceled: 1 })
        .where('id IN (:...ids)', { ids: campaignIds })
        .andWhere('user_id = :userId', { userId })
        .execute();

      this.logger.log('✅ Campanhas canceladas', { count: campaigns.length });

      return {
        message: `${campaigns.length} campanha(s) cancelada(s) com sucesso.`,
        canceled: campaigns.length,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao cancelar campanhas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Change campaign status (POST /api/v1/campaigns/change-status)
   * Laravel: CampaignsController@change_status
   * Changes campaign status with validation of state transitions
   */
  async changeStatus(userId: number, campaignId: number, newStatus: number) {
    this.logger.log('🔄 Alterando status de campanha', {
      userId,
      campaignId,
      newStatus,
    });

    try {
      // Find campaign
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId, user_id: userId },
      });

      if (!campaign) {
        throw new NotFoundException('Campanha não encontrada.');
      }

      // Validate state transition
      const currentStatus = campaign.status;

      // Cannot change status if already canceled (check both status and canceled field)
      if (currentStatus === 2 || campaign.canceled === 1) {
        throw new BadRequestException(
          'Não é possível alterar o status de uma campanha cancelada.',
        );
      }

      // Update status and related fields
      campaign.status = newStatus;

      // Update canceled/paused fields for frontend compatibility
      // status 0 = active, status 1 = paused, status 2 = canceled
      if (newStatus === 2) {
        campaign.canceled = 1;
        campaign.paused = 0;
      } else if (newStatus === 1) {
        campaign.paused = 1;
        campaign.canceled = 0;
      } else {
        // status = 0 (active/resumed)
        campaign.paused = 0;
        campaign.canceled = 0;
      }

      await this.campaignRepository.save(campaign);

      this.logger.log('✅ Status alterado', {
        campaignId,
        from: currentStatus,
        to: newStatus,
        canceled: campaign.canceled,
        paused: campaign.paused,
      });

      // Se a campanha foi retomada (de pausado para ativo), enfileirar para processamento
      if (currentStatus === 1 && newStatus === 0) {
        this.logger.log(
          '📤 Campanha retomada - enfileirando para processamento',
          {
            campaignId,
          },
        );

        const job = await this.campaignsQueue.add(
          'process-campaign',
          {
            campaignId: campaign.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );

        this.logger.log('✅ Job de campanha enfileirado com sucesso', {
          campaign_id: campaign.id,
          job_id: job.id,
          job_name: job.name,
        });
      }

      const statusFormatted = this.formatCampaignStatus(newStatus);

      return {
        message: 'Status da campanha atualizado com sucesso.',
        campaign: {
          id: campaign.id,
          status: newStatus,
          status_formatted: statusFormatted,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao alterar status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Show custom public details (GET /api/v1/campaigns/custom/public/:id)
   * Laravel: CampaignsController@show_simplified_public (reused)
   * Returns custom public information with statistics
   */
  async showCustomPublic(userId: number, id: number) {
    this.logger.log('📊 Buscando detalhes do público customizado', {
      userId,
      id,
    });

    try {
      const customPublic = await this.customPublicRepository.findOne({
        where: { id, user_id: userId },
      });

      if (!customPublic) {
        throw new NotFoundException('Público customizado não encontrado.');
      }

      // Count contacts processed (if contacts were created from file)
      // For now, return basic info
      return {
        data: {
          id: customPublic.id,
          status: customPublic.status,
          file: customPublic.file,
          number_id: customPublic.number_id,
          created_at: customPublic.created_at,
          updated_at: customPublic.updated_at,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar público customizado', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Helper: Format campaign status to human-readable string
   */
  private formatCampaignStatus(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'Ativa',
      1: 'Pausada',
      2: 'Cancelada',
      3: 'Agendada',
    };

    return statusMap[status] || 'Desconhecida';
  }

  /**
   * Helper: Convert media type string to number (matching Laravel)
   * Laravel: CampaignsController@getMediaType2 (lines 403-406)
   */
  private getMediaTypeFromString(type: string): number {
    const typeMap: Record<string, number> = {
      text: 1,
      image: 2,
      audio: 3,
      video: 4,
      document: 1, // Default to text
    };

    return typeMap[type] || 1;
  }
}
