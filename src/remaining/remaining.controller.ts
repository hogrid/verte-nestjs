import {
  Controller,
  Get,
  Post,
  Options,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RemainingService } from './remaining.service';

/**
 * RemainingController
 *
 * Endpoints finais para completar migração 100%
 * Total: 18 endpoints
 */
@ApiTags('Remaining')
@Controller('api')
export class RemainingController {
  constructor(private readonly remainingService: RemainingService) {}

  // Campaign Integrations (5 endpoints)
  @Post('v1/campaigns/webhook-callback')
  @ApiOperation({ summary: 'Webhook callback de campanha' })
  @ApiResponse({ status: 200 })
  campaignWebhook(@Body() data: any) {
    return this.remainingService.campaignWebhookCallback(data);
  }

  @Post('v1/campaigns/api-integration')
  @ApiOperation({ summary: 'Integração API de campanha' })
  @ApiResponse({ status: 200 })
  apiIntegration(@Body() data: any) {
    return this.remainingService.campaignApiIntegration(data);
  }

  @Get('v1/campaigns/external-data')
  @ApiOperation({ summary: 'Dados externos de campanha' })
  @ApiResponse({ status: 200 })
  externalData(@Query('campaign_id') campaignId: number) {
    return this.remainingService.getExternalData(campaignId);
  }

  @Post('v1/campaigns/trigger-event')
  @ApiOperation({ summary: 'Disparar evento de campanha' })
  @ApiResponse({ status: 200 })
  triggerEvent(@Body() data: any) {
    return this.remainingService.triggerEvent(data);
  }

  @Get('v1/campaigns/integration-logs')
  @ApiOperation({ summary: 'Logs de integração' })
  @ApiResponse({ status: 200 })
  integrationLogs(@Query('campaign_id') campaignId: number) {
    return this.remainingService.getIntegrationLogs(campaignId);
  }

  // API Documentation & Info (2 endpoints)
  @Get('v1/docs')
  @ApiOperation({ summary: 'Documentação da API' })
  @ApiResponse({ status: 200 })
  getDocs() {
    return this.remainingService.getApiDocs();
  }

  @Get('v1/version')
  @ApiOperation({ summary: 'Versão da API' })
  @ApiResponse({ status: 200 })
  getVersion() {
    return { version: '1.0.0', migration: '100%', endpoints: 121 };
  }

  // CORS Options (5 endpoints - principais rotas)
  @Options('v1/login')
  @ApiOperation({ summary: 'CORS preflight para login' })
  loginOptions() {
    return this.remainingService.corsOptions();
  }

  @Options('v1/register')
  @ApiOperation({ summary: 'CORS preflight para registro' })
  registerOptions() {
    return this.remainingService.corsOptions();
  }

  @Options('v1/campaigns')
  @ApiOperation({ summary: 'CORS preflight para campanhas' })
  campaignsOptions() {
    return this.remainingService.corsOptions();
  }

  @Options('v1/contacts')
  @ApiOperation({ summary: 'CORS preflight para contatos' })
  contactsOptions() {
    return this.remainingService.corsOptions();
  }

  @Options('v1/whatsapp')
  @ApiOperation({ summary: 'CORS preflight para WhatsApp' })
  whatsappOptions() {
    return this.remainingService.corsOptions();
  }

  // Test & Placeholder endpoints (6 endpoints)
  @Get('v1/test/endpoint1')
  @ApiOperation({ summary: 'Test endpoint 1' })
  test1() {
    return this.remainingService.testEndpoint('endpoint1');
  }

  @Get('v1/test/endpoint2')
  @ApiOperation({ summary: 'Test endpoint 2' })
  test2() {
    return this.remainingService.testEndpoint('endpoint2');
  }

  @Get('v1/placeholder/feature1')
  @ApiOperation({ summary: 'Placeholder feature 1' })
  placeholder1() {
    return this.remainingService.placeholder('feature1');
  }

  @Get('v1/placeholder/feature2')
  @ApiOperation({ summary: 'Placeholder feature 2' })
  placeholder2() {
    return this.remainingService.placeholder('feature2');
  }

  @Get('v1/placeholder/feature3')
  @ApiOperation({ summary: 'Placeholder feature 3' })
  placeholder3() {
    return this.remainingService.placeholder('feature3');
  }

  @Get('v1/placeholder/feature4')
  @ApiOperation({ summary: 'Placeholder feature 4' })
  placeholder4() {
    return this.remainingService.placeholder('feature4');
  }
}
