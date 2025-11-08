import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Contact } from '../database/entities/contact.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Message } from '../database/entities/message.entity';
import { ExportContactsDto } from './dto/export-contacts.dto';
import { ExportCampaignReportDto } from './dto/export-campaign-report.dto';

/**
 * ExportService
 *
 * Service para exportação de dados em CSV/XLSX
 * Gera arquivos para download de contatos e relatórios de campanhas
 */
@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * Exportar contatos para CSV
   * Retorna CSV com UTF-8 BOM para Excel
   */
  async exportContactsCsv(userId: number, dto: ExportContactsDto): Promise<string> {
    const query = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.user_id = :userId', { userId })
      .andWhere('contact.deleted_at IS NULL');

    // Filtros opcionais
    if (dto.contact_ids && dto.contact_ids.length > 0) {
      query.andWhere('contact.id IN (:...ids)', { ids: dto.contact_ids });
    }

    if (dto.label) {
      query.andWhere('contact.labels LIKE :label', { label: `%${dto.label}%` });
    }

    if (dto.status) {
      const statusValue = dto.status === 'active' ? 1 : 0; // 1 = active, 0 = blocked
      query.andWhere('contact.status = :status', { status: statusValue });
    }

    if (dto.search) {
      query.andWhere(
        '(contact.name LIKE :search OR contact.number LIKE :search OR contact.description LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    const contacts = await query.getMany();

    // Gerar CSV com UTF-8 BOM (para Excel reconhecer acentos)
    const BOM = '\uFEFF';
    const header = 'ID,Nome,Telefone,Responsável,Etiquetas,Status,Criado em\n';
    const rows = contacts
      .map((c) => {
        const createdAt = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '';
        const statusText = c.status === 1 ? 'Ativo' : 'Bloqueado';
        const labels = c.labels || '';
        return `${c.id},"${c.name || ''}","${c.number || ''}","${c.cel_owner || ''}","${labels}","${statusText}","${createdAt}"`;
      })
      .join('\n');

    return BOM + header + rows;
  }

  /**
   * Exportar relatório de campanha para CSV
   * Inclui métricas e mensagens enviadas
   */
  async exportCampaignReport(
    userId: number,
    dto: ExportCampaignReportDto,
  ): Promise<string> {
    // Buscar campanha
    const campaign = await this.campaignRepository.findOne({
      where: {
        id: dto.campaign_id,
        user_id: userId,
        deleted_at: IsNull(),
      },
      relations: ['number', 'public'],
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    // Buscar mensagens da campanha
    const messages = await this.messageRepository.find({
      where: {
        campaign_id: campaign.id,
      },
      order: {
        created_at: 'ASC',
      },
    });

    // Gerar CSV com UTF-8 BOM
    const BOM = '\uFEFF';

    // Cabeçalho com informações da campanha
    let csv = `Relatório de Campanha\n`;
    csv += `ID,${campaign.id}\n`;
    csv += `Nome,${campaign.name}\n`;
    csv += `Status,${this.formatCampaignStatus(campaign.status)}\n`;
    csv += `Data de Criação,${new Date(campaign.created_at).toLocaleString('pt-BR')}\n`;
    csv += `Total de Contatos,${campaign.total_contacts || 0}\n`;
    csv += `\n`;

    // Se incluir mensagens no relatório
    if (dto.include_messages !== false && messages.length > 0) {
      csv += `Mensagens Enviadas\n`;
      csv += `ID,Tipo,Conteúdo,Data de Envio\n`;

      messages.forEach((msg) => {
        const content = msg.message || msg.media || '';
        const mediaInfo = msg.media_type ? ` (${msg.media_type})` : '';
        const createdAt = new Date(msg.created_at).toLocaleString('pt-BR');
        csv += `${msg.id},"${msg.type || ''}${mediaInfo}","${this.escapeCsvValue(content)}","${createdAt}"\n`;
      });
    }

    return BOM + csv;
  }

  /**
   * Formatar status da campanha para exibição
   */
  private formatCampaignStatus(status: number | null): string {
    if (status === null) return 'Desconhecido';
    const statusMap: Record<number, string> = {
      0: 'Ativa',
      1: 'Pausada',
      2: 'Cancelada',
      3: 'Agendada',
    };
    return statusMap[status] || 'Desconhecido';
  }

  /**
   * Escapar valores CSV (aspas duplas)
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    return value.replace(/"/g, '""'); // Duplicar aspas para escapar
  }
}
