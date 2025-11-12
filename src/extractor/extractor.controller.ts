import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtractorService } from './extractor.service';
import { UpdateExtractorConfigDto } from './dto/update-extractor-config.dto';
import { GetLogsQueryDto } from './dto/get-logs-query.dto';

@ApiTags('Extractor & Logs')
@Controller('api/v1/extractor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExtractorController {
  constructor(private readonly extractorService: ExtractorService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Configurações do extrator',
    description: 'Retorna configurações do extrator',
  })
  @ApiResponse({ status: 200, description: 'Configurações retornadas' })
  async getConfig(@Request() req: { user: { id: number } }) {
    return this.extractorService.getConfig(req.user.id);
  }

  @Put('config')
  @ApiOperation({
    summary: 'Atualizar configurações do extrator',
    description: 'Atualiza configurações do extrator',
  })
  @ApiResponse({ status: 200, description: 'Configurações atualizadas' })
  async updateConfig(
    @Request() req: { user: { id: number } },
    @Body() config: UpdateExtractorConfigDto,
  ) {
    return this.extractorService.updateConfig(req.user.id, config);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'Lista logs do extrator',
    description: 'Retorna logs do extrator do usuário',
  })
  @ApiResponse({ status: 200, description: 'Logs retornados' })
  async getLogs(
    @Request() req: { user: { id: number } },
    @Query() query: GetLogsQueryDto,
  ) {
    return this.extractorService.getLogs(req.user.id, query);
  }
}
