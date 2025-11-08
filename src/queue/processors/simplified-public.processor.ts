import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../../config/redis.config';
import { SimplifiedPublic } from '../../database/entities/simplified-public.entity';
import { PublicByContact } from '../../database/entities/public-by-contact.entity';
import { Contact } from '../../database/entities/contact.entity';
import { Public } from '../../database/entities/public.entity';
import { getErrorStack } from '../queue.helpers';

interface SimplifiedPublicJobData {
  simplifiedPublicId: number;
  userId: number;
  campaignId: number;
  numberNumber: string;
}

/**
 * SimplifiedPublicProcessor
 *
 * Processa públicos simplificados de forma assíncrona.
 *
 * Fluxo:
 * 1. Busca o SimplifiedPublic
 * 2. Filtra contatos baseado nos critérios
 * 3. Cria Public no banco
 * 4. Cria PublicByContact para cada contato filtrado
 * 5. Atualiza Campaign com public_id e total_contacts
 *
 * Compatibilidade: Laravel SimplifiedPublicJob (app/Jobs/SimplifiedPublicJob.php)
 *
 * NOTA: SimplifiedPublic entity pode não ter todos os campos (gender, age, etc)
 * Implementação simplificada busca todos contatos ativos do usuário.
 */
@Processor(QUEUE_NAMES.SIMPLIFIED_PUBLIC)
export class SimplifiedPublicProcessor {
  private readonly logger = new Logger(SimplifiedPublicProcessor.name);

  constructor(
    @InjectRepository(SimplifiedPublic)
    private readonly simplifiedPublicRepository: Repository<SimplifiedPublic>,
    @InjectRepository(Public)
    private readonly publicRepository: Repository<Public>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Process simplified public creation
   */
  @Process('process-simplified-public')
  async handleProcessSimplifiedPublic(job: Job<SimplifiedPublicJobData>) {
    const { simplifiedPublicId, userId, campaignId, numberNumber } = job.data;

    this.logger.log(`🚀 Processando público simplificado #${simplifiedPublicId}`);

    try {
      // 1. Buscar SimplifiedPublic
      const simplifiedPublic = await this.simplifiedPublicRepository.findOne({
        where: { id: simplifiedPublicId },
      });

      if (!simplifiedPublic) {
        this.logger.error(`❌ SimplifiedPublic #${simplifiedPublicId} não encontrado`);
        return;
      }

      // 2. Construir query de filtros
      const queryBuilder = this.contactRepository
        .createQueryBuilder('contact')
        .where('contact.user_id = :userId', { userId })
        .andWhere('contact.status = :status', { status: 1 }); // status 1 = ativo

      // Filtro por label (se houver)
      if (simplifiedPublic.label) {
        queryBuilder.andWhere('contact.labels LIKE :label', {
          label: `%${simplifiedPublic.label}%`,
        });
      }

      // 3. Buscar contatos filtrados
      const filteredContacts = await queryBuilder.getMany();

      this.logger.log(`📋 Encontrados ${filteredContacts.length} contatos para o público simplificado`);

      if (filteredContacts.length === 0) {
        this.logger.warn(`⚠️ Nenhum contato encontrado com os filtros especificados`);
        // Ainda assim criar o público, mas vazio
      }

      // 4. Criar Public
      const publicData = this.publicRepository.create({
        user_id: userId,
        name: `Público Simplificado - Campanha #${campaignId}`,
        status: 1,
      });

      const savedPublic = await this.publicRepository.save(publicData);

      this.logger.log(`✅ Public #${savedPublic.id} criado`);

      // 5. Criar PublicByContact para cada contato
      const publicByContactsData = filteredContacts.map((contact) => {
        return this.publicByContactRepository.create({
          user_id: userId,
          public_id: savedPublic.id,
          campaign_id: campaignId,
          contact_id: contact.id,
          is_blocked: 0,
          read: 0,
          send: 0,
          not_receive: 0,
          interactions: 0,
          has_error: 0,
        });
      });

      if (publicByContactsData.length > 0) {
        // Insert em batch (mais eficiente)
        await this.publicByContactRepository
          .createQueryBuilder()
          .insert()
          .into(PublicByContact)
          .values(publicByContactsData)
          .execute();

        this.logger.log(`✅ Criados ${publicByContactsData.length} registros em PublicByContact`);
      }

      // 6. Retornar dados para o callback
      return {
        publicId: savedPublic.id,
        totalContacts: filteredContacts.length,
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao processar público simplificado #${simplifiedPublicId}`, getErrorStack(error));
      throw error;
    }
  }
}
