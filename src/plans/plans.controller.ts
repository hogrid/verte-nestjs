import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Plans Controller
 * Handles plans management endpoints
 * Compatible with Laravel PlansController routes
 */
@ApiTags('Plans')
@Controller('api/v1/config/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * GET /api/v1/config/plans
   * List all available plans
   * Public endpoint (no authentication required)
   */
  @Get()
  @ApiOperation({
    summary: 'Listar planos disponíveis',
    description:
      'Retorna lista de todos os planos cadastrados no sistema.\n\n' +
      '**Funcionalidades:**\n' +
      '- Busca por nome com `?search=nome`\n' +
      '- Ordenação com `?order=asc` ou `?order=desc`\n' +
      '- Endpoint público (não requer autenticação)\n\n' +
      '**Estrutura do response:**\n' +
      '- `meta`: Metadados de paginação (atualmente zerado)\n' +
      '- `data`: Array de planos com todas as informações',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtrar planos por nome (busca parcial)',
    example: 'básico',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Ordenar planos por ID (crescente ou decrescente)',
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de planos retornada com sucesso',
    schema: {
      example: {
        meta: {
          current_page: 0,
          from: 0,
          to: 0,
          per_page: 0,
          total: 0,
          last_page: 0,
        },
        data: [
          {
            id: 1,
            code_mp: null,
            name: 'Plano Básico',
            value: 99.9,
            value_promotion: 79.9,
            unlimited: 0,
            medias: 1,
            reports: 1,
            schedule: 0,
            popular: 0,
            code_product: null,
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
            deleted_at: null,
          },
          {
            id: 2,
            code_mp: null,
            name: 'Plano Pro',
            value: 199.9,
            value_promotion: 149.9,
            unlimited: 1,
            medias: 1,
            reports: 1,
            schedule: 1,
            popular: 1,
            code_product: null,
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
            deleted_at: null,
          },
        ],
      },
    },
  })
  async findAll(
    @Query('search') search?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.plansService.findAll(search, order || 'asc');
  }

  /**
   * GET /api/v1/config/plans/:id
   * Get a specific plan by ID
   * Public endpoint (no authentication required)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes de um plano específico',
    description:
      'Retorna informações completas de um plano específico pelo seu ID.\n\n' +
      '**Funcionalidades:**\n' +
      '- Busca plano por ID\n' +
      '- Retorna 404 se plano não existir\n' +
      '- Endpoint público (não requer autenticação)\n\n' +
      '**Estrutura do response:**\n' +
      '- `data`: Objeto com informações completas do plano',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plano',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Plano encontrado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          code_mp: null,
          name: 'Plano Básico',
          value: 99.9,
          value_promotion: 79.9,
          unlimited: 0,
          medias: 1,
          reports: 1,
          schedule: 0,
          popular: 0,
          code_product: null,
          created_at: '2024-10-29T10:00:00.000Z',
          updated_at: '2024-10-29T10:00:00.000Z',
          deleted_at: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Plano não encontrado',
    schema: {
      example: {
        message: 'Plan with ID 999 not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.findOne(id);
  }

  /**
   * POST /api/v1/config/plans
   * Create a new plan
   * Protected endpoint (requires admin authentication)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Criar novo plano',
    description:
      'Cria um novo plano de assinatura no sistema.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Administrador\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Cria plano com todos os recursos especificados\\n' +
      '- Define valores (preço cheio e promocional)\\n' +
      '- Configura limites de recursos (mídias, relatórios)\\n' +
      '- Define flags de funcionalidades (ilimitado, agendamento, popular)\\n' +
      '- Suporta códigos de integração (MercadoPago, produto)\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data`: Objeto com o plano criado (incluindo ID gerado)',
  })
  @ApiBody({
    type: CreatePlanDto,
    description: 'Dados do plano a ser criado',
  })
  @ApiResponse({
    status: 201,
    description: 'Plano criado com sucesso',
    schema: {
      example: {
        data: {
          id: 3,
          code_mp: null,
          name: 'Plano Premium',
          value: 299.9,
          value_promotion: 249.9,
          unlimited: 1,
          medias: 10,
          reports: 20,
          schedule: 1,
          popular: 1,
          code_product: null,
          created_at: '2024-10-29T10:00:00.000Z',
          updated_at: '2024-10-29T10:00:00.000Z',
          deleted_at: null,
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
    status: 403,
    description: 'Sem permissão (não é administrador)',
    schema: {
      example: {
        message:
          'Acesso negado. Apenas administradores podem acessar este recurso.',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo name é obrigatório.',
          'O campo value deve ser um número.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  /**
   * PUT /api/v1/config/plans/:id
   * Update an existing plan
   * Protected endpoint (requires admin authentication)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Atualizar plano existente',
    description:
      'Atualiza um plano de assinatura existente no sistema.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Administrador\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Atualiza dados do plano (atualização parcial)\\n' +
      '- Todos os campos são opcionais\\n' +
      '- Apenas campos enviados serão atualizados\\n' +
      '- Atualiza timestamp updated_at automaticamente\\n' +
      '- Retorna 404 se plano não existir\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data`: Objeto com o plano atualizado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plano a ser atualizado',
    example: 1,
    type: Number,
  })
  @ApiBody({
    type: UpdatePlanDto,
    description: 'Dados do plano a serem atualizados (atualização parcial)',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano atualizado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          code_mp: null,
          name: 'Plano Básico Atualizado',
          value: 129.9,
          value_promotion: 99.9,
          unlimited: 0,
          medias: 3,
          reports: 5,
          schedule: 1,
          popular: 0,
          code_product: null,
          created_at: '2024-10-29T10:00:00.000Z',
          updated_at: '2024-10-29T15:30:00.000Z',
          deleted_at: null,
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
    status: 403,
    description: 'Sem permissão (não é administrador)',
    schema: {
      example: {
        message:
          'Acesso negado. Apenas administradores podem acessar este recurso.',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Plano não encontrado',
    schema: {
      example: {
        message: 'Plan with ID 999 not found',
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
          'O campo name deve ter no mínimo 3 caracteres.',
          'O campo value deve ser maior ou igual a 0.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, updatePlanDto);
  }

  /**
   * DELETE /api/v1/config/plans/:id
   * Delete (soft delete) an existing plan
   * Protected endpoint (requires admin authentication)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar plano',
    description:
      'Deleta (soft delete) um plano de assinatura do sistema.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Administrador\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Realiza soft delete (define deleted_at)\\n' +
      '- Plano não é removido fisicamente do banco\\n' +
      '- Plano deletado não aparece mais nas listagens\\n' +
      '- Retorna 404 se plano não existir\\n' +
      '- Retorna 204 No Content em caso de sucesso\\n\\n' +
      '**Nota**: Esta operação é reversível (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plano a ser deletado',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'Plano deletado com sucesso (sem conteúdo no response)',
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
    status: 403,
    description: 'Sem permissão (não é administrador)',
    schema: {
      example: {
        message:
          'Acesso negado. Apenas administradores podem acessar este recurso.',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Plano não encontrado',
    schema: {
      example: {
        message: 'Plan with ID 999 not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.delete(id);
  }
}
