import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../database/entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

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
   * Only returns non-deleted plans (deleted_at IS NULL)
   */
  async findAll(search?: string, order: 'asc' | 'desc' = 'asc') {
    const query = this.planRepository.createQueryBuilder('plan');

    // Filter out soft-deleted plans
    query.where('plan.deleted_at IS NULL');

    // Search by name (LIKE)
    if (search) {
      query.andWhere('plan.name LIKE :search', { search: `%${search}%` });
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
   * Only returns non-deleted plans (deleted_at IS NULL)
   *
   * @throws NotFoundException if plan not found or deleted
   */
  async findOne(id: number) {
    const plan = await this.planRepository
      .createQueryBuilder('plan')
      .where('plan.id = :id', { id })
      .andWhere('plan.deleted_at IS NULL')
      .getOne();

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

  /**
   * Update an existing plan
   * Compatible with Laravel PlansController@update
   * Requires admin authentication
   *
   * @throws NotFoundException if plan not found
   */
  async update(id: number, updatePlanDto: UpdatePlanDto) {
    // Check if plan exists
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    // Filter out undefined values to support partial updates
    // Only update fields that were actually provided in the DTO
    const updateData: Record<string, any> = {};
    Object.keys(updatePlanDto).forEach((key) => {
      const value = updatePlanDto[key as keyof UpdatePlanDto];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Update plan with new values
    const now = new Date();
    Object.assign(plan, {
      ...updateData,
      updated_at: now,
    });

    const updatedPlan = await this.planRepository.save(plan);

    // Laravel response structure with data wrapper
    return {
      data: updatedPlan,
    };
  }

  /**
   * Delete (soft delete) an existing plan
   * Compatible with Laravel PlansController@destroy
   * Requires admin authentication
   *
   * @throws NotFoundException if plan not found
   */
  async delete(id: number) {
    // Check if plan exists
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    // Soft delete: set deleted_at timestamp
    const now = new Date();
    plan.deleted_at = now;

    await this.planRepository.save(plan);

    // Laravel returns 204 No Content for successful deletes
    return;
  }
}
