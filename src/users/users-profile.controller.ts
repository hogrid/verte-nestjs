import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { SaveConfigurationDto } from './dto/save-configuration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * User Profile Controller
 * Handles user profile endpoints (non-admin operations)
 * Authenticated users can view/update their own profiles
 */
@ApiTags('User Profile')
@Controller('api/v1/user')
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/user/:id
   * Get authenticated user's own profile
   * User can only view their own profile (id must match authenticated user)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Visualizar perfil próprio',
    description:
      'Retorna informações do perfil do usuário autenticado.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Usuário pode visualizar apenas seu próprio perfil\\n' +
      '- Se tentar acessar perfil de outro usuário, retorna 403\\n' +
      '- Inclui relacionamentos: plan, numbers, config\\n' +
      '- Filtra automaticamente usuários soft-deleted\\n' +
      '- Retorna 404 se usuário não existir\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data`: Objeto com informações completas do usuário',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário (deve ser o mesmo do usuário autenticado)',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário retornado com sucesso',
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
    description: 'Tentando acessar perfil de outro usuário',
    schema: {
      example: {
        message: 'Você não tem permissão para acessar este perfil.',
        error: 'Forbidden',
        statusCode: 403,
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
  async findOwnProfile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    // Verify user is accessing their own profile
    if (req.user.id !== id) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este perfil.',
      );
    }

    return this.usersService.findUserProfile(id);
  }

  /**
   * POST /api/v1/user/:id
   * Update authenticated user's own profile
   * User can only update their own profile (id must match authenticated user)
   */
  @Post(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar perfil próprio',
    description:
      'Atualiza informações do perfil do usuário autenticado.\\n\\n' +
      '**Requer autenticação**: Sim (JWT)\\n' +
      '**Requer permissão**: Nenhuma (usuário autenticado)\\n\\n' +
      '**Funcionalidades:**\\n' +
      '- Usuário pode atualizar apenas seu próprio perfil\\n' +
      '- Se tentar atualizar perfil de outro usuário, retorna 403\\n' +
      '- Atualização parcial (apenas campos enviados serão atualizados)\\n' +
      '- Senha é criptografada automaticamente (bcrypt)\\n' +
      '- Campos permitidos: name, last_name, email, cel, password, photo\\n' +
      '- Campos NÃO permitidos: profile, plan_id, cpfCnpj, status\\n' +
      '- Retorna 404 se usuário não existir\\n\\n' +
      '**Estrutura do response:**\\n' +
      '- `data`: Objeto com o usuário atualizado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário (deve ser o mesmo do usuário autenticado)',
    example: 1,
    type: Number,
  })
  @ApiBody({
    type: UpdateUserProfileDto,
    description: 'Dados do perfil a serem atualizados (atualização parcial)',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso',
    schema: {
      example: {
        data: {
          id: 2,
          stripe_id: null,
          plan_id: 1,
          name: 'João Silva Atualizado',
          last_name: 'Santos',
          email: 'joao.novo@example.com',
          cel: '11999999999',
          cpfCnpj: '12345678900',
          password: '$2b$10$hashedPassword',
          status: 'actived',
          profile: 'user',
          photo: '/uploads/profiles/user2.jpg',
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
    description: 'Tentando atualizar perfil de outro usuário',
    schema: {
      example: {
        message: 'Você não tem permissão para atualizar este perfil.',
        error: 'Forbidden',
        statusCode: 403,
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
          'O email informado não é válido.',
          'Este email já foi cadastrado.',
          'A senha deve ter no mínimo 8 caracteres.',
          'As senhas não conferem.',
        ],
        error: 'Unprocessable Entity',
        statusCode: 422,
      },
    },
  })
  async updateOwnProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserProfileDto,
    @Request() req: any,
  ) {
    // Verify user is updating their own profile
    if (req.user.id !== id) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este perfil.',
      );
    }

    return this.usersService.updateUserProfile(id, updateDto);
  }
}
