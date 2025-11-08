import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async updateProfile(userId: number, dto: UpdateUserProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;

    if (dto.password) {
      if (dto.password !== dto.password_confirmation) {
        throw new BadRequestException('As senhas não coincidem.');
      }
      user.password = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepository.save(user);
  }
}
