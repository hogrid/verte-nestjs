import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserProfile } from '../database/entities/user.entity';
import { Plan } from '../database/entities/plan.entity';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Payment } from '../database/entities/payment.entity';
import { Setting } from '../database/entities/setting.entity';
import { ListCustomersDto } from './dto/list-customers.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SaveSettingDto } from './dto/save-setting.dto';

/**
 * AdminService
 *
 * Service para funções administrativas
 * Gerenciamento de clientes, dashboard, configurações globais
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  /**
   * Listar todos os clientes (admin only)
   */
  async listCustomers(dto: ListCustomersDto) {
    const page = dto.page || 1;
    const perPage = dto.per_page || 15;
    const skip = (page - 1) * perPage;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plan', 'plan')
      .where('user.deleted_at IS NULL')
      .andWhere('user.profile = :profile', { profile: UserProfile.USER }); // Apenas usuários, não admins

    // Filtros opcionais
    if (dto.search) {
      query.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.cpfCnpj LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.plan_id) {
      query.andWhere('user.plan_id = :plan_id', { plan_id: dto.plan_id });
    }

    if (dto.status) {
      query.andWhere('user.status = :status', { status: dto.status });
    }

    // Ordenação
    query.orderBy('user.created_at', 'DESC');

    // Paginação
    const [data, total] = await query.skip(skip).take(perPage).getManyAndCount();

    return {
      data,
      meta: {
        current_page: page,
        from: skip + 1,
        to: skip + data.length,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Criar novo cliente (admin only)
   */
  async createCustomer(dto: CreateCustomerDto) {
    // Verificar se plano existe
    const plan = await this.planRepository.findOne({
      where: { id: dto.plan_id, deleted_at: IsNull() },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Criar usuário
    const user = this.userRepository.create({
      name: dto.name,
      last_name: dto.last_name || null,
      email: dto.email,
      password: hashedPassword,
      cpfCnpj: dto.cpfCnpj || null,
      cel: dto.cel || null,
      plan_id: dto.plan_id,
      status: UserStatus.ACTIVED,
      profile: UserProfile.USER,
      confirmed_mail: 1,
      active: 1, // Cliente criado pelo admin já está ativo
    });

    const savedUser = await this.userRepository.save(user);

    // Criar instância WhatsApp padrão
    const waNumber = this.numberRepository.create({
      user_id: savedUser.id,
      name: `WhatsApp ${savedUser.name}`,
      instance: `instance_${savedUser.id}_${Date.now()}`,
      status: 1, // Ativo
      status_connection: 0, // Desconectado inicialmente
    });
    await this.numberRepository.save(waNumber);

    // Retornar user com plano
    return this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['plan'],
    });
  }

  /**
   * Detalhes de cliente específico (admin only)
   */
  async getCustomer(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        deleted_at: IsNull(),
      },
      relations: ['plan'],
    });

    if (!user) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return user;
  }

  /**
   * Atualizar dados de cliente (admin only)
   */
  async updateCustomer(userId: number, dto: UpdateCustomerDto) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Atualizar campos fornecidos
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.last_name !== undefined) user.last_name = dto.last_name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.cpfCnpj !== undefined) user.cpfCnpj = dto.cpfCnpj;
    if (dto.cel !== undefined) user.cel = dto.cel;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.active !== undefined) user.active = dto.active;

    // Atualizar senha se fornecida
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    // Atualizar plano se fornecido
    if (dto.plan_id !== undefined) {
      const plan = await this.planRepository.findOne({
        where: { id: dto.plan_id, deleted_at: IsNull() },
      });
      if (!plan) {
        throw new NotFoundException('Plano não encontrado.');
      }
      user.plan_id = dto.plan_id;
    }

    await this.userRepository.save(user);

    // Retornar user atualizado com relações
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['plan'],
    });
  }

  /**
   * Deletar cliente (admin only) - Soft delete
   */
  async deleteCustomer(userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Soft delete
    await this.userRepository.softDelete(userId);

    return {
      success: true,
      message: 'Cliente deletado com sucesso.',
    };
  }

  /**
   * Dashboard indicators (admin only)
   */
  async getDashboardIndicators() {
    // Total de usuários ativos
    const totalUsers = await this.userRepository.count({
      where: {
        deleted_at: IsNull(),
        profile: UserProfile.USER,
        status: UserStatus.ACTIVED,
      },
    });

    // Total de campanhas
    const totalCampaigns = await this.campaignRepository.count({
      where: { deleted_at: IsNull() },
    });

    // Total de contatos
    const totalContacts = await this.contactRepository.count({
      where: { deleted_at: IsNull() },
    });

    // Total de pagamentos realizados
    const totalPayments = await this.paymentRepository.count();

    // Campanhas ativas (status = 0)
    const activeCampaigns = await this.campaignRepository.count({
      where: {
        deleted_at: IsNull(),
        status: 0,
      },
    });

    // Últimos 5 usuários cadastrados
    const recentUsers = await this.userRepository.find({
      where: {
        deleted_at: IsNull(),
        profile: UserProfile.USER,
      },
      order: {
        created_at: 'DESC',
      },
      take: 5,
      relations: ['plan'],
    });

    return {
      indicators: {
        total_users: totalUsers,
        total_campaigns: totalCampaigns,
        total_contacts: totalContacts,
        total_payments: totalPayments,
        active_campaigns: activeCampaigns,
      },
      recent_users: recentUsers,
    };
  }

  /**
   * Listar todas as campanhas do sistema (admin only)
   */
  async getAllCampaigns(page = 1, perPage = 15) {
    const skip = (page - 1) * perPage;

    const [data, total] = await this.campaignRepository.findAndCount({
      where: {
        deleted_at: IsNull(),
      },
      relations: ['user', 'number', 'public'],
      order: {
        created_at: 'DESC',
      },
      skip,
      take: perPage,
    });

    return {
      data,
      meta: {
        current_page: page,
        from: skip + 1,
        to: skip + data.length,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Última atividade dos clientes (admin only)
   */
  async getCustomerLastActivity() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.plan', 'plan')
      .leftJoin('user.campaigns', 'campaign')
      .where('user.deleted_at IS NULL')
      .andWhere('user.profile = :profile', { profile: UserProfile.USER })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.created_at',
        'plan.name',
        'MAX(campaign.created_at) as last_campaign_date',
      ])
      .groupBy('user.id')
      .orderBy('last_campaign_date', 'DESC', 'NULLS LAST')
      .limit(20)
      .getRawMany();

    return users;
  }

  /**
   * Listar histórico de pagamentos (admin only)
   */
  async getPayments(page = 1, perPage = 15) {
    const skip = (page - 1) * perPage;

    const [data, total] = await this.paymentRepository.findAndCount({
      relations: ['user'],
      order: {
        created_at: 'DESC',
      },
      skip,
      take: perPage,
    });

    return {
      data,
      meta: {
        current_page: page,
        from: skip + 1,
        to: skip + data.length,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Listar configurações globais (admin only)
   */
  async getSettings() {
    return this.settingRepository.find({
      order: {
        key: 'ASC',
      },
    });
  }

  /**
   * Salvar configuração global (admin only)
   */
  async saveSetting(dto: SaveSettingDto) {
    // Verificar se configuração já existe
    let setting = await this.settingRepository.findOne({
      where: { key: dto.key },
    });

    if (setting) {
      // Atualizar existente
      setting.value = dto.value;
      setting.type = dto.type;
    } else {
      // Criar nova
      setting = this.settingRepository.create({
        key: dto.key,
        value: dto.value,
        type: dto.type,
      });
    }

    return this.settingRepository.save(setting);
  }
}
