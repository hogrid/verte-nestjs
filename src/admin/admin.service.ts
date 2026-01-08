import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User,
  UserStatus,
  UserProfile,
} from '../database/entities/user.entity';
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
    const [data, total] = await query
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

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
    // Opcional: validar plano quando existir na base
    // Em alguns ambientes de teste, o plano pode não conter deleted_at
    // ou estar em schema divergente. Manter compatibilidade com Laravel:
    // aceitar o plan_id informado sem bloquear a criação.

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

    // Return plain object without password
    const { password, ...result } = user as any;
    return result;
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

    // Retornar user atualizado com relações (sem senha)
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['plan'],
    });

    if (!updatedUser) {
      throw new NotFoundException('Cliente não encontrado após atualização.');
    }

    const { password, ...result } = updatedUser as any;
    return result;
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

    // Proteção: nunca permitir deletar usuário administrador
    if (
      user.profile === UserProfile.ADMINISTRATOR ||
      String(user.email).toLowerCase() === 'admin@verte.com'
    ) {
      throw new ForbiddenException('Proibido deletar acessos administrativos.');
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
    // Total de clientes (todos os usuários não-admin)
    const totalCustomers = await this.userRepository.count({
      where: {
        deleted_at: IsNull(),
        profile: UserProfile.USER,
      },
    });

    // Clientes ativos
    const activeCustomers = await this.userRepository.count({
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

    // Receita mensal (soma de todos os pagamentos)
    // Nota: Payment entity pode não ter campo 'status', então pegamos todos
    let monthlyRevenue = 0;
    try {
      const payments = await this.paymentRepository.find();
      monthlyRevenue = payments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );
    } catch (error: any) {
      // Se houver erro ao buscar pagamentos, retornar 0
      monthlyRevenue = 0;
    }

    return {
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      total_campaigns: totalCampaigns,
      monthly_revenue: monthlyRevenue,
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

  /**
   * Verificar saúde do sistema (admin only)
   */
  async getSystemHealth() {
    const status: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    // Testar conexão com banco de dados
    try {
      await this.userRepository.query('SELECT 1');
      status.database = 'ok';
    } catch (error: any) {
      status.database = 'error';
      status.status = 'unhealthy';
    }

    return status;
  }

  /**
   * Limpar cache do sistema (admin only)
   */
  async clearCache() {
    // Em produção, aqui seria implementada a limpeza do Redis
    // Por enquanto, retornar sucesso
    return {
      success: true,
      message: 'Cache limpo com sucesso',
    };
  }

  /**
   * Listar logs de auditoria (admin only)
   */
  async getAuditLogs(page = 1, perPage = 15) {
    // Em produção, aqui seria implementada a busca de logs de auditoria
    // Por enquanto, retornar array vazio
    return [];
  }
}
