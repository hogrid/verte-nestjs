import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import {
  User,
  Plan,
  Number as NumberEntity,
  Configuration,
  PasswordReset,
  UserStatus,
  UserProfile,
} from '../database/entities';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  CheckMailConfirmationDto,
} from './dto';

/**
 * Auth Service
 * Core authentication business logic
 * Compatible with Laravel 8 AuthController
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(NumberEntity)
    private readonly numberRepository: Repository<NumberEntity>,
    @InjectRepository(Configuration)
    private readonly configRepository: Repository<Configuration>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login user and generate JWT token
   * Compatible with Laravel AuthController@login
   */
  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['plan'],
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválida.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha inválida.');
    }

    if (user.status === UserStatus.INACTIVED) {
      throw new BadRequestException(
        'A sua conta foi inativa, entre em contato com nosso suporte por favor.',
      );
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const responseUser = await this.buildUserResponse(user);

    // Merge user basic data with additional data (matching Laravel format)
    const userData = {
      id: user.id,
      name: user.name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
      cel: user.cel ?? '',
      cpfCnpj: user.cpfCnpj ?? '',
      status: user.status ?? 'inactived',
      profile: user.profile ?? 'user',
      confirmed_mail: user.confirmed_mail ?? 0,
      active: user.active ?? 0,
      plan: responseUser.plan ?? {},
      numbersConnected: responseUser.numbersConnected ?? 0,
      totalNumber: responseUser.totalNumber ?? 0,
      extraNumbers: responseUser.extraNumbers ?? 0,
      numberActive: responseUser.numberActive ?? {},
      serverType: responseUser.serverType ?? null,
      config: responseUser.config ?? {},
    };

    // Ensure no null values for objects
    const fieldsToCheck = ['plan', 'numberActive', 'config'] as const;
    fieldsToCheck.forEach((field) => {
      if ((userData as any)[field] === null) {
        (userData as any)[field] = {};
      }
    });

    return {
      expiresIn: 60 * 60, // 1 hour
      userData,
      token,
    };
  }

  /**
   * Logout user (client-side token removal)
   * Compatible with Laravel AuthController@logout
   */
  async logout() {
    return {
      message: 'Logout realizado com sucesso.',
    };
  }

  /**
   * Register new user
   * Compatible with Laravel UserService@addUser
   */
  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const now = new Date();

    const user = this.userRepository.create({
      name: registerDto.name,
      last_name: registerDto.last_name,
      email: registerDto.email,
      cpfCnpj: registerDto.cpfCnpj,
      cel: registerDto.cel,
      status: UserStatus.ACTIVED,
      confirmed_mail: 1,
      password: hashedPassword,
      profile: registerDto.permission || UserProfile.USER,
      active: 0,
      created_at: now,
      updated_at: now,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate instance name based on phone number
    const cleanPhone = registerDto.cel.replace(/\D/g, '');
    let instanceName = `RECUPERANOME_${savedUser.id}`;

    if (cleanPhone.length >= 11) {
      const phoneDigits =
        cleanPhone.startsWith('55') && cleanPhone.length >= 13
          ? cleanPhone.substring(2, 13)
          : cleanPhone.substring(0, 11);

      instanceName = `WPP_${phoneDigits}_${savedUser.id}`;
    }

    // Create default number for user (reuse same timestamp as user)
    const number = this.numberRepository.create({
      user_id: savedUser.id,
      name: 'Número Principal',
      instance: instanceName,
      status: 1,
      status_connection: 0,
      cel: savedUser.cel,
      created_at: now,
      updated_at: now,
    });

    await this.numberRepository.save(number);

    return {
      message: 'Cadastro realizado com sucesso',
      data: savedUser,
    };
  }

  /**
   * Multi-step password reset process
   * Compatible with Laravel AuthController@send_forget_password
   */
  async resetPassword(resetDto: ResetPasswordDto) {
    const { step, email, pin, password } = resetDto;

    // Step 0: Send verification code to email
    if (step === 0) {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException({
          errors: { email: ['O email informado não existe.'] },
        });
      }

      // Delete old reset tokens
      await this.passwordResetRepository.delete({ email });

      // Generate 6-digit PIN
      const token = Math.floor(100000 + Math.random() * 900000).toString();

      const passwordReset = this.passwordResetRepository.create({
        email,
        token,
      });

      await this.passwordResetRepository.save(passwordReset);

      // TODO: Send email with PIN code
      // Mail.to(email).send(new SendCodeResetPassword(token));

      return {
        message:
          'Enviamos um email para você com o código para realizar a alteração de senha.',
      };
    }

    // Step 1: Verify PIN code
    if (step === 1) {
      if (!pin) {
        throw new BadRequestException({
          errors: { pin: ['O campo código é obrigatório.'] },
        });
      }

      const resetRecord = await this.passwordResetRepository.findOne({
        where: { email, token: pin },
      });

      if (!resetRecord) {
        throw new BadRequestException({
          errors: { pin: ['O código informado não está correto.'] },
        });
      }

      return {
        message:
          'Código válidado com sucesso, agora basta inserir a nova senha!',
      };
    }

    // Step 2: Reset password with PIN
    if (step === 2) {
      if (!pin || !password) {
        throw new BadRequestException({
          errors: {
            pin: !pin ? ['O campo código é obrigatório.'] : undefined,
            password: !password
              ? ['O campo senha é obrigatório.']
              : undefined,
          },
        });
      }

      const resetRecord = await this.passwordResetRepository.findOne({
        where: { email, token: pin },
      });

      if (!resetRecord) {
        throw new BadRequestException({
          errors: { pin: ['O código informado não é mais válido.'] },
        });
      }

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await this.userRepository.save(user);

      // Delete used reset token
      await this.passwordResetRepository.delete({ email });

      // TODO: Send email notification about password change
      // Mail.to(email).send(new EmailTemplateDefault(...));

      return {
        message: 'Senha alterada com sucesso',
      };
    }

    throw new BadRequestException({
      errors: { step: ['Não foi possivel.'] },
    });
  }

  /**
   * Check authentication status and return user data
   * Compatible with Laravel AuthController@ping
   */
  async ping(user: User) {
    if (!user) {
      return {
        data: {
          id: null,
          name: '',
          email: '',
          status: 'inactived',
          profile: 'user',
          plan: {},
          numbersConnected: 0,
          totalNumber: 0,
          extraNumbers: 0,
          numberActive: {},
          serverType: null,
          config: {},
        },
      };
    }

    const responseUser = await this.buildUserResponse(user);

    const data: any = {
      id: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      status: user.status ?? 'inactived',
      profile: user.profile ?? 'user',
      plan: responseUser.plan ?? {},
      numbersConnected: responseUser.numbersConnected ?? 0,
      totalNumber: responseUser.totalNumber ?? 0,
      extraNumbers: responseUser.extraNumbers ?? 0,
      numberActive: responseUser.numberActive ?? {},
      serverType: responseUser.serverType ?? null,
      config: responseUser.config ?? {},
    };

    // Ensure no null values for objects
    const fieldsToCheck = ['plan', 'numberActive', 'config'] as const;
    fieldsToCheck.forEach((field) => {
      if (data[field] === null) {
        data[field] = {};
      }
    });

    return { data };
  }

  /**
   * Check email confirmation code
   * Compatible with Laravel AuthController@check_mail_confirmation_code
   */
  async checkMailConfirmation(dto: CheckMailConfirmationDto) {
    const user = await this.userRepository.findOne({
      where: {
        id: dto.user_id,
        email_code_verication: dto.code,
      },
    });

    if (!user) {
      throw new BadRequestException('O código enviado não está válido.');
    }

    user.confirmed_mail = 1;
    user.email_verified_at = new Date();
    await this.userRepository.save(user);

    return {
      message: 'O e-mail foi confirmado com sucesso',
    };
  }

  /**
   * Build user response with additional data
   * Compatible with Laravel AuthController@responseUser
   */
  private async buildUserResponse(user: User) {
    const numberActive = await this.numberRepository.findOne({
      where: { user_id: user.id, status: 1 },
    });

    if (!numberActive) {
      let plan = null;
      if (user.plan_id) {
        plan = await this.planRepository.findOne({
          where: { id: user.plan_id },
          select: [
            'id',
            'name',
            'value',
            'value_promotion',
            'unlimited',
            'medias',
            'reports',
            'schedule',
          ],
        });
      }

      const config = await this.configRepository.findOne({
        where: { user_id: user.id },
      });

      return {
        numbersConnected: 0,
        totalNumber:
          this.configService.get<number>('NUMBER_VALUE') || 1,
        extraNumbers: 0,
        numberActive: null,
        serverType: null,
        plan,
        config,
      };
    }

    const numbers = await this.numberRepository.count({
      where: { user_id: user.id },
    });

    const extraNumbers = await this.numberRepository.count({
      where: { user_id: user.id, extra: '1' as any },
    });

    let plan = null;
    if (user.plan_id) {
      plan = await this.planRepository.findOne({
        where: { id: user.plan_id },
        select: [
          'id',
          'name',
          'value',
          'value_promotion',
          'unlimited',
          'medias',
          'reports',
          'schedule',
        ],
      });
    }

    const config = await this.configRepository.findOne({
      where: { user_id: user.id },
    });

    // TODO: Implement real-time WhatsApp connection checking
    // This would require WAHA integration (similar to Laravel WahaAPITrait)
    const numberActiveConnected = 0;

    return {
      numbersConnected: numberActiveConnected,
      totalNumber: this.configService.get<number>('NUMBER_VALUE') || 1,
      extraNumbers,
      numberActive,
      serverType: null, // TODO: Get from server relationship
      plan,
      config,
    };
  }
}
