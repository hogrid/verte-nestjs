import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtractorService } from './extractor.service';

@ApiTags('Extractor & Logs')
@Controller('api/v1/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExtractorController {
  constructor(private readonly extractorService: ExtractorService) {}

  @Get('extractor')
  @ApiOperation({ summary: 'Configurações do extrator', description: 'Retorna configurações do extrator' })
  @ApiResponse({ status: 200, description: 'Configurações retornadas' })
  async getConfig(@Request() req: { user: { id: number } }) {
    return this.extractorService.getConfig(req.user.id);
  }

  @Post('extractor')
  @ApiOperation({ summary: 'Salvar configurações do extrator', description: 'Salva configurações do extrator' })
  @ApiResponse({ status: 200, description: 'Configurações salvas' })
  async saveConfig(@Request() req: { user: { id: number } }, @Body() config: any) {
    return this.extractorService.saveConfig(req.user.id, config);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Lista logs do sistema', description: 'Retorna logs do sistema do usuário' })
  @ApiResponse({ status: 200, description: 'Logs retornados' })
  async getLogs(@Request() req: { user: { id: number } }) {
    return this.extractorService.getLogs(req.user.id);
  }
}
