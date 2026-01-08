import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserStatus,
  UserProfile,
} from '../database/entities/user.entity';
import { Number } from '../database/entities/number.entity';
import { Configuration } from '../database/entities/configuration.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { SaveConfigurationDto } from './dto/save-configuration.dto';
import * as bcrypt from 'bcryptjs';

/**
 * Users Service
 * Core business logic for user/customer management
 * Compatible with Laravel UserController
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,
  ) {}

  /**
   * List all customers (non-deleted users)
   * Compatible with Laravel UserController@index
   * Admin only endpoint
   * Filters out soft-deleted users
   */
  async findAllCustomers(search?: string, order: 'asc' | 'desc' = 'asc') {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plan', 'plan')
      .leftJoinAndSelect('user.numbers', 'numbers')
      .leftJoinAndSelect('user.configuration', 'configuration');

    // Filter out soft-deleted users
    query.where('user.deleted_at IS NULL');

    // Search by name or email
    if (search) {
      query.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Order by id
    query.orderBy('user.id', order.toUpperCase() as 'ASC' | 'DESC');

    const data = await query.getMany();

    // Laravel response structure with meta
    return {
      meta: {
        current_page: 0,
        from: 0,
        to: 0,
        per_page: 0,
        total: 0,
        last_page: 0,
      },
      data,
    };
  }

  /**
   * Create new customer/user (admin only)
   * Compatible with Laravel UserController@store
   * Similar to register but for admin creating users
   */
  async createCustomer(createCustomerDto: CreateCustomerDto) {
    const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);
    const now = new Date();

    const user = this.userRepository.create({
      name: createCustomerDto.name,
      last_name: createCustomerDto.last_name,
      email: createCustomerDto.email,
      cpfCnpj: createCustomerDto.cpfCnpj,
      cel: createCustomerDto.cel,
      status: UserStatus.ACTIVED,
      confirmed_mail: 1,
      password: hashedPassword,
      profile: createCustomerDto.profile || UserProfile.USER,
      plan_id: createCustomerDto.plan_id || null,
      active: 0,
      created_at: now,
      updated_at: now,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate instance name based on phone number
    const cleanPhone = createCustomerDto.cel.replace(/\D/g, '');
    let instanceName = `RECUPERANOME_${savedUser.id}`;

    if (cleanPhone.length >= 11) {
      const phoneDigits =
        cleanPhone.startsWith('55') && cleanPhone.length >= 13
          ? cleanPhone.substring(2, 13)
          : cleanPhone.substring(0, 11);

      instanceName = `WPP_${phoneDigits}_${savedUser.id}`;
    }

    // Create default number for user (WhatsApp instance)
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
      message: 'Cliente criado com sucesso',
      data: savedUser,
    };
  }

  /**
   * Find a single customer by ID (admin only)
   * Compatible with Laravel UserController@show
   * Only returns non-deleted users (deleted_at IS NULL)
   * Includes relationships: plan, numbers, config
   *
   * @throws NotFoundException if user not found or deleted
   */
  async findCustomerById(id: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plan', 'plan')
      .leftJoinAndSelect('user.numbers', 'numbers')
      .leftJoinAndSelect('user.configuration', 'configuration')
      .where('user.id = :id', { id })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    // Laravel response structure with data wrapper
    return {
      data: user,
    };
  }

  /**
   * Update an existing customer (admin only)
   * Compatible with Laravel UserController@update
   * Requires admin authentication
   * Supports partial updates (only fields provided will be updated)
   *
   * @throws NotFoundException if user not found
   */
  async updateCustomer(id: number, updateCustomerDto: UpdateCustomerDto) {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    // Filter out undefined values to support partial updates
    // Only update fields that were actually provided in the DTO
    const updateData: Record<string, any> = {};
    Object.keys(updateCustomerDto).forEach((key) => {
      const value = updateCustomerDto[key as keyof UpdateCustomerDto];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Update user with new values
    const now = new Date();
    Object.assign(user, {
      ...updateData,
      updated_at: now,
    });

    const updatedUser = await this.userRepository.save(user);

    // Laravel response structure with data wrapper
    return {
      data: updatedUser,
    };
  }

  /**
   * Delete a customer (admin only)
   * Compatible with Laravel UserController@destroy
   * Performs soft delete (sets deleted_at timestamp)
   *
   * @throws NotFoundException if user not found or already deleted
   */
  async deleteCustomer(id: number): Promise<void> {
    // Check if customer exists and is not already soft-deleted
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user || user.deleted_at !== null) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    // Soft delete: set deleted_at timestamp
    user.deleted_at = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Find user profile (authenticated user viewing own profile)
   * Compatible with Laravel UserController@show (user context)
   * Returns user with relationships: plan, numbers, config
   *
   * @throws NotFoundException if user not found or deleted
   */
  async findUserProfile(id: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plan', 'plan')
      .leftJoinAndSelect('user.numbers', 'numbers')
      .leftJoinAndSelect('user.configuration', 'configuration')
      .where('user.id = :id', { id })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Laravel response structure with data wrapper
    return {
      data: user,
    };
  }

  /**
   * Update user profile (authenticated user updating own profile)
   * Compatible with Laravel UserController@update (user context)
   * User can only update basic profile information
   * Cannot change: profile, plan_id, cpfCnpj, status, etc.
   *
   * @throws NotFoundException if user not found
   */
  async updateUserProfile(id: number, updateDto: UpdateUserProfileDto) {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Filter out undefined values and password_confirmation
    const updateData: Record<string, any> = {};
    Object.keys(updateDto).forEach((key) => {
      // Skip password_confirmation as it's only for validation
      if (key === 'password_confirmation') {
        return;
      }

      const value = updateDto[key as keyof UpdateUserProfileDto];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Hash password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Update user with new values
    const now = new Date();
    Object.assign(user, {
      ...updateData,
      updated_at: now,
    });

    const updatedUser = await this.userRepository.save(user);

    // Laravel response structure with data wrapper
    return {
      data: updatedUser,
    };
  }

  /**
   * Save user configuration (authenticated user)
   * Compatible with Laravel UserController@saveConfiguration
   * Creates or updates configuration for the authenticated user
   *
   * @throws NotFoundException if user not found
   */
  async saveConfiguration(userId: number, saveDto: SaveConfigurationDto) {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Check if configuration already exists
    const configuration = await this.configurationRepository.findOne({
      where: { user_id: userId },
    });

    const now = new Date();

    if (configuration) {
      // Update existing configuration
      if (saveDto.timer_delay !== undefined) {
        configuration.timer_delay = saveDto.timer_delay;
      }
      configuration.updated_at = now;

      const updatedConfig =
        await this.configurationRepository.save(configuration);

      return {
        message: 'Configurações atualizadas com sucesso',
        data: updatedConfig,
      };
    } else {
      // Create new configuration
      const newConfiguration = this.configurationRepository.create({
        user_id: userId,
        timer_delay: saveDto.timer_delay ?? 30, // Default value
        created_at: now,
        updated_at: now,
      });

      const savedConfig =
        await this.configurationRepository.save(newConfiguration);

      return {
        message: 'Configurações salvas com sucesso',
        data: savedConfig,
      };
    }
  }
}
