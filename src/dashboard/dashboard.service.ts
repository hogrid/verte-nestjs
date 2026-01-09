import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { User } from '../database/entities/user.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/**
 * DashboardService
 *
 * Service para dados do dashboard do usuário
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Dados principais do dashboard
   */
  async getDashboard(userId: number) {
    const totalCampaigns = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    // Buscar número WhatsApp ativo do usuário para filtrar contatos
    const numberActive = await this.numberRepository.findOne({
      where: { user_id: userId, status: 1, deleted_at: IsNull() },
    });

    // Contar contatos únicos filtrados por número ativo e cel_owner (usando DISTINCT igual à página de contatos)
    let totalContacts = 0;
    if (numberActive) {
      // Normalizar o número (remover caracteres não numéricos)
      const normalizedCel = numberActive.cel?.replace(/\D/g, '');

      const result = await this.contactRepository
        .createQueryBuilder('contacts')
        .where('contacts.number_id = :numberId', { numberId: numberActive.id })
        .andWhere('contacts.cel_owner = :celOwner', { celOwner: normalizedCel })
        .andWhere('contacts.user_id = :userId', { userId })
        .select('COUNT(DISTINCT contacts.number)', 'count')
        .getRawOne();

      totalContacts = parseInt(result?.count || '0', 10);
    }

    const activeCampaigns = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull(), status: 0 },
    });

    const whatsappInstances = await this.numberRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    const connectedInstances = await this.numberRepository.count({
      where: { user_id: userId, deleted_at: IsNull(), status_connection: 1 },
    });

    // Count total messages sent (sum of total_sent counts from campaigns)
    const campaigns = await this.campaignRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      select: ['total_sent'],
    });
    const totalMessagesSent = campaigns.reduce(
      (sum, campaign) => sum + (campaign.total_sent || 0),
      0,
    );

    // Get latest campaign without relations to avoid circular dependency issues
    const campaign = await this.campaignRepository.findOne({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });

    // If campaign exists, manually fetch related data
    let campaignWithRelations = null;
    if (campaign) {
      // Get public data separately
      const publicData = campaign.public_id
        ? await this.campaignRepository
            .createQueryBuilder('c')
            .relation('public')
            .of(campaign)
            .loadOne()
            .catch(() => null)
        : null;

      // Get messages separately
      const messages = await this.campaignRepository
        .createQueryBuilder('c')
        .relation('messages')
        .of(campaign)
        .loadMany()
        .catch(() => []);

      campaignWithRelations = {
        ...campaign,
        public: publicData,
        messages,
      };
    }

    return {
      total_contacts: totalContacts,
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      total_messages_sent: totalMessagesSent,
      whatsapp_instances: whatsappInstances,
      connected_instances: connectedInstances,
      campaign: campaignWithRelations,
    };
  }

  /**
   * Atividade recente do usuário
   */
  async getRecentActivity(userId: number, limit?: number) {
    const take = limit || 10;

    const recentCampaigns = await this.campaignRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      take,
    });

    const recentContacts = await this.contactRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      take,
    });

    // For recent messages, we'll return an empty array for now
    // In production, this would query from a messages/logs table
    const recentMessages: any[] = [];

    return {
      recent_campaigns: recentCampaigns,
      recent_contacts: recentContacts,
      recent_messages: recentMessages,
    };
  }

  /**
   * Dados completos do dashboard com detalhes
   */
  async getDashboardData(userId: number) {
    // Sync connection status for user active number
    try {
      await this.whatsappService.checkConnection(userId).catch(() => null);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to sync connection status on dashboard load: ${errMsg}`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['plan'],
    });

    const campaigns = await this.campaignRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      take: 5,
    });

    const contacts = await this.contactRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      take: 5,
    });

    const numbers = await this.numberRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    const stats = await this.getDashboard(userId);

    return {
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        plan: user?.plan?.name || 'Sem plano',
      },
      stats,
      recent_campaigns: campaigns,
      recent_contacts: contacts,
      numbers,
    };
  }
}
