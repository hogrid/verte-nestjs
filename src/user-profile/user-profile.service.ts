import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
      relations: ['plan'],
      select: [
        'id',
        'name',
        'last_name',
        'email',
        'cel',
        'cpfCnpj',
        'status',
        'profile',
        'confirmed_mail',
        'active',
        'photo',
        'created_at',
        'updated_at',
      ],
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async updateProfile(userId: number, dto: UpdateUserProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    // Update basic fields
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.last_name !== undefined) user.last_name = dto.last_name;
    if (dto.cel !== undefined) user.cel = dto.cel;

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: dto.email })
        .withDeleted()
        .getOne();

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Este email já está em uso.');
      }
      user.email = dto.email;
    }

    // Validate and update password
    if (dto.password) {
      if (!dto.password_confirmation) {
        throw new BadRequestException(
          'As senhas devem ser iguais para confirmação.',
        );
      }
      if (dto.password !== dto.password_confirmation) {
        throw new BadRequestException('As senhas não coincidem.');
      }
      user.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const savedUser = await this.userRepository.save(user);

      // Return user without password
      const { password, ...userWithoutPassword } = savedUser;
      return userWithoutPassword;
    } catch (error: any) {
      // Catch database unique constraint violations
      if (
        error.code === 'ER_DUP_ENTRY' &&
        error.sqlMessage?.includes('email')
      ) {
        throw new BadRequestException('Este email já está em uso.');
      }
      throw error;
    }
  }
}
