import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ListTemplatesDto } from './dto/list-templates.dto';

/**
 * TemplatesController
 *
 * Gerencia templates de mensagens reutilizáveis com suporte a variáveis
 * Compatível com Laravel MessageTemplatesController
 *
 * Total: 4 endpoints
 */
@ApiTags('Templates')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * 1. GET /api/v1/message-templates
   * Listar templates do usuário com filtros
   */
  @Get('message-templates')
  @ApiOperation({
    summary: 'Listar templates de mensagens',
    description:
      'Retorna templates do usuário autenticado com filtros opcionais (busca, categoria, status) e paginação',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome ou conteúdo',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['marketing', 'support', 'notification', 'sales', 'other'],
    description: 'Filtrar por categoria',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filtrar por status (1 ou 0)',
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
    description: 'Templates listados com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            name: 'Boas-vindas Cliente',
            content: 'Olá {{nome}}, bem-vindo à {{empresa}}!',
            category: 'marketing',
            variables: ['nome', 'empresa'],
            active: 1,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        meta: {
          current_page: 1,
          from: 1,
          to: 1,
          per_page: 15,
          total: 1,
          last_page: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(
    @Request() req: { user: { id: number } },
    @Query() dto: ListTemplatesDto,
  ) {
    const result = await this.templatesService.findAll(req.user.id, dto);
    // Return only the data array for Laravel compatibility
    return result.data;
  }

  /**
   * 2. POST /api/v1/message-templates
   * Criar novo template
   */
  @Post('message-templates')
  @ApiOperation({
    summary: 'Criar template de mensagem',
    description:
      'Cria novo template reutilizável com suporte a variáveis dinâmicas (ex: {{nome}}, {{empresa}})',
  })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({
    status: 201,
    description: 'Template criado com sucesso',
    schema: {
      example: {
        id: 1,
        user_id: 1,
        name: 'Boas-vindas Cliente',
        content: 'Olá {{nome}}, bem-vindo à {{empresa}}!',
        category: 'marketing',
        variables: ['nome', 'empresa'],
        active: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.create(req.user.id, dto);
  }

  /**
   * 3. PUT /api/v1/message-templates/:id
   * Atualizar template existente
   */
  @Put('message-templates/:id')
  @ApiOperation({
    summary: 'Atualizar template de mensagem',
    description:
      'Atualiza template existente. Variáveis são extraídas automaticamente do conteúdo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do template',
    example: 1,
  })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({
    status: 200,
    description: 'Template atualizado com sucesso',
    schema: {
      example: {
        id: 1,
        user_id: 1,
        name: 'Boas-vindas Cliente VIP',
        content: 'Olá {{nome}}, obrigado por escolher a {{empresa}}!',
        category: 'marketing',
        variables: ['nome', 'empresa'],
        active: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async update(
    @Request() req: { user: { id: number } },
    @Param('id') id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(req.user.id, id, dto);
  }

  /**
   * 4. DELETE /api/v1/message-templates/:id
   * Deletar template (soft delete)
   */
  @Delete('message-templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar template de mensagem',
    description: 'Remove template do sistema (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do template',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Template deletado com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Template deletado com sucesso.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async delete(
    @Request() req: { user: { id: number } },
    @Param('id') id: number,
  ) {
    return this.templatesService.delete(req.user.id, id);
  }
}
