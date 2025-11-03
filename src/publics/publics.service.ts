import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../database/entities/public.entity';
import { Contact } from '../database/entities/contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import { Number } from '../database/entities/number.entity';
import { ListPublicsDto } from './dto/list-publics.dto';
import { UpdatePublicDto } from './dto/update-public.dto';
import { DuplicatePublicDto } from './dto/duplicate-public.dto';
import { GetRandomContactDto } from './dto/get-random-contact.dto';

@Injectable()
export class PublicsService {
  constructor(
    @InjectRepository(Public)
    private publicRepository: Repository<Public>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(PublicByContact)
    private publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Number)
    private numberRepository: Repository<Number>,
  ) {}

  /**
   * Helper to format WhatsApp numbers
   * Removes spaces, hyphens, parentheses, and plus sign
   * Adds country code 55 if not present
   */
  private formatNumber(number: string): string {
    if (!number) return '';

    // Remove espaços, hífens, parênteses e o sinal de mais
    let numberData = number.replace(/[\s\-()+ ]/g, '');

    // Verificar se o número já possui 12 ou 13 caracteres
    if (numberData.length === 12 || numberData.length === 13) {
      return numberData;
    }

    // Adicionar o código do país "55" se não estiver presente
    if (!numberData.startsWith('55')) {
      if (numberData[0] === '0') {
        numberData = numberData.substring(1);
      }
      numberData = '55' + numberData;
    }

    return numberData;
  }

  /**
   * List all publics for the authenticated user with aggregations
   * Includes counts for contacts, blocked contacts, sent messages, etc.
   */
  async findAll(userId: number, dto: ListPublicsDto) {
    const perPage = 20;
    const page = dto.page || 1;

    // Get active number or number by numberId
    let numberActive: Number | null;

    if (dto.numberId) {
      numberActive = await this.numberRepository.findOne({
        where: {
          user_id: userId,
          id: parseInt(dto.numberId),
        },
      });

      if (!numberActive) {
        throw new NotFoundException('Instância WhatsApp não encontrada.');
      }
    } else {
      numberActive = await this.numberRepository.findOne({
        where: {
          user_id: userId,
          status: 1,
        },
      });
    }

    // Build query with complex aggregations
    const queryBuilder = this.publicRepository
      .createQueryBuilder('publics')
      .select([
        'publics.id',
        'publics.name',
        'publics.photo',
        'publics.status',
        'publics.from_chat',
      ])
      // Count of contacts
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(DISTINCT contacts.number)', 'count')
          .from(Contact, 'contacts')
          .where('contacts.public_id = publics.id')
          .andWhere('contacts.deleted_at IS NULL');
      }, 'contacts_count')
      // Count of blocked contacts
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(DISTINCT pbc.id)', 'count')
          .from(PublicByContact, 'pbc')
          .where('pbc.public_id = publics.id')
          .andWhere('pbc.is_blocked = 1')
          .andWhere('pbc.deleted_at IS NULL');
      }, 'blocked_count')
      // Count of not blocked and sent
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(DISTINCT pbc.id)', 'count')
          .from(PublicByContact, 'pbc')
          .where('pbc.public_id = publics.id')
          .andWhere('pbc.is_blocked = 0')
          .andWhere('pbc.send = 1')
          .andWhere('pbc.deleted_at IS NULL');
      }, 'not_blocked_and_sent_count')
      // Latest sent date
      .addSelect((subQuery) => {
        return subQuery
          .select('MAX(pbc.created_at)', 'max_date')
          .from(PublicByContact, 'pbc')
          .where('pbc.public_id = publics.id')
          .andWhere('pbc.is_blocked = 0')
          .andWhere('pbc.send = 1')
          .andWhere('pbc.deleted_at IS NULL');
      }, 'latest_not_blocked_and_sent_date')
      .where('publics.user_id = :userId', { userId })
      .groupBy('publics.id')
      .addGroupBy('publics.name')
      .addGroupBy('publics.photo')
      .addGroupBy('publics.status')
      .addGroupBy('publics.from_chat');

    // Filter by number if active number exists
    if (numberActive && numberActive.cel) {
      const cel = this.formatNumber(numberActive.cel);
      const celWithoutStart55 = cel.startsWith('55')
        ? cel.substring(2)
        : cel;

      queryBuilder.andWhere(
        '(publics.number LIKE :cel OR publics.number LIKE :celWithout55 OR publics.number LIKE :originalCel OR publics.number IS NULL)',
        {
          cel: `%${cel}%`,
          celWithout55: `%${celWithoutStart55}%`,
          originalCel: `%${numberActive.cel}%`,
        },
      );
    }

    // Search filter
    if (dto.search) {
      queryBuilder.andWhere('publics.name LIKE :search', {
        search: `%${dto.search}%`,
      });
    }

    const result = await queryBuilder
      .orderBy('publics.id', 'DESC')
      .getRawMany();

    // Laravel compatibility: add meta pagination
    return {
      data: result,
      meta: {
        current_page: page,
        from: (page - 1) * perPage + 1,
        to: page * perPage,
        per_page: perPage,
        total: result.length,
        last_page: Math.ceil(result.length / perPage),
      },
    };
  }

  /**
   * Update a public
   * If status is set to 1, all other publics for this user become inactive
   */
  async update(
    userId: number,
    publicId: number,
    dto: UpdatePublicDto,
    photoPath?: string,
  ) {
    const public_ = await this.publicRepository.findOne({
      where: { id: publicId, user_id: userId },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    // If setting this public as active, deactivate all others
    if (dto.status === 1) {
      await this.publicRepository.update(
        { user_id: userId },
        { status: 0 },
      );
    }

    // Update with DTO data
    const updateData: any = { ...dto };

    // Add photo path if provided
    if (photoPath) {
      updateData.photo = photoPath;
    }

    await this.publicRepository.update(publicId, updateData);

    // Return updated public
    return this.publicRepository.findOne({ where: { id: publicId } });
  }

  /**
   * Generate CSV file with all contacts from a public
   * Returns CSV content as string
   */
  async downloadContacts(userId: number, publicId: number): Promise<string> {
    const public_ = await this.publicRepository.findOne({
      where: { id: publicId, user_id: userId },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    const contacts = await this.contactRepository.find({
      where: { public_id: publicId },
    });

    // CSV header
    let csv = 'Celular;Nome;Variável 1;Variável 2;Variável 3\n';

    // Add contact rows
    for (const contact of contacts) {
      const name = (contact.name || '').replace(/[^\w\s\-'\.]/gu, '');
      csv += `${contact.number};"${name}";${contact.variable_1 || ''};${contact.variable_2 || ''};${contact.variable_3 || ''}\n`;
    }

    // Add UTF-8 BOM
    csv = '\uFEFF' + csv;

    return csv;
  }

  /**
   * Duplicate a public and all its contacts
   * New public will have ' Cópia' appended to name and status 0
   */
  async duplicate(userId: number, dto: DuplicatePublicDto) {
    const public_ = await this.publicRepository.findOne({
      where: { id: dto.id },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    if (public_.user_id !== userId) {
      throw new ForbiddenException('Você não tem permissão para duplicar este público.');
    }

    // Get all contacts from original public
    const contacts = await this.contactRepository.find({
      where: { public_id: public_.id },
    });

    // Create new public
    const newPublic = this.publicRepository.create({
      user_id: public_.user_id,
      name: public_.name + ' Cópia',
      photo: public_.photo,
      status: 0,
      from_chat: public_.from_chat,
      from_tag: public_.from_tag,
      number_id: public_.number_id,
      labels: public_.labels,
      number: public_.number,
    });

    await this.publicRepository.save(newPublic);

    // Duplicate all contacts
    for (const contact of contacts) {
      const newContact = this.contactRepository.create({
        user_id: contact.user_id,
        public_id: newPublic.id,
        name: contact.name,
        number: contact.number,
        description: contact.description,
        variable_1: contact.variable_1,
        variable_2: contact.variable_2,
        variable_3: contact.variable_3,
        type: contact.type,
      });

      await this.contactRepository.save(newContact);
    }

    return newPublic;
  }

  /**
   * Soft delete a public
   */
  async remove(userId: number, publicId: number) {
    const public_ = await this.publicRepository.findOne({
      where: { id: publicId, user_id: userId },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    await this.publicRepository.softDelete(publicId);

    return null;
  }

  /**
   * Get a random contact from a public
   * Contact must have a name (not starting with +) and at least one variable
   */
  async getRandomContact(userId: number, dto: GetRandomContactDto) {
    const public_ = await this.publicRepository.findOne({
      where: { id: dto.id, user_id: userId },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.public_id = :publicId', { publicId: public_.id })
      .andWhere('contact.name IS NOT NULL')
      .andWhere('contact.name NOT LIKE :plusSign', { plusSign: '+%' })
      .andWhere(
        '(contact.variable_1 IS NOT NULL OR contact.variable_2 IS NOT NULL OR contact.variable_3 IS NOT NULL)',
      )
      .orderBy('RAND()') // MySQL random
      .limit(1);

    const contact = await queryBuilder.getOne();

    return contact;
  }
}
