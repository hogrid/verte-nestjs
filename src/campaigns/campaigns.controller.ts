import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { ListSimplifiedPublicDto } from './dto/list-simplified-public.dto';
import { CreateSimplifiedPublicDto } from './dto/create-simplified-public.dto';
import { UpdateSimplifiedPublicDto } from './dto/update-simplified-public.dto';
import { CreateCustomPublicDto } from './dto/create-custom-public.dto';
import { UpdateCustomPublicDto } from './dto/update-custom-public.dto';
import { CreateLabelPublicDto } from './dto/create-label-public.dto';
import { CancelMultipleCampaignsDto } from './dto/cancel-multiple-campaigns.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

/**
 * Parse FormData nested fields into object
 * Converts flat keys like 'messages[0][text]' to nested objects
 */
function parseFormDataFields(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    // Parse nested keys like 'messages[0][text]' or 'tags[0]'
    const parts = key.match(/([^[\]]+)/g);
    if (!parts) continue;

    let current: any = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextArray = /^\d+$/.test(nextPart);

      if (!(part in current)) {
        current[part] = isNextArray ? [] : {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  return result;
}

/**
 * CampaignsController
 * Handles campaign endpoints (FASE 1: CRUD básico)
 * Maintains 100% compatibility with Laravel CampaignsController
 */
@ApiTags('Campaigns')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * GET /api/v1/campaigns
   * List campaigns with filters and pagination
   * Laravel: CampaignsController@index
   */
  @Get('campaigns')
  @ApiOperation({
    summary: 'Listar campanhas',
    description: `
Lista todas as campanhas do usuário com filtros e paginação.

**Campos Aceitos (query params)**:
- numberId (opcional): ID do número WhatsApp (se não informado, usa o número ativo)
- search (opcional): Termo de busca no nome da campanha
- filterFields (opcional): Filtros avançados em formato JSON
  - Formato: [{"field":"status","value":"0"},{"field":"type","value":"1"}]
  - Campos aceitos: status, id, type
- order (opcional): Ordenação (asc ou desc) - default: desc
- per_page (opcional): Itens por página - default: 10
- page (opcional): Número da página - default: 1

**Response**:
- data: Array de campanhas com relationships (public, messages, number)
- meta: Metadados de paginação (current_page, from, to, per_page, total, last_page)

**Compatibilidade**: 100% Laravel CampaignsController@index
    `,
  })
  @ApiQuery({
    name: 'numberId',
    required: false,
    type: Number,
    description: 'ID do número WhatsApp',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiQuery({
    name: 'filterFields',
    required: false,
    type: String,
    description: 'Filtros em JSON',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Ordenação',
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    type: Number,
    description: 'Itens por página',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página',
  })
  @ApiResponse({
    status: 200,
    description: 'Campanhas listadas com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Black Friday 2024',
            number_id: 1,
            public_id: 1,
            user_id: 1,
            type: 1,
            status: 0,
            total_contacts: 150,
            total_sent: 0,
            total_delivered: 0,
            total_read: 0,
            progress: 0,
            schedule_date: null,
            date_end: '2024-12-10T00:00:00.000Z',
            created_at: '2024-11-04T00:00:00.000Z',
            updated_at: '2024-11-04T00:00:00.000Z',
            public: {
              id: 1,
              name: 'VIP Customers',
              user_id: 1,
            },
            messages: [
              {
                id: 1,
                campaign_id: 1,
                message: 'Olá {nome}! Promoção exclusiva!',
                type: 1,
                order: 0,
              },
            ],
            number: {
              id: 1,
              name: 'WhatsApp Principal',
              cel: '5511999999999',
            },
          },
        ],
        meta: {
          current_page: 1,
          from: 1,
          to: 10,
          per_page: 10,
          total: 25,
          last_page: 3,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número WhatsApp não encontrado' })
  async findAll(@Query() dto: ListCampaignsDto, @Request() req: any) {
    return this.campaignsService.findAll(req.user.id, dto);
  }

  /**
   * POST /api/v1/campaigns
   * Create a new campaign
   * Laravel: CampaignsController@store
   */
  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar campanha',
    description: `
Cria uma nova campanha de WhatsApp.

**Campos Aceitos**:
- name (obrigatório): Nome da campanha
- number_id (obrigatório): ID do número WhatsApp
- public_id (obrigatório): ID do público-alvo OU "new" para todos os contatos
- messages (obrigatório): Array de mensagens (mínimo 1)
  - Cada mensagem deve ter: message (texto), type (text/image/video/audio/document)
- schedule_date (opcional): Data de agendamento (formato ISO 8601)
- labels (opcional): Labels para filtrar contatos (formato JSON ou array)

**Campos Setados Automaticamente (NÃO enviar)**:
- user_id: Pego do usuário autenticado
- status: 0 (pendente) ou 3 (agendada, se schedule_date informado)
- total_contacts: Calculado automaticamente pela query de contatos
- date_end: Calculado com base no plano do usuário (days_recurrency)
- type: 1 (Simplificada)
- created_at, updated_at: Timestamps automáticos

**Regras de Negócio**:
- Se public_id = "new": cria/usa público padrão "Todos os contatos"
- Se labels informado: filtra contatos por labels
- Se schedule_date informado: status = 3 (agendada), converte timezone America/Sao_Paulo -> UTC
- Se status = 0 e sem schedule_date: dispara job de campanha (FASE 5)
- Valida se há contatos suficientes (>0)

**Compatibilidade**: 100% Laravel CampaignsController@store
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Campanha criada com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          name: 'Black Friday 2024',
          number_id: 1,
          public_id: 1,
          user_id: 1,
          type: 1,
          status: 0,
          total_contacts: 150,
          date_end: '2024-12-10T00:00:00.000Z',
          schedule_date: null,
          labels: null,
          created_at: '2024-11-04T00:00:00.000Z',
          updated_at: '2024-11-04T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Sem contatos suficientes para efetuar o disparo',
  })
  @ApiResponse({
    status: 404,
    description: 'Número WhatsApp não encontrado',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        errors: {
          name: ['O campo nome é obrigatório.'],
          messages: ['Pelo menos uma mensagem é obrigatória.'],
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './uploads/campaigns',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `campaign-media-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Request() req: any,
  ) {
    try {
      this.logger.log('📥 Recebendo criação de campanha', {
        bodyKeys: Object.keys(body || {}),
        bodyRaw: JSON.stringify(body).substring(0, 500),
        filesCount: files?.length || 0,
        contentType: req.headers['content-type'],
      });

      // Parse FormData nested fields if multipart
      let createCampaignDto: CreateCampaignDto;
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        const parsed = parseFormDataFields(body);
        this.logger.log('📝 Campos parseados do FormData', {
          name: parsed.name,
          number_id: parsed.number_id,
          public_id: parsed.public_id,
          type: parsed.type,
          messagesRaw: JSON.stringify(parsed.messages).substring(0, 500),
          messagesCount: Array.isArray(parsed.messages)
            ? parsed.messages.length
            : 0,
        });

        // Map frontend field names to backend DTO
        // Note: Keep public_id as string if it's 'new', otherwise parse as number
        const publicIdValue = parsed.public_id;
        let publicId: number | string | undefined;
        if (publicIdValue === 'new' || publicIdValue === undefined) {
          publicId = publicIdValue;
        } else {
          publicId = parseInt(String(publicIdValue), 10);
        }

        createCampaignDto = {
          name: parsed.name,
          number_id: parseInt(String(parsed.number_id), 10),
          type: parsed.type ? parseInt(String(parsed.type), 10) : 1,
          public_id: publicId as any, // Can be number or 'new'
          schedule_date: parsed.date_schedule || parsed.schedule_date,
          labels: parsed.tags || parsed.labels,
          messages: [],
        };

        // Process messages
        if (Array.isArray(parsed.messages)) {
          createCampaignDto.messages = parsed.messages.map(
            (msg: any, index: number) => {
              const message: any = {
                message: msg.text || msg.message || '',
                order: index,
                type: 'text', // Default type
              };

              // Check if there's an uploaded file for this message
              const fileFieldName = `messages[${index}][media]`;
              const file = files?.find((f) => f.fieldname === fileFieldName);

              if (file) {
                message.media = file.path;
                // Determine media type from mime
                if (file.mimetype.startsWith('image/')) {
                  message.type = 'image';
                  message.media_type = 2;
                } else if (file.mimetype.startsWith('audio/')) {
                  message.type = 'audio';
                  message.media_type = 3;
                } else if (file.mimetype.startsWith('video/')) {
                  message.type = 'video';
                  message.media_type = 4;
                } else {
                  message.type = 'document';
                  message.media_type = 1;
                }
              }

              return message;
            },
          );
        }

        this.logger.log('✅ DTO construído', {
          name: createCampaignDto.name,
          number_id: createCampaignDto.number_id,
          public_id: createCampaignDto.public_id,
          messagesCount: createCampaignDto.messages?.length,
          messages: JSON.stringify(createCampaignDto.messages).substring(
            0,
            500,
          ),
        });
      } else {
        // JSON body - use directly
        createCampaignDto = body as CreateCampaignDto;
      }

      // Validate required fields
      if (!createCampaignDto.name) {
        throw new BadRequestException('O campo name é obrigatório.');
      }
      if (!createCampaignDto.number_id || isNaN(createCampaignDto.number_id)) {
        throw new BadRequestException(
          'O campo number_id é obrigatório e deve ser um número.',
        );
      }

      this.logger.log('🚀 Chamando service.create', {
        userId: req.user.id,
        dto: JSON.stringify(createCampaignDto).substring(0, 500),
      });

      const campaign = await this.campaignsService.create(
        req.user.id,
        createCampaignDto,
      );
      return { data: campaign };
    } catch (error) {
      this.logger.error('❌ Erro ao criar campanha', {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/campaigns/:id
   * Get campaign details
   * Laravel: CampaignsController@show
   */
  @Get('campaigns/:id')
  @HttpCode(HttpStatus.CREATED) // Laravel returns 201
  @ApiOperation({
    summary: 'Detalhes da campanha',
    description: `
Retorna os detalhes de uma campanha específica.

**Retorna**:
- Campanha completa com relationships: messages, public, number

**Compatibilidade**: 100% Laravel CampaignsController@show
    `,
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: Number })
  @ApiResponse({
    status: 201,
    description: 'Detalhes da campanha',
    schema: {
      example: {
        data: {
          id: 1,
          name: 'Black Friday 2024',
          number_id: 1,
          public_id: 1,
          user_id: 1,
          type: 1,
          status: 0,
          total_contacts: 150,
          messages: [
            {
              id: 1,
              campaign_id: 1,
              message: 'Olá {nome}!',
              type: 1,
              order: 0,
            },
          ],
          public: {
            id: 1,
            name: 'VIP Customers',
          },
          number: {
            id: 1,
            name: 'WhatsApp Principal',
            cel: '5511999999999',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const campaign = await this.campaignsService.findOne(req.user.id, id);
    return { data: campaign };
  }

  /**
   * POST /api/v1/campaigns/:id/cancel
   * Cancel campaign
   * Laravel: CampaignsController@cancelCampaign
   */
  @Post('campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK) // Laravel returns 200
  @ApiOperation({
    summary: 'Cancelar campanha',
    description: `
Cancela uma campanha em andamento ou agendada.

**Ação**:
- Define status = 3 (cancelada)
- Define canceled = 1

**Compatibilidade**: 100% Laravel CampaignsController@cancelCampaign
    `,
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Campanha cancelada com sucesso',
    schema: {
      example: {
        message: 'Campanha cancelada com sucesso.',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada.' })
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.campaignsService.cancel(req.user.id, id);
  }

  /**
   * GET /api/v1/campaigns/simplified/public
   * List simplified public contacts
   * Laravel: CampaignsController@index_simplified_public
   */
  @Get('campaigns/simplified/public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar contatos de público simplificado',
    description: `
Lista contatos de um público simplificado com filtros.

**Campos Aceitos (query params)**:
- public_id (obrigatório): ID do público simplificado
- labels (opcional): Array de labels para filtrar (ex: ["PROJECT=verte","STATUS=ativo"])
- search (opcional): Termo de busca (nome ou número do contato)

**Response**:
- data: Array de contatos do público
  - Cada contato inclui: id, name, number, label (do relacionamento public_by_contact)

**Compatibilidade**: 100% Laravel CampaignsController@index_simplified_public
    `,
  })
  @ApiQuery({
    name: 'public_id',
    required: true,
    type: Number,
    description: 'ID do público simplificado',
  })
  @ApiQuery({
    name: 'labels',
    required: false,
    type: String,
    description: 'Labels para filtrar (array JSON)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiResponse({
    status: 200,
    description: 'Contatos listados com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'João Silva',
            number: '5511999999999',
            label: 'PROJECT=verte,STATUS=ativo',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async listSimplifiedPublic(
    @Request() req: any,
    @Query() dto: ListSimplifiedPublicDto,
  ) {
    const result = await this.campaignsService.listSimplifiedPublic(
      req.user.id,
      dto,
    );
    return { data: (result as any).data };
  }

  /**
   * GET /api/v1/campaigns/simplified/public/:id
   * Show simplified public details
   * Laravel: CampaignsController@show_simplified_public
   */
  @Get('campaigns/simplified/public/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mostrar público simplificado',
    description: `
Retorna informações de um público simplificado específico.

**Response**:
- data: Objeto com informações do público
  - totalPublic: Total de contatos
  - totalWhatsSend: Total de mensagens enviadas
  - totalWhatsReceive: Total de mensagens recebidas
  - totalWhatsError: Total de erros

**Compatibilidade**: 100% Laravel CampaignsController@show_simplified_public
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID do público simplificado',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Público encontrado',
    schema: {
      example: {
        data: {
          totalPublic: 150,
          totalWhatsSend: 120,
          totalWhatsReceive: 80,
          totalWhatsError: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async showSimplifiedPublic(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.campaignsService.showSimplifiedPublic(
      req.user.id,
      id,
    );
    return result;
  }

  /**
   * POST /api/v1/campaigns/simplified/public
   * Create simplified public
   * Laravel: CampaignsController@store_simplified_public
   */
  @Post('campaigns/simplified/public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar público simplificado',
    description: `
Cria um novo público simplificado.

**Campos Aceitos**:
- id (obrigatório): ID do público (relacionamento com tabela publics)
- numberId (opcional): ID do número WhatsApp (se não informado, usa número ativo)

**Campos Setados Automaticamente**:
- user_id: Pego do usuário autenticado
- status: 2 (processando)
- created_at, updated_at: Timestamps automáticos

**Regras de Negócio**:
- Valida se o número WhatsApp está ativo/conectado
- Cria registros em simplified_publics para processar assíncrono (FASE 5)
- Aguarda implementação do SimplifiedPublicJob (FASE 5)

**Compatibilidade**: 100% Laravel CampaignsController@store_simplified_public
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Público simplificado criado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          public_id: 1,
          number_id: 1,
          user_id: 1,
          status: 2,
          created_at: '2024-11-04T00:00:00.000Z',
          updated_at: '2024-11-04T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Número WhatsApp não encontrado',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
  })
  async createSimplifiedPublic(
    @Request() req: any,
    @Body() dto: CreateSimplifiedPublicDto,
  ) {
    const result = await this.campaignsService.createSimplifiedPublic(
      req.user.id,
      dto,
    );
    return { data: result };
  }

  /**
   * PUT /api/v1/campaigns/simplified/public/:id
   * Update/cancel simplified public
   * Laravel: CampaignsController@put_simplified_public
   */
  @Put('campaigns/simplified/public/:id')
  @HttpCode(HttpStatus.CREATED) // Laravel returns 201 in PUT
  @ApiOperation({
    summary: 'Atualizar/cancelar público simplificado',
    description: `
Cancela públicos simplificados em andamento (status 2).

**Campos Aceitos**:
- cancel (opcional): Se true, cancela o público

**Ação**:
- Define status = 1 (cancelado) para todos os públicos em processamento

**Compatibilidade**: 100% Laravel CampaignsController@put_simplified_public
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID do público simplificado',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: 'Público simplificado atualizado',
    schema: {
      example: {
        message: 'Público simplificado cancelado com sucesso.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async updateSimplifiedPublic(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSimplifiedPublicDto,
  ) {
    const result = await this.campaignsService.updateSimplifiedPublic(
      req.user.id,
      id,
      dto,
    );
    return result;
  }

  /**
   * POST /api/v1/campaigns/custom/public
   * Create custom public from XLSX
   * Laravel: CampaignsController@store_custom_public
   */
  @Post('campaigns/custom/public')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/custom_publics',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `custom-public-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel'
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Apenas arquivos .xlsx são permitidos.'),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Criar público customizado',
    description: `
Cria um público customizado a partir de arquivo XLSX.

**Campos Aceitos**:
- file (obrigatório): Arquivo XLSX com contatos (máx 20MB)
- id (obrigatório): ID do público (relacionamento com tabela publics)
- numberId (opcional): ID do número WhatsApp (se não informado, usa número ativo)

**Formato do arquivo XLSX**:
- Colunas esperadas: name, number (outras colunas ignoradas)
- Números no formato brasileiro ou internacional

**Campos Setados Automaticamente**:
- user_id: Pego do usuário autenticado
- status: 2 (processando)
- file_path: Caminho do arquivo salvo
- created_at, updated_at: Timestamps automáticos

**Regras de Negócio**:
- Valida se o número WhatsApp está ativo/conectado
- Salva arquivo em uploads/custom_publics/
- Cria registros em custom_publics para processar assíncrono (FASE 5)
- Aguarda implementação do CustomPublicJob (FASE 5)

**Compatibilidade**: 100% Laravel CampaignsController@store_custom_public
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo XLSX com contatos',
        },
        id: {
          type: 'number',
          description: 'ID do público',
        },
        numberId: {
          type: 'number',
          description: 'ID do número WhatsApp (opcional)',
        },
      },
      required: ['file', 'id'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Público customizado criado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          public_id: 1,
          number_id: 1,
          user_id: 1,
          status: 2,
          file_path:
            'uploads/custom_publics/custom-public-1699999999999-123456789.xlsx',
          created_at: '2024-11-04T00:00:00.000Z',
          updated_at: '2024-11-04T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo não fornecido ou formato inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Número WhatsApp não encontrado',
  })
  async createCustomPublic(
    @Request() req: any,
    @Body() dto: CreateCustomPublicDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('O arquivo é obrigatório.');
    }
    const result = await this.campaignsService.createCustomPublic(
      req.user.id,
      dto,
      file.path,
    );
    return { data: result };
  }

  /**
   * GET /api/v1/campaigns/custom/public
   * List custom public contacts
   * Laravel: CampaignsController@index_simplified_public (reused)
   */
  @Get('campaigns/custom/public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar contatos de público customizado',
    description: `
Lista contatos de um público customizado (reusa lógica de público simplificado).

**Campos Aceitos (query params)**:
- public_id (obrigatório): ID do público customizado
- labels (opcional): Array de labels para filtrar
- search (opcional): Termo de busca (nome ou número do contato)

**Response**:
- data: Array de contatos do público

**Compatibilidade**: 100% Laravel CampaignsController@index_simplified_public
    `,
  })
  @ApiQuery({
    name: 'public_id',
    required: true,
    type: Number,
    description: 'ID do público customizado',
  })
  @ApiQuery({
    name: 'labels',
    required: false,
    type: String,
    description: 'Labels para filtrar (array JSON)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiResponse({
    status: 200,
    description: 'Contatos listados com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async listCustomPublic(
    @Request() req: any,
    @Query() dto: ListSimplifiedPublicDto,
  ) {
    const result = await this.campaignsService.listSimplifiedPublic(
      req.user.id,
      dto,
    );
    return { data: (result as any).data };
  }

  /**
   * PUT /api/v1/campaigns/custom/public/:id
   * Update/cancel custom public
   * Laravel: CampaignsController@put_custom_public
   */
  @Put('campaigns/custom/public/:id')
  @HttpCode(HttpStatus.CREATED) // Laravel returns 201 in PUT
  @ApiOperation({
    summary: 'Atualizar/cancelar público customizado',
    description: `
Cancela públicos customizados em andamento (status 2).

**Campos Aceitos**:
- cancel (opcional): Se true, cancela o público

**Ação**:
- Define status = 1 (cancelado) para todos os públicos em processamento

**Compatibilidade**: 100% Laravel CampaignsController@put_custom_public
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID do público customizado',
    type: Number,
  })
  @ApiResponse({
    status: 201,
    description: 'Público customizado atualizado',
    schema: {
      example: {
        message: 'Público customizado cancelado com sucesso.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async updateCustomPublic(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomPublicDto,
  ) {
    const result = await this.campaignsService.updateCustomPublic(
      req.user.id,
      id,
      dto,
    );
    return result;
  }

  /**
   * POST /api/v1/campaigns/label/public
   * Create label-filtered public
   * Laravel: CampaignsController@store_label_public
   */
  @Post('campaigns/label/public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar público filtrado por etiquetas',
    description: `
Cria um público filtrado por etiquetas específicas.

**Campos Aceitos**:
- id (obrigatório): ID do público (relacionamento com tabela publics)
- label (obrigatório): Array de labels para filtrar (ex: ["PROJECT=verte","STATUS=ativo"])
- numberId (opcional): ID do número WhatsApp (se não informado, usa número ativo)

**Campos Setados Automaticamente**:
- user_id: Pego do usuário autenticado
- status: 2 (processando)
- labels: Converte array em string JSON
- created_at, updated_at: Timestamps automáticos

**Regras de Negócio**:
- Valida se o número WhatsApp está ativo/conectado
- Filtra contatos que possuem as labels especificadas
- Cria registros em simplified_publics para processar assíncrono (FASE 5)
- Aguarda implementação do SimplifiedPublicJob (FASE 5)

**Compatibilidade**: 100% Laravel CampaignsController@store_label_public
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Público filtrado criado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          public_id: 1,
          number_id: 1,
          user_id: 1,
          status: 2,
          labels: '["PROJECT=verte","STATUS=ativo"]',
          created_at: '2024-11-04T00:00:00.000Z',
          updated_at: '2024-11-04T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Número WhatsApp não encontrado',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
  })
  async createLabelPublic(
    @Request() req: any,
    @Body() dto: CreateLabelPublicDto,
  ) {
    const result = await this.campaignsService.createLabelPublic(
      req.user.id,
      dto,
    );
    return { data: result };
  }

  /**
   * GET /api/v1/campaigns-check
   * Check active campaigns status
   * Laravel: CampaignsController@check
   */
  @Get('campaigns-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar campanhas ativas',
    description: `
Retorna lista de campanhas ativas/em execução do usuário.

**Filtra por status**:
- Status 0: Campanhas pendentes ou em execução
- Status 3: Campanhas agendadas

**Response**:
- data: Array de campanhas ativas com relationships (public, number)
- count: Total de campanhas ativas

**Compatibilidade**: 100% Laravel CampaignsController@check
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Campanhas ativas listadas',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Black Friday 2024',
            status: 0,
            total_contacts: 150,
            total_sent: 45,
            progress: 30,
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async checkActiveCampaigns(@Request() req: any) {
    return this.campaignsService.check(req.user.id);
  }

  /**
   * POST /api/v1/campaigns-check
   * Cancel multiple campaigns
   * Laravel: CampaignsController@cancel (bulk operation)
   */
  @Post('campaigns-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar múltiplas campanhas',
    description: `
Cancela múltiplas campanhas de uma vez.

**Campos Aceitos**:
- campaign_ids (obrigatório): Array de IDs das campanhas a cancelar

**Ação**:
- Define status = 2 (cancelada) para todas as campanhas
- Define canceled = 1 para todas as campanhas

**Compatibilidade**: 100% Laravel CampaignsController@cancel (bulk)
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        campaign_ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array de IDs das campanhas',
          example: [1, 2, 3],
        },
      },
      required: ['campaign_ids'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Campanhas canceladas com sucesso',
    schema: {
      example: {
        message: '3 campanha(s) cancelada(s) com sucesso.',
        canceled: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Nenhuma campanha encontrada' })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
  })
  async cancelMultipleCampaigns(
    @Request() req: any,
    @Body() dto: CancelMultipleCampaignsDto,
  ) {
    return this.campaignsService.cancelMultiple(req.user.id, dto.campaign_ids);
  }

  /**
   * POST /api/v1/campaigns/change-status
   * Change campaign status
   * Laravel: CampaignsController@change_status
   */
  @Post('campaigns/change-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alterar status de campanha',
    description: `
Altera o status de uma campanha específica.

**Campos Aceitos**:
- campaign_id (obrigatório): ID da campanha
- status (obrigatório): Novo status (0=ativa, 1=pausada, 2=cancelada)

**Regras de Transição de Status**:
- Pausada (1) → Ativa (0): ✅ Permitido
- Ativa (0) → Pausada (1): ✅ Permitido
- Qualquer → Cancelada (2): ✅ Permitido (irreversível)
- Cancelada (2) → Qualquer: ❌ NÃO permitido

**Compatibilidade**: 100% Laravel CampaignsController@change_status
    `,
  })
  @ApiBody({
    type: ChangeStatusDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    schema: {
      example: {
        message: 'Status da campanha atualizado com sucesso.',
        campaign: {
          id: 1,
          status: 1,
          status_formatted: 'Pausada',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
  })
  async changeStatus(@Request() req: any, @Body() dto: ChangeStatusDto) {
    // Accept both campaign_id and id (frontend sends 'id')
    const campaignId = dto.campaign_id || dto.id;
    return this.campaignsService.changeStatus(
      req.user.id,
      campaignId,
      dto.status,
    );
  }

  /**
   * GET /api/v1/campaigns/custom/public/:id
   * Show custom public details
   * Laravel: CampaignsController@show_simplified_public (reused)
   */
  @Get('campaigns/custom/public/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mostrar público customizado',
    description: `
Retorna informações de um público customizado específico.

**Response**:
- data: Objeto com informações do público customizado
  - id: ID do público
  - status: Status do processamento
  - file: Caminho do arquivo XLSX
  - number_id: ID do número WhatsApp usado

**Compatibilidade**: 100% Laravel CampaignsController@show_simplified_public (reused)
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID do público customizado',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Público encontrado',
    schema: {
      example: {
        data: {
          id: 1,
          status: 0,
          file: 'uploads/custom_publics/custom-public-1699999999999-123456789.xlsx',
          number_id: 1,
          created_at: '2024-11-04T00:00:00.000Z',
          updated_at: '2024-11-04T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async showCustomPublicDetail(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.campaignsService.showCustomPublic(req.user.id, id);
  }
}
