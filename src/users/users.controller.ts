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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Users Controller
 * Handles user/customer management endpoints
 * Compatible with Laravel UserController routes
 */
@ApiTags('Users')
@Controller('api/v1/config/customers')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/config/customers
   * List all customers (non-deleted users)
   * Protected endpoint (requires admin authentication)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar todos os clientes',
    description:
      'Retorna lista de todos os clientes cadastrados no sistema (usuários não deletados).\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Administrador\n\n' +
      '**Funcionalidades:**\n' +
      '- Busca por nome ou email com `?search=termo`\n' +
      '- Ordenação com `?order=asc` ou `?order=desc`\n' +
      '- Filtra automaticamente usuários soft-deleted\n' +
      '- Inclui relacionamentos: plano, números WhatsApp, configurações\n\n' +
      '**Estrutura do response:**\n' +
      '- `meta`: Metadados de paginação (atualmente zerado)\n' +
      '- `data`: Array de usuários com informações completas',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtrar clientes por nome ou email (busca parcial)',
    example: 'joão',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Ordenar clientes por ID (crescente ou decrescente)',
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes retornada com sucesso',
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
            id: 2,
            name: 'João Silva',
            email: 'joao@example.com',
            document: '12345678900',
            profile: 0,
            plan_id: 1,
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
            deleted_at: null,
            plan: {
              id: 1,
              name: 'Plano Básico',
              value: 99.9,
              value_promotion: 79.9,
              unlimited: 0,
              medias: 1,
              reports: 1,
              schedule: 0,
              popular: 0,
              created_at: '2024-10-29T10:00:00.000Z',
              updated_at: '2024-10-29T10:00:00.000Z',
              deleted_at: null,
            },
            numbers: [
              {
                id: 1,
                user_id: 2,
                name: 'Instância Principal',
                number: '5511999999999',
                status: 'WORKING',
                session_api: 'session123',
                server_url: 'http://waha:8080',
                globalkey_api: 'key123',
                created_at: '2024-10-29T10:00:00.000Z',
                updated_at: '2024-10-29T10:00:00.000Z',
              },
            ],
            config: {
              id: 1,
              user_id: 2,
              theme: 'light',
              language: 'pt-BR',
              created_at: '2024-10-29T10:00:00.000Z',
              updated_at: '2024-10-29T10:00:00.000Z',
            },
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
  async findAllCustomers(
    @Query('search') search?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.usersService.findAllCustomers(search, order || 'asc');
  }

  // POST removido para evitar colisão com AdminController

  /**
   * GET /api/v1/config/customers/:id
   * Get a specific customer by ID
   * Protected endpoint (requires admin authentication)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obter cliente específico',
    description:
      'Retorna informações completas de um cliente específico pelo ID.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Administrador\n\n' +
      '**Funcionalidades:**\n' +
      '- Busca cliente por ID\n' +
      '- Inclui relacionamentos: plan, numbers, config\n' +
      '- Filtra automaticamente usuários soft-deleted\n' +
      '- Retorna 404 se cliente não existir ou estiver deletado\n\n' +
      '**Estrutura do response:**\n' +
      '- `data`: Objeto com informações completas do cliente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do cliente',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado com sucesso',
    schema: {
      example: {
        data: {
          id: 2,
          stripe_id: null,
          plan_id: 1,
          name: 'João Silva',
          last_name: 'Santos',
          email: 'joao@example.com',
          cel: '11987654321',
          cpfCnpj: '12345678900',
          password: '$2b$10$hashedPassword',
          status: 'actived',
          profile: 'user',
          photo: null,
          confirmed_mail: 1,
          email_code_verication: null,
          email_verified_at: null,
          active: 0,
          canceled_at: null,
          due_access_at: null,
          remember_token: null,
          created_at: '2024-10-29T10:00:00.000Z',
          updated_at: '2024-10-29T10:00:00.000Z',
          deleted_at: null,
          plan: {
            id: 1,
            name: 'Plano Básico',
            value: 99.9,
            value_promotion: 79.9,
            unlimited: 0,
            medias: 1,
            reports: 1,
            schedule: 0,
            popular: 0,
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
            deleted_at: null,
          },
          numbers: [
            {
              id: 1,
              user_id: 2,
              name: 'Número Principal',
              instance: 'WPP_11987654321_2',
              status: 1,
              status_connection: 0,
              cel: '11987654321',
              created_at: '2024-10-29T10:00:00.000Z',
              updated_at: '2024-10-29T10:00:00.000Z',
            },
          ],
          config: {
            id: 1,
            user_id: 2,
            timer_delay: 5,
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
          },
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
    description: 'Cliente não encontrado',
    schema: {
      example: {
        message: 'Cliente com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async findCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findCustomerById(id);
  }

  /**
   * PUT /api/v1/config/customers/:id
   * Update an existing customer
   * Protected endpoint (requires admin authentication)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Atualizar cliente existente',
    description:
      'Atualiza um cliente/usuário existente no sistema (apenas administradores).\n\n' +
      '**Requer autenticação**: Sim (JWT)\n' +
      '**Requer permissão**: Administrador\n\n' +
      '**Funcionalidades:**\n' +
      '- Atualiza dados do cliente (atualização parcial)\n' +
      '- Todos os campos são opcionais\n' +
      '- Apenas campos enviados serão atualizados\n' +
      '- Atualiza timestamp updated_at automaticamente\n' +
      '- Retorna 404 se cliente não existir\n' +
      '- Não permite atualização de senha (use endpoint específico)\n\n' +
      '**Estrutura do response:**\n' +
      '- `data`: Objeto com o cliente atualizado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do cliente a ser atualizado',
    example: 1,
    type: Number,
  })
  @ApiBody({
    type: UpdateCustomerDto,
    description: 'Dados do cliente a serem atualizados (atualização parcial)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente atualizado com sucesso',
    schema: {
      example: {
        data: {
          id: 2,
          stripe_id: null,
          plan_id: 2,
          name: 'João Silva Atualizado',
          last_name: 'Santos',
          email: 'joao.novo@example.com',
          cel: '11999999999',
          cpfCnpj: '12345678900',
          password: '$2b$10$hashedPassword',
          status: 'actived',
          profile: 'user',
          photo: null,
          confirmed_mail: 1,
          email_code_verication: null,
          email_verified_at: null,
          active: 0,
          canceled_at: null,
          due_access_at: null,
          remember_token: null,
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
    description: 'Cliente não encontrado',
    schema: {
      example: {
        message: 'Cliente com ID 999 não encontrado',
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
          'O email informado não é válido.',
          'Este email já foi cadastrado.',
          'O CPF ou CNPJ informado não é válido.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.usersService.updateCustomer(id, updateCustomerDto);
  }

  /**
   * DELETE /api/v1/config/customers/:id
   * Delete a customer (soft delete)
   * Protected endpoint (requires admin authentication)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar cliente (soft delete)',
    description:
      'Deleta um cliente/usuário do sistema realizando soft delete (apenas administradores).\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Administrador\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Realiza soft delete (define deleted_at timestamp)\\n' +
      '- Não remove fisicamente do banco de dados\\n' +
      '- Cliente deletado não aparecerá mais em listagens\\n' +
      '- Retorna 404 se cliente não existir ou já estiver deletado\\n' +
      '- Retorna 204 No Content em caso de sucesso\\n\\n' +
      '**Comportamento:**\\n' +
      '- Após soft delete, o cliente fica inacessível para operações normais\\n' +
      '- Registros relacionados (numbers, config) permanecem no banco\\n' +
      '- Soft delete permite auditoria e recuperação futura se necessário',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do cliente a ser deletado',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 204,
    description: 'Cliente deletado com sucesso (No Content)',
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
    description: 'Cliente não encontrado ou já deletado',
    schema: {
      example: {
        message: 'Cliente com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteCustomer(id);
  }
}
