import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import { QUEUE_NAMES } from '../../config/redis.config';
import { CustomPublic } from '../../database/entities/custom-public.entity';
import { PublicByContact } from '../../database/entities/public-by-contact.entity';
import { Contact } from '../../database/entities/contact.entity';
import { Public } from '../../database/entities/public.entity';
import { getErrorStack } from '../queue.helpers';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

interface CustomPublicJobData {
  customPublicId: number;
  userId: number;
  campaignId: number;
  filePath: string;
  numberNumber: string;
}

/**
 * CustomPublicProcessor
 *
 * Processa públicos customizados (upload XLSX) de forma assíncrona.
 *
 * Fluxo:
 * 1. Busca o CustomPublic
 * 2. Lê arquivo XLSX
 * 3. Valida e formata números de telefone
 * 4. Cria/atualiza contatos no banco
 * 5. Cria Public no banco
 * 6. Cria PublicByContact para cada contato
 * 7. Atualiza CustomPublic com public_id
 * 8. Atualiza Campaign com public_id e total_contacts
 * 9. Remove arquivo temporário
 *
 * Formato XLSX esperado:
 * - Coluna 1: Nome (opcional)
 * - Coluna 2: Telefone (obrigatório)
 *
 * Compatibilidade: Laravel CustomPublicJob (app/Jobs/CustomPublicJob.php)
 */
@Processor(QUEUE_NAMES.CUSTOM_PUBLIC)
export class CustomPublicProcessor {
  private readonly logger = new Logger(CustomPublicProcessor.name);

  constructor(
    @InjectRepository(CustomPublic)
    private readonly customPublicRepository: Repository<CustomPublic>,
    @InjectRepository(Public)
    private readonly publicRepository: Repository<Public>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Process custom public creation from XLSX
   */
  @Process('process-custom-public')
  async handleProcessCustomPublic(job: Job<CustomPublicJobData>) {
    const { customPublicId, userId, campaignId, filePath, numberNumber } =
      job.data;

    this.logger.log(
      `🚀 Processando público customizado #${customPublicId} (arquivo: ${filePath})`,
    );

    try {
      // 1. Buscar CustomPublic
      const customPublic = await this.customPublicRepository.findOne({
        where: { id: customPublicId },
      });

      if (!customPublic) {
        this.logger.error(`❌ CustomPublic #${customPublicId} não encontrado`);
        return;
      }

      // 2. Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        this.logger.error(`❌ Arquivo não encontrado: ${filePath}`);
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // 3. Ler arquivo XLSX
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown as any[][]; // rows as arrays when header: 1

      this.logger.log(`📄 Arquivo XLSX lido: ${data.length} linhas`);

      // 4. Processar linhas e criar/atualizar contatos
      const contacts: Contact[] = [];
      const phonesSeen = new Set<string>();

      for (let i = 0; i < data.length; i++) {
        const row = data[i] ?? [];

        // Pular linhas vazias
        if (!row || row.length === 0) {
          continue;
        }

        // Pular header (primeira linha)
        if (
          i === 0 &&
          (row[0] === 'Nome' || row[0] === 'name' || row[0] === 'Telefone')
        ) {
          continue;
        }

        const name = row[0] ? String(row[0] as string).trim() : '';
        const phoneRaw = row[1]
          ? String(row[1] as string).trim()
          : row[0]
            ? String(row[0] as string).trim()
            : '';

        if (!phoneRaw) {
          this.logger.warn(`⚠️ Linha ${i + 1}: Telefone vazio, pulando`);
          continue;
        }

        // Formatar número WhatsApp (remover caracteres especiais)
        const phone = this.formatWhatsAppNumber(phoneRaw, numberNumber);

        // Evitar duplicatas no mesmo arquivo
        if (phonesSeen.has(phone)) {
          this.logger.warn(
            `⚠️ Linha ${i + 1}: Telefone ${phone} duplicado no arquivo, pulando`,
          );
          continue;
        }
        phonesSeen.add(phone);

        // Verificar se contato já existe (usando campo 'number' ao invés de 'phone')
        let contact = await this.contactRepository.findOne({
          where: { user_id: userId, number: phone },
        });

        if (!contact) {
          // Criar novo contato
          contact = this.contactRepository.create({
            user_id: userId,
            name: name || phone,
            number: phone, // Campo correto é 'number'
            status: 1, // Ativo
          });

          contact = await this.contactRepository.save(contact);
          this.logger.log(`✅ Contato criado: ${contact.name} (${phone})`);
        } else {
          this.logger.log(
            `♻️ Contato já existe: ${contact.name || 'Sem nome'} (${phone})`,
          );
        }

        contacts.push(contact);
      }

      this.logger.log(`📋 Processados ${contacts.length} contatos do XLSX`);

      if (contacts.length === 0) {
        this.logger.warn(`⚠️ Nenhum contato válido encontrado no arquivo`);
        // Ainda assim criar o público, mas vazio
      }

      // 5. Criar Public
      const publicData = this.publicRepository.create({
        user_id: userId,
        name: `Público Customizado - Campanha #${campaignId}`,
        status: 1,
      });

      const savedPublic = await this.publicRepository.save(publicData);

      this.logger.log(`✅ Public #${savedPublic.id} criado`);

      // 6. Criar PublicByContact para cada contato
      const publicByContactsData = contacts.map((contact) => {
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

        this.logger.log(
          `✅ Criados ${publicByContactsData.length} registros em PublicByContact`,
        );
      }

      // 7. Atualizar CustomPublic status (public_id não existe na entity)
      await this.customPublicRepository.update(customPublicId, {
        status: 1, // Processado
      });

      // 8. Remover arquivo temporário
      try {
        fs.unlinkSync(filePath);
        this.logger.log(`🗑️ Arquivo temporário removido: ${filePath}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `⚠️ Erro ao remover arquivo temporário: ${errorMessage}`,
        );
      }

      // 9. Retornar dados para o callback
      return {
        publicId: savedPublic.id,
        totalContacts: contacts.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Erro ao processar público customizado #${customPublicId}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Format WhatsApp number
   * Remove caracteres especiais e adiciona código do país se necessário
   */
  private formatWhatsAppNumber(phoneRaw: string, countryCode: string): string {
    // Remover caracteres especiais
    let phone = phoneRaw.replace(/[^\d]/g, '');

    // Se não tem código do país, adicionar (exemplo: Brasil = 55)
    if (!phone.startsWith(countryCode)) {
      phone = countryCode + phone;
    }

    // Adicionar @s.whatsapp.net se necessário (formato WAHA)
    if (!phone.includes('@')) {
      phone = phone + '@s.whatsapp.net';
    }

    return phone;
  }
}
