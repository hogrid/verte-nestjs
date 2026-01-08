import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SaveConfigurationDto } from './dto/save-configuration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Configuration Controller
 * Handles user configuration endpoints
 */
@ApiTags('User Configuration')
@Controller('api/v1')
export class ConfigurationController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/save-configuration
   * Save user configuration settings
   * Authenticated user can save their personal configuration
   */
  @Post('save-configuration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Salvar configurações do usuário',
    description:
      'Salva ou atualiza as configurações pessoais do usuário autenticado.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Cria nova configuração se não existir\\n' +
      '- Atualiza configuração existente\\n' +
      '- Campo timer_delay: tempo de atraso entre envios (segundos)\\n' +
      '- Valor padrão timer_delay: 30 segundos\\n' +
      '- Mínimo timer_delay: 1 segundo\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `message`: Mensagem de sucesso\\n' +
      '- `data`: Objeto com a configuração salva',
  })
  @ApiBody({
    type: SaveConfigurationDto,
    description: 'Configurações a serem salvas',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurações salvas com sucesso',
    schema: {
      example: {
        message: 'Configurações salvas com sucesso',
        data: {
          id: 1,
          user_id: 2,
          timer_delay: 45,
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
    status: 404,
    description: 'Usuário não encontrado',
    schema: {
      example: {
        message: 'Usuário com ID 999 não encontrado',
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
          'O timer_delay deve ser um número.',
          'O timer_delay deve ser no mínimo 1 segundo.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async saveConfiguration(
    @Body() saveDto: SaveConfigurationDto,
    @Request() req: any,
  ) {
    return this.usersService.saveConfiguration(req.user.id, saveDto);
  }
}
