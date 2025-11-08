import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { User } from '../database/entities/user.entity';

/**
 * DashboardService
 *
 * Service para dados do dashboard do usuário
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
  ) {}

  /**
   * Dados principais do dashboard
   */
  async getDashboard(userId: number) {
    const totalCampaigns = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    const totalContacts = await this.contactRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    const activeCampaigns = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull(), status: 0 },
    });

    const connectedNumbers = await this.numberRepository.count({
      where: { user_id: userId, deleted_at: IsNull(), status_connection: 1 },
    });

    return {
      total_campaigns: totalCampaigns,
      total_contacts: totalContacts,
      active_campaigns: activeCampaigns,
      connected_numbers: connectedNumbers,
    };
  }

  /**
   * Dados completos do dashboard com detalhes
   */
  async getDashboardData(userId: number) {
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
