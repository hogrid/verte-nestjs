import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactsStatusDto } from './dto/update-contacts-status.dto';
import { BlockContactsDto } from './dto/block-contacts.dto';
import { UnblockContactsDto } from './dto/unblock-contacts.dto';
import { SearchContactsDto } from './dto/search-contacts.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { TestImportDto } from './dto/test-import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Contacts Controller
 * Handles contact management endpoints
 * Compatible with Laravel ContactsController
 */
@ApiTags('Contacts')
@Controller('api/v1/contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * GET /api/v1/contacts
   * List contacts with filters
   * Compatible with Laravel: ContactsController::index()
   */
  @Get()
  @ApiOperation({
    summary: 'Listar contatos',
    description:
      'Retorna lista de contatos do usuário autenticado com filtros opcionais.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\n\n' +
      '**Funcionalidades:**\n' +
      '- Usuário visualiza apenas seus próprios contatos\n' +
      '- Filtrado por número WhatsApp ativo do usuário\n' +
      '- Filtrado por cel_owner (número normalizado do proprietário)\n' +
      '- Filtra automaticamente contatos soft-deleted\n' +
      '- Suporta filtros: status, tag, search\n' +
      '- Status: 1=Ativo, 2=Bloqueado, 3=Inativo\n' +
      '- Agrupado por número de telefone (evita duplicatas)\n' +
      '- Ordenado por ID (DESC)\n\n' +
      '**Filtros disponíveis:**\n' +
      '- `search`: Busca em nome e número (LIKE)\n' +
      '- `status`: Filtro por status (pode ser array: ?status=1&status=2)\n' +
      '- `tag`: Busca em labelsName (LIKE)\n\n' +
      '**Estrutura do response:**\n' +
      '- `data`: Array com contatos do usuário',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome ou número do contato',
    example: 'João',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar por status (1=Ativo, 2=Bloqueado, 3=Inativo). Pode ser array',
    example: '1',
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    description: 'Filtrar por tag/label',
    example: 'vip',
  })
  @ApiResponse({
    status: 200,
    description: 'Contatos retornados com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            public_id: null,
            number_id: 1,
            name: 'João Silva',
            number: '5511987654321',
            cel_owner: '5511999999999',
            description: 'Cliente importante',
            variable_1: 'valor1',
            variable_2: 'valor2',
            variable_3: 'valor3',
            type: 1,
            status: 1,
            labels: '["vip", "cliente"]',
            labelsName: 'vip, cliente',
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
            deleted_at: null,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum número WhatsApp ativo encontrado para este usuário.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async findAll(@Query() filters: ListContactsDto, @Request() req: any) {
    return this.contactsService.findAll(req.user.id, filters);
  }

  /**
   * GET /api/v1/contacts/indicators
   * Get contact indicators/counters
   * Compatible with Laravel: ContactsController::indicators()
   */
  @Get('indicators')
  @ApiOperation({
    summary: 'Obter indicadores de contatos',
    description:
      'Retorna contadores/métricas dos contatos do usuário autenticado.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\n\n' +
      '**Funcionalidades:**\n' +
      '- Conta contatos únicos por número de telefone (DISTINCT)\n' +
      '- Filtrado por número WhatsApp ativo do usuário\n' +
      '- Filtrado por cel_owner (número normalizado)\n' +
      '- Status: 1=Ativo, 2=Bloqueado, 3=Inativo\n' +
      '- **Nota**: NÃO filtra soft deletes (compatibilidade Laravel)\n\n' +
      '**Métricas retornadas:**\n' +
      '- `total`: Total de contatos (todos os status)\n' +
      '- `totalBlocked`: Contatos bloqueados (status=2)\n' +
      '- `totalActive`: Contatos ativos (status=1)\n' +
      '- `totalInactive`: Contatos inativos (status=3)\n\n' +
      '**Estrutura do response:**\n' +
      '- `data`: Objeto com 4 métricas numéricas',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores retornados com sucesso',
    schema: {
      example: {
        data: {
          total: 150,
          totalBlocked: 12,
          totalActive: 125,
          totalInactive: 13,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum número WhatsApp ativo encontrado para este usuário.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async getIndicators(@Request() req: any) {
    return this.contactsService.getIndicators(req.user.id);
  }

  /**
   * POST /api/v1/contacts
   * Bulk update contact status
   * Compatible with Laravel: ContactsController::save()
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar status de contatos em lote',
    description:
      'Atualiza o status de múltiplos contatos de uma vez (operação em lote).\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\n\n' +
      '**Funcionalidades:**\n' +
      '- Atualiza múltiplos contatos de uma vez\n' +
      '- Apenas o campo `status` é atualizado\n' +
      '- Status: 1=Ativo, 2=Bloqueado, 3=Inativo\n' +
      '- Retorna ID único para rastreamento da operação\n\n' +
      '**Segurança:**\n' +
      '- ⚠️ **Laravel tem falha de segurança**: NÃO filtra por user_id\n' +
      '- ✅ **NestJS corrige**: Adiciona filtro por user_id\n' +
      '- Usuários só podem atualizar seus próprios contatos\n\n' +
      '**Request Body:**\n' +
      '- `rows`: Array de IDs dos contatos (obrigatório)\n' +
      '- `status`: Novo status (1, 2 ou 3) (obrigatório)\n\n' +
      '**Estrutura do response:**\n' +
      '- `data.id`: ID único da operação (gerado automaticamente)',
  })
  @ApiBody({ type: UpdateContactsStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Contatos atualizados com sucesso',
    schema: {
      example: {
        data: {
          id: 'lq3x8z9a1b2c',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhum contato atualizado (IDs não pertencem ao usuário)',
    schema: {
      example: {
        message:
          'Nenhum contato foi atualizado. Verifique se os IDs pertencem ao usuário.',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo linhas é obrigatório.',
          'O campo status é obrigatório.',
          'O campo status deve ser 1 (Ativo), 2 (Bloqueado) ou 3 (Inativo).',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async updateContactsStatus(
    @Body() updateDto: UpdateContactsStatusDto,
    @Request() req: any,
  ) {
    return this.contactsService.updateContactsStatus(req.user.id, updateDto);
  }

  /**
   * POST /api/v1/contacts/block
   * Block multiple contacts (set status to 2)
   * NOTE: Laravel endpoint is documented but NOT implemented
   */
  @Post('block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bloquear contatos em lote',
    description:
      'Bloqueia múltiplos contatos de uma vez (define status como 2 - Bloqueado).\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Bloqueia múltiplos contatos de uma vez\\n' +
      '- Status: 2 = Bloqueado\\n' +
      '- Retorna ID único para rastreamento da operação\\n' +
      '- Retorna quantidade de contatos bloqueados\\n\\n' +
      '**Segurança:**\\n' +
      '- Usuários só podem bloquear seus próprios contatos\\n' +
      '- Filtro por user_id aplicado automaticamente\\n\\n' +
      '**⚠️ NOTA IMPORTANTE:**\\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\\n' +
      '- Esta é uma implementação seguindo a especificação documentada\\n\\n' +
      '**Request Body:**\\n' +
      '- `contact_ids`: Array de IDs dos contatos (obrigatório)\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data.id`: ID único da operação\\n' +
      '- `data.blocked`: Quantidade de contatos bloqueados',
  })
  @ApiBody({ type: BlockContactsDto })
  @ApiResponse({
    status: 200,
    description: 'Contatos bloqueados com sucesso',
    schema: {
      example: {
        data: {
          id: 'lq3x8z9a1b2c',
          blocked: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhum contato bloqueado (IDs não pertencem ao usuário)',
    schema: {
      example: {
        message:
          'Nenhum contato foi bloqueado. Verifique se os IDs pertencem ao usuário.',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo contact_ids é obrigatório.',
          'O campo contact_ids deve ser um array.',
          'O campo contact_ids deve conter pelo menos 1 ID.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async blockContacts(
    @Body() blockDto: BlockContactsDto,
    @Request() req: any,
  ) {
    return this.contactsService.blockContacts(req.user.id, blockDto);
  }

  /**
   * POST /api/v1/contacts/unblock
   * Unblock multiple contacts (set status to 1)
   * NOTE: Laravel endpoint is documented but NOT implemented
   */
  @Post('unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desbloquear contatos em lote',
    description:
      'Desbloqueia múltiplos contatos de uma vez (define status como 1 - Ativo).\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Desbloqueia múltiplos contatos de uma vez\\n' +
      '- Status: 1 = Ativo\\n' +
      '- Retorna ID único para rastreamento da operação\\n' +
      '- Retorna quantidade de contatos desbloqueados\\n\\n' +
      '**Segurança:**\\n' +
      '- Usuários só podem desbloquear seus próprios contatos\\n' +
      '- Filtro por user_id aplicado automaticamente\\n\\n' +
      '**⚠️ NOTA IMPORTANTE:**\\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\\n' +
      '- Esta é uma implementação seguindo a especificação documentada\\n\\n' +
      '**Request Body:**\\n' +
      '- `contact_ids`: Array de IDs dos contatos (obrigatório)\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data.id`: ID único da operação\\n' +
      '- `data.unblocked`: Quantidade de contatos desbloqueados',
  })
  @ApiBody({ type: UnblockContactsDto })
  @ApiResponse({
    status: 200,
    description: 'Contatos desbloqueados com sucesso',
    schema: {
      example: {
        data: {
          id: 'lq3x8z9a1b2c',
          unblocked: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Nenhum contato desbloqueado (IDs não pertencem ao usuário)',
    schema: {
      example: {
        message:
          'Nenhum contato foi desbloqueado. Verifique se os IDs pertencem ao usuário.',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo contact_ids é obrigatório.',
          'O campo contact_ids deve ser um array.',
          'O campo contact_ids deve conter pelo menos 1 ID.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async unblockContacts(
    @Body() unblockDto: UnblockContactsDto,
    @Request() req: any,
  ) {
    return this.contactsService.unblockContacts(req.user.id, unblockDto);
  }

  /**
   * POST /api/v1/contacts/search
   * Advanced search for contacts
   * NOTE: Laravel endpoint is documented but NOT implemented
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar contatos por termo',
    description:
      'Realiza busca avançada de contatos por termo e tipo.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Busca por termo (mínimo 3 caracteres)\\n' +
      '- Filtro por tipo de busca (opcional):\\n' +
      '  * `name`: Busca apenas no nome\\n' +
      '  * `phone`: Busca apenas no número\\n' +
      '  * `label`: Busca apenas nas labels/tags\\n' +
      '  * Se não especificado: busca em todos os campos\\n' +
      '- Filtra apenas contatos do usuário autenticado\\n' +
      '- Apenas contatos de número WhatsApp ativo\\n' +
      '- Respeita soft deletes\\n' +
      '- Agrupa por número (evita duplicatas)\\n' +
      '- Ordena por ID DESC\\n\\n' +
      '**⚠️ NOTA IMPORTANTE:**\\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\\n' +
      '- Esta é uma implementação seguindo a especificação documentada\\n\\n' +
      '**Request Body:**\\n' +
      '- `query`: Termo de busca (obrigatório, mín. 3 chars)\\n' +
      '- `type`: Tipo de busca (opcional: name, phone, label)\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data`: Array de contatos encontrados\\n' +
      '- `meta`: Metadados da busca (query, type, total)',
  })
  @ApiBody({ type: SearchContactsDto })
  @ApiResponse({
    status: 200,
    description: 'Contatos encontrados com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            number_id: 1,
            name: 'João Silva',
            number: '5511987654321',
            cel_owner: '5511999999999',
            status: 1,
            labels: '["vip", "cliente"]',
            labelsName: 'vip, cliente',
            created_at: '2024-10-29T10:00:00.000Z',
          },
        ],
        meta: {
          query: 'João',
          type: 'name',
          total: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum número WhatsApp ativo encontrado para este usuário.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo query é obrigatório.',
          'O campo query deve ter no mínimo 3 caracteres.',
          'O campo type deve ser: name, phone ou label.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async searchContacts(
    @Body() searchDto: SearchContactsDto,
    @Request() req: any,
  ) {
    return this.contactsService.searchContacts(req.user.id, searchDto);
  }

  /**
   * GET /api/v1/contacts/active/export
   * Export active contacts to CSV or XLSX
   */
  @Get('active/export')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Exportar contatos ativos',
    description:
      'Exporta contatos ativos para arquivo CSV ou XLSX.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**⚠️ NOTA IMPORTANTE:**\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\n' +
      '- Implementação nova seguindo especificação documentada\n\n' +
      '**Regras de negócio:**\n' +
      '- Exporta apenas contatos com status = 1 (Ativo)\n' +
      '- Usuário pode exportar apenas seus próprios contatos\n' +
      '- Filtro opcional por label_id\n' +
      '- Formato: csv (padrão) ou xlsx\n' +
      '- Retorna arquivo para download\n\n' +
      '**Query parameters:**\n' +
      '- `format`: Formato do arquivo (csv ou xlsx) (opcional, padrão: csv)\n' +
      '- `label_id`: ID da label para filtrar contatos (opcional)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'xlsx'],
    description: 'Formato do arquivo de exportação',
    example: 'csv',
  })
  @ApiQuery({
    name: 'label_id',
    required: false,
    type: Number,
    description: 'ID da label para filtrar contatos',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo exportado com sucesso',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum contato ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum contato ativo encontrado para exportação.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async exportContacts(
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Query('label_id') labelId: number | undefined,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { stream, filename, contentType } =
      await this.contactsService.exportContacts(req.user.id, format, labelId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }

  /**
   * POST /api/v1/contacts/import/csv
   * Import contacts from CSV file
   */
  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        // Accept CSV MIME types or text/plain files with .csv extension
        const isValidMimeType =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/csv';

        const isTextPlainWithCsvExtension =
          file.mimetype === 'text/plain' &&
          file.originalname.toLowerCase().endsWith('.csv');

        if (isValidMimeType || isTextPlainWithCsvExtension) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Apenas arquivos CSV são permitidos (.csv)',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Importar contatos via CSV',
    description:
      'Importa contatos de arquivo CSV.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**⚠️ NOTA IMPORTANTE:**\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\n' +
      '- Implementação nova seguindo especificação documentada\n\n' +
      '**Regras de negócio:**\n' +
      '- Formato CSV aceito (separador: vírgula ou ponto-vírgula)\n' +
      '- Valida números de telefone brasileiros\n' +
      '- Ignora duplicatas automaticamente\n' +
      '- Aplica label se especificada (label_id)\n' +
      '- Retorna relatório de importação (total, importados, duplicatas, erros)\n\n' +
      '**Formato esperado do CSV:**\n' +
      '```\n' +
      'Nome,Telefone,Email\n' +
      'João Silva,11999999999,joao@email.com\n' +
      'Maria Santos,11988888888,maria@email.com\n' +
      '```\n\n' +
      '**Body parameters (multipart/form-data):**\n' +
      '- `file`: Arquivo CSV (obrigatório, max 10MB)\n' +
      '- `label_id`: ID da label para aplicar aos contatos (opcional)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo CSV contendo os contatos',
        },
        label_id: {
          type: 'number',
          description: 'ID da label para aplicar aos contatos (opcional)',
          example: 1,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Importação concluída com sucesso',
    schema: {
      example: {
        message: 'Importação concluída com sucesso',
        summary: {
          total_lines: 100,
          imported: 85,
          duplicates: 10,
          invalid: 5,
          errors: [
            'Linha 5: Número de telefone inválido ou ausente',
            'Linha 23: Número de telefone inválido ou ausente',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou erro no processamento',
    schema: {
      example: {
        message: 'Apenas arquivos CSV são permitidos (.csv)',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum número WhatsApp ativo encontrado para este usuário.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('label_id') labelId: number | undefined,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('O arquivo CSV é obrigatório.');
    }

    return this.contactsService.importCsv(req.user.id, file, labelId);
  }

  /**
   * POST /api/v1/contacts/import/test
   * Test CSV import without saving
   */
  @Post('import/test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        // Accept CSV MIME types or text/plain files with .csv extension
        const isValidMimeType =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/csv';

        const isTextPlainWithCsvExtension =
          file.mimetype === 'text/plain' &&
          file.originalname.toLowerCase().endsWith('.csv');

        if (isValidMimeType || isTextPlainWithCsvExtension) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Apenas arquivos CSV são permitidos (.csv)',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Testar importação de CSV (preview)',
    description:
      'Testa importação de CSV sem salvar no banco de dados.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**⚠️ NOTA IMPORTANTE:**\n' +
      '- Endpoint documentado no Laravel mas NÃO implementado\n' +
      '- Implementação nova seguindo especificação documentada\n\n' +
      '**Regras de negócio:**\n' +
      '- Valida formato do arquivo CSV\n' +
      '- Valida números de telefone\n' +
      '- Retorna preview dos primeiros 5 contatos válidos\n' +
      '- NÃO salva dados no banco (apenas validação)\n' +
      '- Útil para verificar o arquivo antes de importar\n\n' +
      '**Body parameters (multipart/form-data):**\n' +
      '- `file`: Arquivo CSV para testar (obrigatório, max 10MB)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo CSV para testar',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preview gerado com sucesso',
    schema: {
      example: {
        message: 'Preview da importação gerado com sucesso',
        preview: {
          total_lines: 100,
          valid: 90,
          invalid: 10,
          sample: [
            {
              name: 'João Silva',
              phone: '5511999999999',
              email: 'joao@email.com',
            },
            {
              name: 'Maria Santos',
              phone: '5511988888888',
              email: 'maria@email.com',
            },
          ],
          errors: [
            'Linha 5: Número de telefone inválido - "123"',
            'Linha 12: Número de telefone inválido - "vazio"',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou erro no processamento',
    schema: {
      example: {
        message: 'Apenas arquivos CSV são permitidos (.csv)',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
    schema: {
      example: {
        message: 'Nenhum número WhatsApp ativo encontrado para este usuário.',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async testImport(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('O arquivo CSV é obrigatório.');
    }

    return this.contactsService.testImport(req.user.id, file);
  }
}
