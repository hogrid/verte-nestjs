import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { ListCustomersDto } from './dto/list-customers.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SaveSettingDto } from './dto/save-setting.dto';
import { UsersService } from '../users/users.service';
import { CreateCustomerDto as UsersCreateCustomerDto } from '../users/dto/create-customer.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { Response } from 'express';
import { SeederService } from '../seeder/seeder.service';

/**
 * AdminController
 *
 * Endpoints administrativos (requerem perfil 'administrator')
 * Compatível com Laravel AdminController
 *
 * Total: 11 endpoints
 */
@ApiTags('Admin')
@Controller('api/v1/config')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly seederService: SeederService,
  ) {}

  /**
   * 1. GET /api/v1/config/customers
   * Listar todos os clientes
   */
  @Get('customers')
  @ApiOperation({
    summary: 'Listar clientes',
    description:
      'Lista todos os clientes do sistema com filtros opcionais. **Requer perfil administrator**.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, email ou CPF/CNPJ',
  })
  @ApiQuery({
    name: 'plan_id',
    required: false,
    description: 'Filtrar por plano',
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por status',
    enum: ['actived', 'inactived'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    description: 'Itens por página',
    example: 15,
  })
  @ApiResponse({ status: 200, description: 'Clientes listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado (não é administrador)',
  })
  async listCustomers(@Query() dto: ListCustomersDto) {
    return this.adminService.listCustomers(dto);
  }

  /**
   * 2. POST /api/v1/config/customers
   * Criar novo cliente
   */
  @Post('customers')
  @ApiOperation({
    summary: 'Criar cliente',
    description:
      'Cria novo cliente com plano atribuído. **Requer perfil administrator**.',
  })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async createCustomer(@Body() body: any, @Res() res: Response) {
    // Fluxo Users (payload com confirmação de senha)
    if (Object.prototype.hasOwnProperty.call(body, 'password_confirmation')) {
      const dto = plainToInstance(UsersCreateCustomerDto, body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (errors.length > 0) {
        const messages: string[] = [];
        for (const err of errors) {
          if (err.constraints) {
            messages.push(...Object.values(err.constraints));
          }
        }
        res.status(422).json({
          message: messages.length ? messages : ['Dados inválidos'],
          error: 'Unprocessable Entity',
          statusCode: 422,
        });
        return;
      }
      const result = await this.usersService.createCustomer(dto);
      res.status(200).json(result);
    }

    // Fluxo Admin (payload simplificado)
    const dto = plainToInstance(CreateCustomerDto, body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length > 0) {
      const messages: string[] = [];
      for (const err of errors) {
        if (err.constraints) {
          messages.push(...Object.values(err.constraints));
        }
      }
      res.status(400).json({
        message: messages,
        error: 'Bad Request',
        statusCode: 400,
      });
      return;
    }

    const created = await this.adminService.createCustomer(dto);
    res.status(201).json(created);
  }

  /**
   * 3. GET /api/v1/config/customers/{user}
   * Detalhes de cliente específico
   */
  @Get('customers/:user')
  @ApiOperation({
    summary: 'Detalhes do cliente',
    description:
      'Retorna dados completos de um cliente. **Requer perfil administrator**.',
  })
  @ApiParam({ name: 'user', description: 'ID do cliente', example: 1 })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async getCustomer(
    @Param('user', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    const customer = await this.adminService.getCustomer(userId);
    res.status(200).json(customer);
  }

  /**
   * 4. PUT /api/v1/config/customers/{user}
   * Atualizar dados de cliente
   */
  @Put('customers/:user')
  @ApiOperation({
    summary: 'Atualizar cliente',
    description:
      'Atualiza dados de cliente existente. **Requer perfil administrator**.',
  })
  @ApiParam({ name: 'user', description: 'ID do cliente', example: 1 })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async updateCustomer(
    @Param('user', ParseIntPipe) userId: number,
    @Body() dto: UpdateCustomerDto,
    @Res() res: Response,
  ) {
    const updated = await this.adminService.updateCustomer(userId, dto);
    res.status(200).json(updated);
  }

  /**
   * 5. DELETE /api/v1/config/customers/{user}
   * Deletar cliente (soft delete)
   */
  @Delete('customers/:user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar cliente',
    description:
      'Remove cliente do sistema (soft delete). **Requer perfil administrator**.',
  })
  @ApiParam({ name: 'user', description: 'ID do cliente', example: 1 })
  @ApiResponse({ status: 200, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async deleteCustomer(@Param('user', ParseIntPipe) userId: number) {
    return this.adminService.deleteCustomer(userId);
  }

  /**
   * 6. GET /api/v1/config/dashboard
   * Dashboard administrativo com indicadores
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard admin',
    description:
      'Retorna indicadores administrativos (total de usuários, campanhas, contatos, pagamentos). **Requer perfil administrator**.',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores carregados',
    schema: {
      example: {
        indicators: {
          total_users: 150,
          total_campaigns: 320,
          total_contacts: 5000,
          total_payments: 180,
          active_campaigns: 45,
        },
        recent_users: [],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getDashboard() {
    return this.adminService.getDashboardIndicators();
  }

  /**
   * 7. GET /api/v1/config/campaigns-all
   * Listar todas as campanhas do sistema
   */
  @Get('campaigns-all')
  @ApiOperation({
    summary: 'Todas as campanhas',
    description:
      'Lista todas as campanhas de todos os usuários. **Requer perfil administrator**.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    description: 'Itens por página',
    example: 15,
  })
  @ApiResponse({ status: 200, description: 'Campanhas listadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getAllCampaigns(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.adminService.getAllCampaigns(page, perPage);
  }

  /**
   * 8. GET /api/v1/config/customer-x-lastshot
   * Última atividade dos clientes
   */
  @Get('customer-x-lastshot')
  @ApiOperation({
    summary: 'Última atividade dos clientes',
    description:
      'Retorna lista de clientes com data da última campanha criada. **Requer perfil administrator**.',
  })
  @ApiResponse({ status: 200, description: 'Atividades carregadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getCustomerLastActivity() {
    return this.adminService.getCustomerLastActivity();
  }

  /**
   * 9. GET /api/v1/config/payments
   * Listar histórico de pagamentos
   */
  @Get('payments')
  @ApiOperation({
    summary: 'Histórico de pagamentos',
    description:
      'Lista todos os pagamentos realizados no sistema. **Requer perfil administrator**.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    description: 'Itens por página',
    example: 15,
  })
  @ApiResponse({ status: 200, description: 'Pagamentos listados' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getPayments(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.adminService.getPayments(page, perPage);
  }

  /**
   * 10. GET /api/v1/config/settings
   * Listar configurações globais
   */
  @Get('settings')
  @ApiOperation({
    summary: 'Configurações globais',
    description:
      'Lista todas as configurações globais do sistema. **Requer perfil administrator**.',
  })
  @ApiResponse({ status: 200, description: 'Configurações listadas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  /**
   * 11. POST /api/v1/config/settings
   * Salvar configuração global
   */
  @Post('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Salvar configuração',
    description:
      'Cria ou atualiza configuração global do sistema. **Requer perfil administrator**.',
  })
  @ApiBody({ type: SaveSettingDto })
  @ApiResponse({ status: 200, description: 'Configuração salva com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async saveSetting(@Body() dto: SaveSettingDto) {
    return this.adminService.saveSetting(dto);
  }

  /**
   * 12. GET /api/v1/config/system-health
   * Verificar saúde do sistema
   */
  @Get('system-health')
  @ApiOperation({
    summary: 'Saúde do sistema',
    description:
      'Retorna status de saúde do sistema (banco de dados, Redis, etc). **Requer perfil administrator**.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do sistema',
    schema: {
      example: {
        status: 'healthy',
        database: 'ok',
        redis: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  /**
   * 13. POST /api/v1/config/clear-cache
   * Limpar cache do sistema
   */
  @Post('clear-cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpar cache',
    description:
      'Limpa o cache do sistema (Redis). **Requer perfil administrator**.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache limpo com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Cache limpo com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async clearCache() {
    return this.adminService.clearCache();
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    await this.seederService.seed();
    return { success: true };
  }

  /**
   * 14. GET /api/v1/config/audit-logs
   * Listar logs de auditoria
   */
  @Get('audit-logs')
  @ApiOperation({
    summary: 'Logs de auditoria',
    description:
      'Lista logs de auditoria do sistema. **Requer perfil administrator**.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    description: 'Itens por página',
    example: 15,
  })
  @ApiResponse({
    status: 200,
    description: 'Logs listados',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.adminService.getAuditLogs(page, perPage);
  }
}
