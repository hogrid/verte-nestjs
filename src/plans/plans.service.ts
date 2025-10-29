import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../database/entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';

/**
 * Plans Service
 * Core business logic for plans management
 * Compatible with Laravel PlansController
 */
@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  /**
   * List all plans with optional search and ordering
   * Compatible with Laravel PlansController@index
   */
  async findAll(search?: string, order: 'asc' | 'desc' = 'asc') {
    const query = this.planRepository.createQueryBuilder('plan');

    // Search by name (LIKE)
    if (search) {
      query.where('plan.name LIKE :search', { search: `%${search}%` });
    }

    // Order by id
    query.orderBy('plan.id', order.toUpperCase() as 'ASC' | 'DESC');

    const data = await query.getMany();

    // Laravel response structure with meta
    return {
      meta: {
        current_page: 0,
        from: 0,
        to: 0,
        per_page: 0,
        total: 0,
        last_page: 0,
      },
      data,
    };
  }

  /**
   * Find a single plan by ID
   * Compatible with Laravel PlansController@show
   *
   * @throws NotFoundException if plan not found
   */
  async findOne(id: number) {
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    // Laravel response structure with data wrapper
    return {
      data: plan,
    };
  }

  /**
   * Create a new plan
   * Compatible with Laravel PlansController@store
   * Requires admin authentication
   */
  async create(createPlanDto: CreatePlanDto) {
    const now = new Date();

    const plan = this.planRepository.create({
      ...createPlanDto,
      popular: createPlanDto.popular ?? 0, // Default to 0 if not provided
      created_at: now,
      updated_at: now,
    });

    const savedPlan = await this.planRepository.save(plan);

    // Laravel response structure with data wrapper
    return {
      data: savedPlan,
    };
  }
}
