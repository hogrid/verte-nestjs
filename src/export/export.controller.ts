import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportService } from './export.service';
import { ExportContactsDto } from './dto/export-contacts.dto';
import { ExportCampaignReportDto } from './dto/export-campaign-report.dto';

/**
 * ExportController
 *
 * Gerencia exportação de dados em CSV/XLSX
 * Compatível com Laravel ExportController
 *
 * Total: 2 endpoints
 */
@ApiTags('Export')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * 1. GET /api/v1/export-contacts-csv
   * Exportar contatos para CSV
   */
  @Get('export-contacts-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary: 'Exportar contatos para CSV',
    description:
      'Exporta contatos do usuário em formato CSV com filtros opcionais. Arquivo com UTF-8 BOM para compatibilidade com Excel.',
  })
  @ApiQuery({
    name: 'contact_ids',
    required: false,
    description: 'IDs específicos de contatos (separados por vírgula)',
    example: '1,2,3',
  })
  @ApiQuery({
    name: 'label',
    required: false,
    description: 'Filtrar por etiqueta',
    example: 'clientes-vip',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por status',
    enum: ['active', 'blocked'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, email ou telefone',
    example: 'João',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo CSV gerado com sucesso',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'ID,Nome,Email,Telefone,Etiqueta,Status,Criado em\n1,"João Silva","joao@email.com","11999999999","cliente-vip","active","01/01/2024"',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async exportContacts(
    @Request() req: { user: { id: number } },
    @Query() dto: ExportContactsDto,
    @Res() res: Response,
  ) {
    // Processar contact_ids se vier como string separada por vírgula
    if (dto.contact_ids && typeof dto.contact_ids === 'string') {
      dto.contact_ids = (dto.contact_ids as unknown as string)
        .split(',')
        .map((id) => Number(id.trim()));
    }

    const csv = await this.exportService.exportContactsCsv(req.user.id, dto);

    const filename = `contatos_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  /**
   * 2. GET /api/v1/export-campaign-report
   * Exportar relatório de campanha
   */
  @Get('export-campaign-report')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary: 'Exportar relatório de campanha',
    description:
      'Exporta relatório detalhado de uma campanha em CSV incluindo métricas e mensagens enviadas.',
  })
  @ApiQuery({
    name: 'campaign_id',
    required: true,
    description: 'ID da campanha',
    example: 1,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Formato do arquivo',
    enum: ['csv', 'xlsx'],
    example: 'csv',
  })
  @ApiQuery({
    name: 'include_messages',
    required: false,
    description: 'Incluir mensagens no relatório',
    example: true,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório CSV gerado com sucesso',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'Relatório de Campanha\nID,1\nNome,Campanha Teste\nStatus,Ativa\nTotal de Contatos,100\n\nMensagens Enviadas\nID,Tipo,Conteúdo,Data de Envio\n1,"text","Olá!","01/01/2024 10:00"',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async exportCampaignReport(
    @Request() req: { user: { id: number } },
    @Query() dto: ExportCampaignReportDto,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportCampaignReport(req.user.id, dto);

    const filename = `relatorio_campanha_${dto.campaign_id}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
