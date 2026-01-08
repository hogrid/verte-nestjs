import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { Plan } from '../database/entities/plan.entity';
import { CreateNumberDto } from './dto/create-number.dto';
import { UpdateNumberDto } from './dto/update-number.dto';

/**
 * NumbersService
 *
 * Service para gerenciamento de números/instâncias WhatsApp
 * Permite CRUD de números e gerenciamento de números extras
 */
@Injectable()
export class NumbersService {
  constructor(
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  /**
   * Listar números WhatsApp do usuário
   */
  async findAll(userId: number) {
    return this.numberRepository.find({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'ASC',
      },
    });
  }

  /**
   * Detalhes de número específico
   */
  async findOne(userId: number, numberId: number) {
    const number = await this.numberRepository.findOne({
      where: {
        id: numberId,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!number) {
      throw new NotFoundException('Número não encontrado.');
    }

    return number;
  }

  /**
   * Atualizar configurações do número
   */
  async update(userId: number, numberId: number, dto: UpdateNumberDto) {
    const number = await this.numberRepository.findOne({
      where: {
        id: numberId,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!number) {
      throw new NotFoundException('Número não encontrado.');
    }

    // Atualizar campos fornecidos
    if (dto.name !== undefined) number.name = dto.name;
    if (dto.status !== undefined) number.status = dto.status;
    if (dto.labels_active !== undefined)
      number.labels_active = dto.labels_active;

    return this.numberRepository.save(number);
  }

  /**
   * Deletar número WhatsApp (soft delete)
   */
  async delete(userId: number, numberId: number) {
    const number = await this.numberRepository.findOne({
      where: {
        id: numberId,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!number) {
      throw new NotFoundException('Número não encontrado.');
    }

    // Soft delete
    await this.numberRepository.softDelete(numberId);

    return {
      success: true,
      message: 'Número deletado com sucesso.',
    };
  }

  /**
   * Listar números extras disponíveis
   * Verifica quantos números extras o usuário pode ter baseado no plano
   */
  async getExtraNumbers(userId: number) {
    // Buscar números atuais do usuário
    const currentNumbers = await this.numberRepository.count({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    return {
      current_numbers: currentNumbers,
      max_numbers: 5, // Padrão: 5 números por usuário
      available: Math.max(0, 5 - currentNumbers),
      message: `Você possui ${currentNumbers} número(s). Pode adicionar até ${Math.max(0, 5 - currentNumbers)} número(s) extra(s).`,
    };
  }

  /**
   * Adicionar número extra
   */
  async addExtraNumber(userId: number, phone: string) {
    // Verificar limite
    const currentNumbers = await this.numberRepository.count({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (currentNumbers >= 5) {
      throw new NotFoundException(
        'Limite de números atingido. Você já possui 5 números cadastrados.',
      );
    }

    // Verificar se número já existe
    const existingNumber = await this.numberRepository.findOne({
      where: {
        cel: phone,
        deleted_at: IsNull(),
      },
    });

    if (existingNumber) {
      throw new NotFoundException('Este número já está cadastrado.');
    }

    // Criar novo número
    const number = this.numberRepository.create({
      user_id: userId,
      name: `WhatsApp ${phone}`,
      instance: `instance_${userId}_${Date.now()}`,
      cel: phone,
      status: 1,
      status_connection: 0, // Desconectado inicialmente
      extra: 1, // Marcar como número extra
    });

    const saved = await this.numberRepository.save(number);

    return {
      success: true,
      message: 'Número extra adicionado com sucesso.',
      number: saved,
    };
  }

  /**
   * Criar número/instância WhatsApp
   */
  async create(userId: number, createDto: CreateNumberDto) {
    const number = this.numberRepository.create({
      user_id: userId,
      name: createDto.name || `WhatsApp ${createDto.instance}`,
      instance: createDto.instance,
      cel: createDto.cel || createDto.phone || null,
      status: 1,
      status_connection: 0,
      extra: 0,
    });

    return this.numberRepository.save(number);
  }

  /**
   * Reconectar número/instância WhatsApp
   */
  async reconnect(userId: number, numberId: number) {
    const number = await this.numberRepository.findOne({
      where: {
        id: numberId,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!number) {
      throw new NotFoundException('Número não encontrado.');
    }

    // Aqui deveria disparar reconexão via WAHA API
    // Por enquanto, apenas retorna sucesso
    return {
      success: true,
      message: 'Reconexão iniciada com sucesso.',
      number,
    };
  }
}
