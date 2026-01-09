import { Controller, Get, Request, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard principal',
    description: 'Retorna indicadores do dashboard do usuário',
  })
  @ApiResponse({ status: 200, description: 'Dashboard carregado' })
  async getDashboard(@Request() req: { user: { id: number } }) {
    const data = await this.dashboardService.getDashboard(req.user.id);
    return { data };
  }

  @Get('dashboard/recent-activity')
  @ApiOperation({
    summary: 'Atividade recente',
    description: 'Retorna atividades recentes do usuário',
  })
  @ApiResponse({ status: 200, description: 'Atividades carregadas' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de registros por categoria',
    example: 10,
  })
  async getRecentActivity(
    @Request() req: { user: { id: number } },
    @Query('limit') limit?: number,
  ) {
    const data = await this.dashboardService.getRecentActivity(req.user.id, limit);
    return { data };
  }

  @Get('dashboard-data')
  @ApiOperation({
    summary: 'Dados completos do dashboard',
    description: 'Retorna dados detalhados do dashboard',
  })
  @ApiResponse({ status: 200, description: 'Dados carregados' })
  async getDashboardData(@Request() req: { user: { id: number } }) {
    const data = await this.dashboardService.getDashboardData(req.user.id);
    return { data };
  }
}
