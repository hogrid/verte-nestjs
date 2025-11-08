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
  HttpCode,
  HttpStatus,
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
  constructor(private readonly adminService: AdminService) {}

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
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nome, email ou CPF/CNPJ' })
  @ApiQuery({ name: 'plan_id', required: false, description: 'Filtrar por plano', type: Number })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status', enum: ['actived', 'inactived'] })
  @ApiQuery({ name: 'page', required: false, description: 'Página atual', example: 1 })
  @ApiQuery({ name: 'per_page', required: false, description: 'Itens por página', example: 15 })
  @ApiResponse({ status: 200, description: 'Clientes listados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado (não é administrador)' })
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
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto);
  }

  /**
   * 3. GET /api/v1/config/customers/{user}
   * Detalhes de cliente específico
   */
  @Get('customers/:user')
  @ApiOperation({
    summary: 'Detalhes do cliente',
    description: 'Retorna dados completos de um cliente. **Requer perfil administrator**.',
  })
  @ApiParam({ name: 'user', description: 'ID do cliente', example: 1 })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async getCustomer(@Param('user') userId: number) {
    return this.adminService.getCustomer(userId);
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
    @Param('user') userId: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.adminService.updateCustomer(userId, dto);
  }

  /**
   * 5. DELETE /api/v1/config/customers/{user}
   * Deletar cliente (soft delete)
   */
  @Delete('customers/:user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar cliente',
    description: 'Remove cliente do sistema (soft delete). **Requer perfil administrator**.',
  })
  @ApiParam({ name: 'user', description: 'ID do cliente', example: 1 })
  @ApiResponse({ status: 200, description: 'Cliente deletado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async deleteCustomer(@Param('user') userId: number) {
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
  @ApiQuery({ name: 'page', required: false, description: 'Página atual', example: 1 })
  @ApiQuery({ name: 'per_page', required: false, description: 'Itens por página', example: 15 })
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
  @ApiQuery({ name: 'page', required: false, description: 'Página atual', example: 1 })
  @ApiQuery({ name: 'per_page', required: false, description: 'Itens por página', example: 15 })
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
  @ApiOperation({
    summary: 'Salvar configuração',
    description:
      'Cria ou atualiza configuração global do sistema. **Requer perfil administrator**.',
  })
  @ApiBody({ type: SaveSettingDto })
  @ApiResponse({ status: 201, description: 'Configuração salva com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async saveSetting(@Body() dto: SaveSettingDto) {
    return this.adminService.saveSetting(dto);
  }
}
