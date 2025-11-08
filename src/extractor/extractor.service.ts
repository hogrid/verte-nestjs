import { Injectable } from '@nestjs/common';

@Injectable()
export class ExtractorService {
  getConfig(userId: number) {
    return {
      user_id: userId,
      extractor_enabled: false,
      extractor_url: null,
      message: 'Configurações do extrator',
    };
  }

  saveConfig(userId: number, config: any) {
    return {
      success: true,
      message: 'Configurações do extrator salvas com sucesso.',
      config,
    };
  }

  getLogs(userId: number) {
    return {
      logs: [],
      total: 0,
      message: 'Nenhum log encontrado',
    };
  }
}
