import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../database/entities/label.entity';
import { Number } from '../database/entities/number.entity';
import { CreateLabelDto } from './dto/create-label.dto';

/**
 * Labels Service
 * Business logic for label management
 *
 * Laravel compatibility:
 * - Same database schema
 * - Same validation rules
 * - Portuguese error messages
 */
@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label)
    private labelRepository: Repository<Label>,

    @InjectRepository(Number)
    private numberRepository: Repository<Number>,
  ) {}

  /**
   * List all labels for authenticated user
   * GET /api/v1/labels
   *
   * Laravel: LabelController@index
   * Note: Laravel integrates with WAHA/WhatsApp API
   * For now, we return labels from database
   * WhatsApp integration will be added later
   */
  async findAll(userId: number, numberId?: number): Promise<Label[]> {
    // Find active WhatsApp number
    let numberActive: Number | null;

    if (numberId) {
      numberActive = await this.numberRepository.findOne({
        where: { user_id: userId, id: numberId },
      });
    } else {
      numberActive = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });
    }

    if (!numberActive) {
      throw new NotFoundException(
        'Nenhum número WhatsApp ativo encontrado para este usuário.',
      );
    }

    // Get labels from database
    const labels = await this.labelRepository.find({
      where: {
        user_id: userId,
        number_id: numberActive.id,
      },
      order: {
        created_at: 'DESC',
      },
    });

    return labels;
  }

  /**
   * Create new label
   * POST /api/v1/labels
   *
   * Laravel: LabelController@store
   */
  async create(userId: number, createLabelDto: CreateLabelDto): Promise<Label> {
    // Verify number belongs to user
    const number = await this.numberRepository.findOne({
      where: {
        id: createLabelDto.number_id,
        user_id: userId,
      },
    });

    if (!number) {
      throw new BadRequestException(
        'O número informado não pertence ao usuário.',
      );
    }

    // Create label
    const label = this.labelRepository.create({
      user_id: userId,
      number_id: createLabelDto.number_id,
      name: createLabelDto.name,
    });

    return await this.labelRepository.save(label);

    // TODO: Add LogService integration
    // log.create("Cadastrou a etiqueta #$label->id $label->name");
  }

  /**
   * Delete label (soft delete)
   * DELETE /api/v1/labels/{id}
   *
   * Laravel: LabelController@destroy
   */
  async remove(userId: number, labelId: number): Promise<void> {
    // Find label
    const label = await this.labelRepository.findOne({
      where: { id: labelId, user_id: userId },
    });

    if (!label) {
      throw new NotFoundException('Label não encontrada.');
    }

    // Soft delete
    await this.labelRepository.softRemove(label);

    // TODO: Add LogService integration
    // log.create("Excluiu a etiqueta #$label->id $label->name");
  }
}
