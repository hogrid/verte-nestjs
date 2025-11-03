import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Labels Controller
 * Manages label/tag system for contacts
 *
 * Laravel compatibility:
 * - Same routes and responses
 * - Same validation messages
 * - Portuguese error messages
 */
@ApiTags('Labels')
@Controller('api/v1/labels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  /**
   * GET /api/v1/labels
   * List all labels
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar labels',
    description:
      'Lista todas as labels/etiquetas do usuário autenticado.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Retorna labels do número WhatsApp ativo\n' +
      '- Pode filtrar por number_id específico\n' +
      '- Ordenado por data de criação (mais recentes primeiro)\n' +
      '- Respeita soft deletes (deleted_at)\n\n' +
      '**Nota**: Laravel integra com WAHA/WhatsApp API\n' +
      'Por enquanto retornamos labels do banco de dados',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    type: Number,
    description: 'ID do número WhatsApp (opcional)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de labels retornada com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            number_id: 1,
            name: 'Clientes VIP',
            created_at: '2024-10-30T12:00:00.000Z',
            updated_at: '2024-10-30T12:00:00.000Z',
          },
          {
            id: 2,
            user_id: 1,
            number_id: 1,
            name: 'Leads Quentes',
            created_at: '2024-10-29T10:00:00.000Z',
            updated_at: '2024-10-29T10:00:00.000Z',
          },
        ],
        meta: {
          current_page: 1,
          from: 1,
          to: 2,
          per_page: 10,
          total: 2,
          last_page: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum número WhatsApp ativo encontrado',
  })
  async findAll(
    @Request() req: any,
    @Query('id') numberId?: number,
  ) {
    const labels = await this.labelsService.findAll(req.user.id, numberId);

    // Laravel compatibility: return data with pagination meta
    return {
      data: labels,
      meta: {
        current_page: 1,
        from: 1,
        to: labels.length,
        per_page: labels.length,
        total: labels.length,
        last_page: 1,
      },
    };
  }

  /**
   * POST /api/v1/labels
   * Create new label
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar nova label',
    description:
      'Cria uma nova label/etiqueta para organizar contatos.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Nome obrigatório (máx 150 caracteres)\n' +
      '- number_id deve pertencer ao usuário autenticado\n' +
      '- Retorna label criada com status 201\n' +
      '- Registra ação no log do sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Label criada com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          user_id: 1,
          number_id: 1,
          name: 'Clientes VIP',
          created_at: '2024-10-30T12:00:00.000Z',
          updated_at: '2024-10-30T12:00:00.000Z',
          deleted_at: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Número não pertence ao usuário',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
    schema: {
      example: {
        message: [
          'O campo nome é obrigatório.',
          'O campo number_id é obrigatório.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async create(
    @Request() req: any,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    const label = await this.labelsService.create(req.user.id, createLabelDto);

    // Laravel compatibility: return data wrapper
    return {
      data: label,
    };
  }

  /**
   * DELETE /api/v1/labels/{label}
   * Delete label (soft delete)
   */
  @Delete(':label')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar label',
    description:
      'Deleta uma label/etiqueta (soft delete).\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Apenas labels do próprio usuário podem ser deletadas\n' +
      '- Utiliza soft delete (deleted_at)\n' +
      '- Retorna 204 No Content em caso de sucesso\n' +
      '- Registra ação no log do sistema',
  })
  @ApiParam({
    name: 'label',
    type: Number,
    description: 'ID da label a ser deletada',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Label deletada com sucesso (sem conteúdo)',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'Label não encontrada',
  })
  async remove(
    @Request() req: any,
    @Param('label', ParseIntPipe) labelId: number,
  ) {
    await this.labelsService.remove(req.user.id, labelId);
    // No content returned (204)
  }
}
