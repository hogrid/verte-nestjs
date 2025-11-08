import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NumbersService } from './numbers.service';
import { UpdateNumberDto } from './dto/update-number.dto';

/**
 * NumbersController
 *
 * Gerenciamento de números/instâncias WhatsApp
 * Total: 6 endpoints
 */
@ApiTags('Numbers')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NumbersController {
  constructor(private readonly numbersService: NumbersService) {}

  /**
   * 1. GET /api/v1/numbers
   * Listar números WhatsApp do usuário
   */
  @Get('numbers')
  @ApiOperation({
    summary: 'Listar números WhatsApp',
    description: 'Retorna todos os números/instâncias WhatsApp do usuário',
  })
  @ApiResponse({ status: 200, description: 'Números listados' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req: { user: { id: number } }) {
    return this.numbersService.findAll(req.user.id);
  }

  /**
   * 2. GET /api/v1/numbers/:number
   * Detalhes de número específico
   */
  @Get('numbers/:number')
  @ApiOperation({
    summary: 'Detalhes do número',
    description: 'Retorna detalhes de um número/instância WhatsApp específico',
  })
  @ApiParam({ name: 'number', description: 'ID do número', example: 1 })
  @ApiResponse({ status: 200, description: 'Número encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async findOne(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
  ) {
    return this.numbersService.findOne(req.user.id, numberId);
  }

  /**
   * 3. POST /api/v1/numbers/:number
   * Atualizar configurações do número
   */
  @Post('numbers/:number')
  @ApiOperation({
    summary: 'Atualizar número',
    description: 'Atualiza configurações de um número/instância WhatsApp',
  })
  @ApiParam({ name: 'number', description: 'ID do número', example: 1 })
  @ApiBody({ type: UpdateNumberDto })
  @ApiResponse({ status: 200, description: 'Número atualizado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async update(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
    @Body() dto: UpdateNumberDto,
  ) {
    return this.numbersService.update(req.user.id, numberId, dto);
  }

  /**
   * 4. DELETE /api/v1/numbers/:number
   * Deletar número WhatsApp
   */
  @Delete('numbers/:number')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar número',
    description: 'Remove um número/instância WhatsApp (soft delete)',
  })
  @ApiParam({ name: 'number', description: 'ID do número', example: 1 })
  @ApiResponse({ status: 200, description: 'Número deletado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async delete(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
  ) {
    return this.numbersService.delete(req.user.id, numberId);
  }

  /**
   * 5. GET /api/v1/extra-number
   * Listar números extras disponíveis
   */
  @Get('extra-number')
  @ApiOperation({
    summary: 'Números extras disponíveis',
    description: 'Retorna quantos números extras o usuário pode adicionar',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações retornadas',
    schema: {
      example: {
        current_numbers: 1,
        max_numbers: 5,
        available: 4,
        message: 'Você possui 1 número(s). Pode adicionar até 4 número(s) extra(s).',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getExtraNumbers(@Request() req: { user: { id: number } }) {
    return this.numbersService.getExtraNumbers(req.user.id);
  }

  /**
   * 6. POST /api/v1/extra-number
   * Adicionar número extra
   */
  @Post('extra-number')
  @ApiOperation({
    summary: 'Adicionar número extra',
    description: 'Adiciona um novo número/instância WhatsApp ao usuário',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Número de telefone',
          example: '5511999999999',
        },
      },
      required: ['phone'],
    },
  })
  @ApiResponse({ status: 201, description: 'Número extra adicionado' })
  @ApiResponse({ status: 400, description: 'Limite atingido ou número já existe' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async addExtraNumber(
    @Request() req: { user: { id: number } },
    @Body('phone') phone: string,
  ) {
    return this.numbersService.addExtraNumber(req.user.id, phone);
  }
}
