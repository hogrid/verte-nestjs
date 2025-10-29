import {
  Controller,
  Post,
  Get,
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
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  CheckMailConfirmationDto,
} from './dto';

/**
 * Auth Controller
 * Handles all authentication endpoints
 * Compatible with Laravel 8 AuthController routes
 *
 * Endpoints:
 * - POST /api/v1/login
 * - POST /api/v1/logout
 * - POST /api/v1/register
 * - POST /api/v1/reset (multi-step: 0, 1, 2)
 * - GET  /api/v1/ping
 * - POST /api/v1/check-mail-confirmation-code
 */
@ApiTags('Auth')
@Controller('api/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/login
   * Authenticate user and return JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de usuário',
    description:
      'Autentica um usuário com email e senha, retornando um token JWT válido por 1 hora.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    schema: {
      example: {
        expiresIn: 3600,
        userData: {
          id: 1,
          name: 'João',
          last_name: 'Silva',
          email: 'joao@exemplo.com',
          status: 'actived',
          profile: 'user',
          plan: {},
          numbersConnected: 0,
          totalNumber: 1,
          extraNumbers: 0,
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou senha inválida',
    schema: {
      example: {
        message: 'Email ou senha inválida.',
        error: 'Unauthorized',
        statusCode: 401,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Conta inativa',
    schema: {
      example: {
        message:
          'A sua conta foi inativa, entre em contato com nosso suporte por favor.',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/v1/logout
   * Logout authenticated user
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout de usuário',
    description: 'Desautentica o usuário atual (client-side token removal).',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    schema: { example: { message: 'Logout realizado com sucesso.' } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async logout() {
    return this.authService.logout();
  }

  /**
   * POST /api/v1/register
   * Register new user account
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registro de novo usuário',
    description:
      'Cria uma nova conta de usuário com validações completas.\n\n' +
      '**Validações automáticas:**\n' +
      '- Email único no sistema (não pode estar em uso)\n' +
      '- CPF ou CNPJ válido (validação brasileira)\n' +
      '- Senha mínima de 8 caracteres\n' +
      '- Confirmação de senha idêntica\n\n' +
      '**O sistema cria automaticamente:**\n' +
      '- `status: "actived"` - Usuário criado como ativo\n' +
      '- `confirmed_mail: 1` - Email considerado confirmado\n' +
      '- `active: 0` - Aguardando ativação/pagamento de plano\n' +
      '- `plan_id: null` - Será definido quando usuário escolher um plano\n' +
      '- `profile: "user"` - Perfil padrão (ou "administrator" se informado)\n' +
      '- Uma instância WhatsApp (Number) com nome baseado no celular\n\n' +
      '**Campos aceitos no body:**\n' +
      '- name (obrigatório)\n' +
      '- last_name (opcional)\n' +
      '- email (obrigatório, único)\n' +
      '- cel (obrigatório)\n' +
      '- cpfCnpj (obrigatório, válido)\n' +
      '- password (obrigatório, min 8 chars)\n' +
      '- password_confirmation (obrigatório, igual password)\n' +
      '- permission (opcional: "user" ou "administrator")',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    description: 'Usuário registrado com sucesso',
    schema: {
      example: {
        message: 'Cadastro realizado com sucesso',
        data: {
          id: 1,
          name: 'João',
          last_name: 'Silva',
          email: 'joao@exemplo.com',
          cpfCnpj: '52998224725',
          cel: '11987654321',
          status: 'actived',
          profile: 'user',
          confirmed_mail: 1,
          active: 0,
          plan_id: null,
          created_at: '2024-10-29T10:00:00.000Z',
          updated_at: '2024-10-29T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 422,
    description:
      'Erro de validação (email duplicado, CPF inválido, senhas não conferem, etc.)',
    schema: {
      example: {
        errors: {
          email: ['Este email já foi cadastrado.'],
          cpfCnpj: ['O CPF ou CNPJ informado não é válido.'],
          password: ['A senha deve ter no mínimo 8 caracteres.'],
          password_confirmation: ['As senhas não conferem.'],
        },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/v1/reset
   * Multi-step password reset process
   * Step 0: Send verification code
   * Step 1: Verify PIN
   * Step 2: Reset password
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset de senha (multi-step)',
    description:
      'Processo de recuperação de senha em 3 etapas:\n' +
      '- Step 0: Solicita código via email\n' +
      '- Step 1: Verifica código PIN\n' +
      '- Step 2: Redefine senha',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Operação realizada com sucesso (varia por step)',
  })
  @ApiResponse({
    status: 400,
    description: 'Email não encontrado, PIN inválido ou senhas não conferem',
  })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  /**
   * GET /api/v1/ping
   * Check authentication status and get user data
   */
  @Get('ping')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verificar autenticação',
    description:
      'Retorna dados completos do usuário autenticado (plan, numbers, config).',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário autenticado',
    schema: {
      example: {
        data: {
          id: 1,
          name: 'João',
          email: 'joao@exemplo.com',
          status: 'actived',
          profile: 'user',
          plan: {},
          numbersConnected: 0,
          totalNumber: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async ping(@Request() req: any) {
    return this.authService.ping(req.user);
  }

  /**
   * POST /api/v1/check-mail-confirmation-code
   * Verify email confirmation code
   */
  @Post('check-mail-confirmation-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar email',
    description:
      'Verifica o código de confirmação de email enviado ao usuário.',
  })
  @ApiBody({ type: CheckMailConfirmationDto })
  @ApiResponse({
    status: 200,
    description: 'Email confirmado com sucesso',
    schema: {
      example: { message: 'O e-mail foi confirmado com sucesso' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido',
    schema: {
      example: { message: 'O código enviado não está válido.' },
    },
  })
  async checkMailConfirmation(@Body() dto: CheckMailConfirmationDto) {
    return this.authService.checkMailConfirmation(dto);
  }
}
