import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublicsService } from './publics.service';
import { ListPublicsDto } from './dto/list-publics.dto';
import { UpdatePublicDto } from './dto/update-public.dto';
import { DuplicatePublicDto } from './dto/duplicate-public.dto';
import { GetRandomContactDto } from './dto/get-random-contact.dto';

@ApiTags('Públicos')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PublicsController {
  constructor(private readonly publicsService: PublicsService) {}

  @Get('publics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar públicos do usuário',
    description:
      'Lista todos os públicos (audiências) do usuário autenticado com agregações.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Agregações retornadas:**\n' +
      '- `contacts_count`: Total de contatos no público\n' +
      '- `blocked_count`: Total de contatos bloqueados\n' +
      '- `not_blocked_and_sent_count`: Total de mensagens enviadas (não bloqueados)\n' +
      '- `latest_not_blocked_and_sent_date`: Data do último envio\n\n' +
      '**Filtros disponíveis:**\n' +
      '- `numberId`: Filtrar por instância WhatsApp\n' +
      '- `search`: Buscar por nome do público\n' +
      '- `page`: Paginação (20 itens por página)',
  })
  @ApiResponse({
    status: 200,
    description: 'Públicos listados com sucesso',
    schema: {
      example: {
        data: [
          {
            publics_id: 1,
            publics_name: 'Clientes VIP',
            publics_photo: 'uploads/photo.jpg',
            publics_status: 1,
            publics_from_chat: 0,
            contacts_count: '150',
            blocked_count: '5',
            not_blocked_and_sent_count: '100',
            latest_not_blocked_and_sent_date: '2024-10-30 10:00:00',
          },
        ],
        meta: {
          current_page: 1,
          from: 1,
          to: 20,
          per_page: 20,
          total: 1,
          last_page: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req: any, @Query() dto: ListPublicsDto) {
    return this.publicsService.findAll(req.user.id, dto);
  }

  @Post('publics/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = file.originalname.split('.').pop();
          const filename = `${Date.now()}.${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'ID do público a ser atualizado',
    example: 1,
  })
  @ApiOperation({
    summary: 'Atualizar público',
    description:
      'Atualiza os dados de um público existente.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Se `status = 1`, todos os outros públicos do usuário ficam com `status = 0`\n' +
      '- Upload de foto é opcional (máximo 20MB)\n' +
      '- Foto é salva em `uploads/` com timestamp no nome\n\n' +
      '**Campos aceitos:**\n' +
      '- name, status, photo (file), from_chat, from_tag, number, labels',
  })
  @ApiResponse({
    status: 200,
    description: 'Público atualizado com sucesso',
    schema: {
      example: {
        data: {
          id: 1,
          user_id: 1,
          name: 'Clientes VIP',
          photo: 'uploads/1698765432.jpg',
          status: 1,
          from_chat: 0,
          from_tag: null,
          number: '5511999999999',
          labels: '["vip","cliente"]',
          created_at: '2024-10-01T10:00:00.000Z',
          updated_at: '2024-10-30T15:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação (arquivo muito grande)',
  })
  async update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublicDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const photoPath = file ? `uploads/${file.filename}` : undefined;
    const result = await this.publicsService.update(
      req.user.id,
      id,
      dto,
      photoPath,
    );

    return { data: result };
  }

  @Get('publics/download-contacts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'ID do público para download dos contatos',
    example: 1,
  })
  @ApiOperation({
    summary: 'Download de contatos em CSV',
    description:
      'Gera e baixa um arquivo CSV com todos os contatos do público.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Formato CSV:**\n' +
      '- Separador: ponto e vírgula (;)\n' +
      '- Encoding: UTF-8 com BOM\n' +
      '- Colunas: Celular, Nome, Variável 1, Variável 2, Variável 3\n\n' +
      '**Nome do arquivo:** `[NomeDoPublico] (YYYY-mm-dd HHiiss).csv`',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo CSV gerado com sucesso',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async downloadContacts(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const csv = await this.publicsService.downloadContacts(req.user.id, id);

    // Get public name for filename
    const public_ = await this.publicsService['publicRepository'].findOne({
      where: { id, user_id: req.user.id },
    });

    if (!public_) {
      throw new NotFoundException('Público não encontrado.');
    }

    const sanitizedName = public_.name.replace(/[^A-Za-z0-9-]/g, '');
    const timestamp = new Date()
      .toISOString()
      .replace(/[T:]/g, ' ')
      .split('.')[0];
    const filename = `${sanitizedName} (${timestamp}).csv`;

    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(csv);
  }

  @Post('publics-duplicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Duplicar público e seus contatos',
    description:
      'Cria uma cópia exata de um público e todos os seus contatos.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Nome do novo público: `[Nome Original] Cópia`\n' +
      '- Status do novo público: `0` (inativo)\n' +
      '- Todos os contatos do público original são duplicados\n' +
      '- Apenas o dono do público pode duplicá-lo (validação de `user_id`)',
  })
  @ApiResponse({
    status: 200,
    description: 'Público duplicado com sucesso',
    schema: {
      example: {
        data: {
          id: 2,
          user_id: 1,
          name: 'Clientes VIP Cópia',
          photo: 'uploads/photo.jpg',
          status: 0,
          from_chat: 0,
          from_tag: null,
          number_id: 1,
          number: '5511999999999',
          labels: '["vip"]',
          created_at: '2024-10-30T15:45:00.000Z',
          updated_at: '2024-10-30T15:45:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para duplicar' })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async duplicate(@Request() req: any, @Body() dto: DuplicatePublicDto) {
    const result = await this.publicsService.duplicate(req.user.id, dto);
    return { data: result };
  }

  @Delete('publics/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    description: 'ID do público a ser deletado',
    example: 1,
  })
  @ApiOperation({
    summary: 'Deletar público',
    description:
      'Remove um público (soft delete).\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Soft delete: registro marcado como deletado mas mantido no banco\n' +
      '- Apenas o dono do público pode deletá-lo',
  })
  @ApiResponse({ status: 204, description: 'Público deletado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.publicsService.remove(req.user.id, id);
    // No content response
  }

  @Get('publics/contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar contato aleatório do público',
    description:
      'Retorna um contato aleatório de um público específico.\n\n' +
      '**Requer autenticação**: Sim (JWT)\n\n' +
      '**Regras de negócio:**\n' +
      '- Contato deve ter nome (não nulo e não começando com +)\n' +
      '- Contato deve ter pelo menos uma variável preenchida\n' +
      '- Retorna `null` se nenhum contato atender os critérios',
  })
  @ApiResponse({
    status: 200,
    description: 'Contato aleatório retornado',
    schema: {
      example: {
        data: {
          id: 123,
          user_id: 1,
          public_id: 1,
          number_id: 1,
          name: 'João Silva',
          number: '5511999999999',
          cel_owner: null,
          description: null,
          variable_1: 'Valor 1',
          variable_2: 'Valor 2',
          variable_3: null,
          type: 1,
          status: 1,
          labels: null,
          labelsName: null,
          created_at: '2024-10-01T10:00:00.000Z',
          updated_at: '2024-10-01T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Público não encontrado' })
  async getRandomContact(
    @Request() req: any,
    @Query() dto: GetRandomContactDto,
  ) {
    const result = await this.publicsService.getRandomContact(req.user.id, dto);
    return { data: result };
  }
}
