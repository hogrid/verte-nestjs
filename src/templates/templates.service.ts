import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MessageTemplate } from '../database/entities/message-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ListTemplatesDto } from './dto/list-templates.dto';

/**
 * TemplatesService
 *
 * Service para gerenciamento de templates de mensagens reutilizáveis
 * Suporta variáveis dinâmicas e categorização
 */
@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly templateRepository: Repository<MessageTemplate>,
  ) {}

  /**
   * Listar templates com filtros e paginação
   */
  async findAll(userId: number, dto: ListTemplatesDto) {
    const page = dto.page || 1;
    const perPage = dto.per_page || 15;
    const skip = (page - 1) * perPage;

    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.user_id = :userId', { userId })
      .andWhere('template.deleted_at IS NULL');

    // Filtro de busca (nome ou conteúdo)
    if (dto.search) {
      query.andWhere(
        '(template.name LIKE :search OR template.content LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    // Filtro de categoria
    if (dto.category) {
      query.andWhere('template.category = :category', {
        category: dto.category,
      });
    }

    // Filtro de status
    if (dto.active !== undefined) {
      query.andWhere('template.active = :active', { active: dto.active });
    }

    // Ordenação por data de criação (mais recentes primeiro)
    query.orderBy('template.created_at', 'DESC');

    // Paginação
    const [data, total] = await query
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    // Processar variáveis JSON para array
    const templates = data.map((template) => ({
      ...template,
      variables: template.variables
        ? typeof template.variables === 'string'
          ? JSON.parse(template.variables)
          : (template.variables as unknown as string[])
        : [],
    }));

    return {
      data: templates,
      meta: {
        current_page: page,
        from: skip + 1,
        to: skip + templates.length,
        per_page: perPage,
        total,
        last_page: Math.ceil(total / perPage),
      },
    };
  }

  /**
   * Buscar template por ID
   */
  async findOne(userId: number, id: number) {
    const template = await this.templateRepository.findOne({
      where: {
        id,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }

    // Processar variáveis JSON para array
    return {
      ...template,
      variables: template.variables
        ? typeof template.variables === 'string'
          ? JSON.parse(template.variables)
          : (template.variables as unknown as string[])
        : [],
    };
  }

  /**
   * Criar novo template
   */
  async create(userId: number, dto: CreateTemplateDto) {
    // Extrair variáveis do conteúdo se não foram fornecidas
    const variables = dto.variables || this.extractVariables(dto.content);

    const template = this.templateRepository.create({
      user_id: userId,
      name: dto.name,
      content: dto.content,
      category: dto.category || null,
      variables: JSON.stringify(variables),
      active: dto.active !== undefined ? dto.active : 1,
    });

    const saved = await this.templateRepository.save(template);

    return {
      ...saved,
      variables: variables,
    };
  }

  /**
   * Atualizar template existente
   */
  async update(userId: number, id: number, dto: UpdateTemplateDto) {
    const template = await this.templateRepository.findOne({
      where: {
        id,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }

    // Atualizar campos fornecidos
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.content !== undefined) template.content = dto.content;
    if (dto.category !== undefined) template.category = dto.category;
    if (dto.active !== undefined) template.active = dto.active;

    // Atualizar variáveis (extrair do novo conteúdo se alterado)
    if (dto.variables !== undefined) {
      template.variables = JSON.stringify(dto.variables);
    } else if (dto.content !== undefined) {
      const extractedVars = this.extractVariables(dto.content);
      template.variables = JSON.stringify(extractedVars);
    }

    const updated = await this.templateRepository.save(template);

    return {
      ...updated,
      variables: updated.variables
        ? typeof updated.variables === 'string'
          ? JSON.parse(updated.variables)
          : (updated.variables as unknown as string[])
        : [],
    };
  }

  /**
   * Deletar template (soft delete)
   */
  async delete(userId: number, id: number) {
    const template = await this.templateRepository.findOne({
      where: {
        id,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }

    // Soft delete
    await this.templateRepository.softDelete(id);

    return {
      success: true,
      message: 'Template deletado com sucesso.',
    };
  }

  /**
   * Extrair variáveis do conteúdo do template
   * Busca por padrões como {{variavel}}
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!matches.includes(variable)) {
        matches.push(variable);
      }
    }

    return matches;
  }

  /**
   * Renderizar template com dados fornecidos
   * Substitui variáveis pelos valores do objeto data
   */
  renderTemplate(content: string, data: Record<string, string>): string {
    let rendered = content;

    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, data[key] || '');
    });

    return rendered;
  }
}
